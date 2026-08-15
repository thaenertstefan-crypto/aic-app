"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RichText } from "@/components/ui/rich-text";
import { ValueChip } from "@/components/recipes/value-chip";
import { VALUES_BANK, getValueLabel } from "@/lib/utils/values-bank";
import { cn } from "@/lib/utils";

export type Suggestion = { id: string; reason: string };

/** Ein vollzogener Tausch: `out` verlässt den Kompass, `in` nimmt seinen Platz. */
type Trade = { out: string; in: string };

const FALLBACK_INSIGHTS =
  "Wir konnten diesmal leider keine Beobachtungen für dich erstellen. Schau einfach selbst noch einmal auf deine Woche zurück.";

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
  hypothesis,
  seedInsights,
  seedConfirmed,
  seedSuggested,
  pending,
  onSubmit,
}: {
  hypothesis: string[];
  seedInsights: string | null;
  seedConfirmed: string[];
  seedSuggested: Suggestion[];
  pending: boolean;
  onSubmit: (values: string[]) => void;
}) {
  const [insights, setInsights] = useState<string | null>(seedInsights);
  const [confirmed, setConfirmed] = useState<string[]>(seedConfirmed);
  const [suggested, setSuggested] = useState<Suggestion[]>(seedSuggested);
  // Seed aus einem früheren Besuch → kein zweiter KI-Call.
  const requested = useRef(seedInsights !== null);

  const [trades, setTrades] = useState<Trade[]>([]);
  const [incoming, setIncoming] = useState<{
    id: string;
    source: "suggestion" | "bank";
  } | null>(null);
  const [outgoing, setOutgoing] = useState<string | null>(null);

  // Diese Bühne wird nur gemountet, wenn sie sichtbar ist — der Call gehört
  // deshalb an den Mount und braucht keine Phasen-Abfrage.
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    let cancelled = false;
    fetch("/api/journal-analysis", { method: "POST" })
      .then(async (res) => {
        const data = (await res.json()) as {
          insights?: string;
          confirmed?: string[];
          suggested?: Suggestion[];
          error?: string;
        };
        if (cancelled) return;
        // Bei einem Rate-Limit steht die Server-Meldung in der Karte statt des
        // generischen Fallbacks.
        if (!res.ok) {
          setInsights(data.error ?? FALLBACK_INSIGHTS);
          return;
        }
        setInsights(data.insights ?? FALLBACK_INSIGHTS);
        setConfirmed(data.confirmed ?? []);
        setSuggested(data.suggested ?? []);
      })
      .catch(() => {
        if (!cancelled) setInsights(FALLBACK_INSIGHTS);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Der Live-Stand: die ursprünglichen fünf, durch die Tausche gemappt. Immer
  // genau fünf, Reihenfolge stabil.
  const liveValues = useMemo(
    () => hypothesis.map((v) => trades.find((t) => t.out === v)?.in ?? v),
    [hypothesis, trades],
  );

  // Ein bereits weggetauschter Wert steht in keiner weiteren Auswahl.
  const swappable = hypothesis.filter((v) => !trades.some((t) => t.out === v));
  const openSuggestions = suggested.filter((s) => !liveValues.includes(s.id));
  // Ein Wert, der inzwischen weggetauscht wurde, gilt nicht mehr als bestätigt.
  const confirmedShown = confirmed.filter((v) => liveValues.includes(v));
  const bankChips = VALUES_BANK.filter(
    (v) => !liveValues.includes(v.id) && !suggested.some((s) => s.id === v.id),
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
          <span className="ml-auto text-xs text-muted-foreground transition-transform group-open:rotate-45 motion-reduce:transition-none">
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
      <Button
        className="w-full"
        size="lg"
        disabled={pending || liveValues.length !== 5}
        onClick={() => onSubmit(liveValues)}
      >
        {pending ? "Wird gespeichert …" : "Werte speichern"}
      </Button>
    </div>
  );
}
