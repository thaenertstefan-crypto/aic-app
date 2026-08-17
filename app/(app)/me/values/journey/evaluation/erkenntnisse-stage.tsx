"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RichText } from "@/components/ui/rich-text";
import { ValueChip } from "@/components/recipes/value-chip";
import { AI_STEPS, runAiStep } from "@/lib/recipes/ai-step";
import type { SavedEntryId } from "@/lib/recipes/saved-entry";
import { VALUES_BANK, getValueLabel } from "@/lib/utils/values-bank";
import { cn } from "@/lib/utils";

export type Suggestion = { id: string; reason: string };

/** Ein vollzogener Tausch: `out` verlässt den Kompass, `in` nimmt seinen Platz. */
type Trade = { out: string; in: string };

/** Die Ersatz-Zeile steht beim Schritt, nicht hier — sie ist dieselbe, die
 *  runAiStep bei einem Ausfall zurückgibt. */
const FALLBACK_INSIGHTS = AI_STEPS.valuesEvaluation.fallbackMessage;

/** Liest eine Modell-Liste Glied für Glied; was `read` verwirft, fällt raus. */
function readList<T>(raw: unknown, read: (item: unknown) => T | null): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const value = read(item);
    return value === null ? [] : [value];
  });
}

/** Ein Vorschlag braucht beides — ohne Begründung ist der Chip nicht erklärbar. */
function readSuggestion(item: unknown): Suggestion | null {
  if (!item || typeof item !== "object") return null;
  const { id, reason } = item as { id?: unknown; reason?: unknown };
  return typeof id === "string" && typeof reason === "string"
    ? { id, reason }
    : null;
}

/** Der Tausch-Block: erscheint inline unter dem Vorschlag bzw. in der
 *  Werte-Bank, sobald ein neuer Wert hinein soll. Ohne Tausch kein Hinzufügen —
 *  die Anzahl bleibt hart bei fünf. */
function SwapPanel({
  swappable,
  outgoing,
  onPick,
  onConfirm,
  onCancel,
}: {
  swappable: string[];
  outgoing: string | null;
  onPick: (valueId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-3 space-y-3 rounded-lg bg-muted/30 p-3">
      <p className="text-sm text-muted-foreground">
        Welcher deiner fünf Werte soll dafür weichen?
      </p>
      <div className="space-y-1.5">
        {swappable.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={outgoing === v}
            onClick={() => onPick(v)}
            className={cn(
              "flex h-9 w-full items-center rounded-lg px-3 text-sm transition-colors",
              outgoing === v
                ? "bg-primary/15 font-medium text-primary"
                : "bg-card text-foreground hover:bg-muted",
            )}
          >
            {getValueLabel(v)}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="flex-1"
          disabled={!outgoing}
          onClick={onConfirm}
        >
          Tausch bestätigen
        </Button>
        <Button type="button" size="lg" variant="ghost" onClick={onCancel}>
          Abbrechen
        </Button>
      </div>
    </div>
  );
}

/**
 * Bühne B der Auswertung: die KI-Einschätzung, was sie bestätigt gefunden hat,
 * was neu aufgetaucht ist — und die eine Mechanik, mit der sich daraus etwas
 * ändern lässt: Tausch. Fünf Werte bleiben fünf Werte.
 */
export function ErkenntnisseStage({
  entryId,
  hypothesis,
  seedInsights,
  seedConfirmed,
  seedSuggested,
  pending,
  onSubmit,
}: {
  /**
   * Der value_eval-Eintrag, auf den die Auswertung geschrieben wird — frisch
   * gespeichert oder aus einem früheren Besuch. Ohne ihn gibt es keinen Ort
   * für das Ergebnis, also auch keinen KI-Call.
   */
  entryId: SavedEntryId | null;
  hypothesis: string[];
  seedInsights: string | null;
  seedConfirmed: string[];
  seedSuggested: Suggestion[];
  pending: boolean;
  onSubmit: (values: string[]) => void;
}) {
  // Ohne gespeicherten Eintrag gibt es nichts zu fragen — die Route hätte
  // keinen Ort für ihr Ergebnis. Dann steht die Ersatz-Zeile von Anfang an da,
  // statt dass die Karte erst lädt und dann aufgibt.
  const [insights, setInsights] = useState<string | null>(
    seedInsights ?? (entryId === null ? FALLBACK_INSIGHTS : null),
  );
  const [confirmed, setConfirmed] = useState<string[]>(seedConfirmed);
  const [suggested, setSuggested] = useState<Suggestion[]>(seedSuggested);
  // Seed aus einem früheren Besuch → kein zweiter KI-Call.
  const requested = useRef(seedInsights !== null || entryId === null);

  const [trades, setTrades] = useState<Trade[]>([]);
  const [incoming, setIncoming] = useState<{
    id: string;
    source: "suggestion" | "bank";
  } | null>(null);
  const [outgoing, setOutgoing] = useState<string | null>(null);

  // Diese Bühne wird nur gemountet, wenn sie sichtbar ist — der Call gehört
  // deshalb an den Mount und braucht keine Phasen-Abfrage.
  useEffect(() => {
    // Ohne Eintrag steht `requested` schon auf true; die zweite Prüfung ist
    // für den Typ da, nicht für den Ablauf.
    if (requested.current || entryId === null) return;
    requested.current = true;

    let cancelled = false;
    void runAiStep(AI_STEPS.valuesEvaluation, { entryId }, (payload) => ({
      insights: typeof payload.insights === "string" ? payload.insights : null,
      // Array.isArray sagt nichts über die Glieder — beide Listen werden als
      // Werte-IDs weiterbenutzt, ein Nicht-String liefe dort still ins Leere.
      confirmed: readList(payload.confirmed, (v) =>
        typeof v === "string" ? v : null,
      ),
      suggested: readList(payload.suggested, readSuggestion),
    })).then((step) => {
      if (cancelled) return;
      // Bei einem Rate-Limit steht die Server-Meldung in der Karte statt der
      // generischen Ersatz-Zeile — genau dafür reicht runAiStep sie durch.
      if (step.error !== null) {
        setInsights(step.error);
        return;
      }
      setInsights(step.data.insights ?? FALLBACK_INSIGHTS);
      setConfirmed(step.data.confirmed);
      setSuggested(step.data.suggested);
    });

    return () => {
      cancelled = true;
    };
  }, [entryId]);

  // Der Live-Stand: die ursprünglichen fünf, durch die Tausche gemappt. Immer
  // genau fünf, Reihenfolge stabil.
  const liveValues = useMemo(
    () => hypothesis.map((v) => trades.find((t) => t.out === v)?.in ?? v),
    [hypothesis, trades],
  );
  // Absicherung gegen die Tausch-Kette (A raus, B rein für A, A per
  // "Rückgängig" zurück) — statt nur der Länge wird auf fünf UNTERSCHIEDLICHE
  // Werte geprüft, sonst kann ein Duplikat den CTA scharf schalten.
  const hasDuplicate =
    liveValues.length !== 5 || new Set(liveValues).size !== 5;

  // Ein bereits weggetauschter Wert steht in keiner weiteren Auswahl.
  const swappable = hypothesis.filter((v) => !trades.some((t) => t.out === v));
  const openSuggestions = suggested.filter((s) => !liveValues.includes(s.id));
  // Ein Wert, der inzwischen weggetauscht wurde, gilt nicht mehr als bestätigt.
  const confirmedShown = confirmed.filter((v) => liveValues.includes(v));
  // Ein Originalwert kommt nur über "Rückgängig" zurück, nicht über die Bank —
  // sonst lässt er sich doppelt hineintauschen (er steht ja nicht mehr in
  // liveValues, sobald er einmal weggetauscht wurde).
  const bankChips = VALUES_BANK.filter(
    (v) =>
      !liveValues.includes(v.id) &&
      !hypothesis.includes(v.id) &&
      !suggested.some((s) => s.id === v.id),
  );

  const startSwap = (id: string, source: "suggestion" | "bank") => {
    setIncoming({ id, source });
    setOutgoing(null);
  };
  const cancelSwap = () => {
    setIncoming(null);
    setOutgoing(null);
  };
  const confirmSwap = () => {
    if (!incoming || !outgoing) return;
    setTrades((prev) => [...prev, { out: outgoing, in: incoming.id }]);
    cancelSwap();
  };
  const undoTrade = (out: string) =>
    setTrades((prev) => prev.filter((t) => t.out !== out));

  return (
    <div data-e2e="evaluation-erkenntnisse" className="space-y-8">
      {/* 1 · Die KI-Einschätzung. Bewusst OHNE Reveal-Wrapper: eine Opacity-
          Ebene über einer Glaskarte erzeugt auf iOS Ghosting. Der Wechsel
          Skeleton → Text passiert innerhalb der Karte. */}
      <Card variant="glass">
        <CardContent className="space-y-3">
          <h3 className="font-heading text-base font-semibold text-primary">
            Was dir wichtig ist
          </h3>
          <div aria-live="polite" aria-busy={insights === null}>
            {insights === null ? (
              <div className="space-y-2" aria-hidden="true">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[92%]" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                <RichText
                  text={insights}
                  strongClassName="font-semibold italic text-foreground"
                />
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2 · Bestätigt */}
      {confirmedShown.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-heading text-base font-semibold">
            Das hat sich bestätigt
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {confirmedShown.map((v) => (
              <ValueChip key={v} valueId={v} />
            ))}
          </div>
        </div>
      )}

      {/* 3 · Neu aufgetaucht — max. 3 Vorschläge, je mit Tausch-Block */}
      <div className="space-y-3">
        <h3 className="font-heading text-base font-semibold">Neu aufgetaucht</h3>
        {openSuggestions.length === 0 ? (
          <p className="text-base leading-relaxed text-muted-foreground">
            Deine fünf Werte tragen — diese Woche ist nichts Neues dazugekommen.
          </p>
        ) : (
          openSuggestions.map((s) => (
            <Card key={s.id} size="sm">
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-foreground">
                    {getValueLabel(s.id)}
                  </span>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="shrink-0"
                    aria-expanded={incoming?.id === s.id}
                    onClick={() =>
                      incoming?.id === s.id
                        ? cancelSwap()
                        : startSwap(s.id, "suggestion")
                    }
                  >
                    Hinzufügen
                  </Button>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {s.reason}
                </p>
                {incoming?.id === s.id && incoming.source === "suggestion" && (
                  <SwapPanel
                    swappable={swappable}
                    outgoing={outgoing}
                    onPick={setOutgoing}
                    onConfirm={confirmSwap}
                    onCancel={cancelSwap}
                  />
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 5 · Opt-in Werte-Bank — für alles, was die KI nicht gesehen hat */}
      <details className="group rounded-lg border border-border bg-card transition-colors open:border-primary/30">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground">
          <span className="font-heading">Eigenen Wert wählen</span>
          <span
            aria-hidden="true"
            className="ml-auto text-xs text-muted-foreground transition-transform group-open:rotate-45 motion-reduce:transition-none"
          >
            +
          </span>
        </summary>

        <div className="space-y-3 border-t border-border px-3 py-3">
          <p className="text-sm text-muted-foreground">
            Dir fällt ein Wert ein, der in deiner Woche steckte? Wähl ihn hier —
            auch dafür weicht einer deiner fünf.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {bankChips.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={incoming?.id === v.id}
                onClick={() =>
                  incoming?.id === v.id ? cancelSwap() : startSwap(v.id, "bank")
                }
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3 text-xs transition-all active:scale-95 motion-reduce:active:scale-100",
                  incoming?.id === v.id
                    ? "border-primary bg-primary/15 font-medium text-primary"
                    : "border-border bg-card text-foreground hover:border-primary hover:bg-primary/15",
                )}
              >
                {v.de}
              </button>
            ))}
          </div>
          {incoming?.source === "bank" && (
            <SwapPanel
              swappable={swappable}
              outgoing={outgoing}
              onPick={setOutgoing}
              onConfirm={confirmSwap}
              onCancel={cancelSwap}
            />
          )}
        </div>
      </details>

      {/* 6 · Live-Stand — immer sichtbar, plus die vollzogenen Tausche */}
      <div className="space-y-2">
        <h3 className="font-heading text-base font-semibold">
          Deine fünf Werte
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {liveValues.map((v) => (
            <ValueChip key={v} valueId={v} />
          ))}
        </div>
        {trades.length > 0 && (
          <ul className="space-y-1 pt-1">
            {trades.map((t) => (
              <li
                key={t.out}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span className="italic">{getValueLabel(t.out)}</span>
                <span aria-hidden="true">→</span>
                <span className="font-medium text-foreground">
                  {getValueLabel(t.in)}
                </span>
                <Button
                  type="button"
                  size="lg"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => undoTrade(t.out)}
                >
                  Rückgängig
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 7 · Der einzige Gold-CTA dieses Screens */}
      {hasDuplicate && (
        <p className="text-sm text-muted-foreground">
          Zwei deiner fünf Werte sind gerade gleich — tausch einen davon
          zurück, bevor du speicherst.
        </p>
      )}
      <Button
        className="w-full"
        size="lg"
        disabled={pending || hasDuplicate}
        onClick={() => onSubmit(liveValues)}
      >
        {pending ? "Wird gespeichert …" : "Werte speichern"}
      </Button>
    </div>
  );
}
