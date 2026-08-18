"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FormError } from "@/components/ui/form-error";
import { CompletionCelebration } from "@/components/ui/completion-celebration";
import { RichText } from "@/components/ui/rich-text";
import { Reveal } from "@/components/ui/reveal";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { ValueChip } from "@/components/recipes/value-chip";

import { ok, type ActionResult } from "@/lib/actions/action-result";
import type { SavedEntryId } from "@/lib/recipes/saved-entry";
import { getValueLabel } from "@/lib/utils/values-bank";
import { getValueEmoji } from "@/lib/utils/values-emojis";
import { getValueDescription } from "@/lib/utils/values-descriptions";
import { useScrollTopOnChange } from "@/lib/hooks/use-scroll-top-on-change";
import { formatDateDE } from "@/lib/utils/date";

import { CompassRose, type CompassValue } from "@/app/(app)/me/values/compass-rose";
import {
  saveEvalReflectionAction,
  saveAdjustedHypothesisAction,
  startNewCycleAction,
  type EvaluationPageData,
} from "@/lib/recipes/values/actions";

import { ErkenntnisseStage } from "./erkenntnisse-stage";

// ─── Props ──────────────────────────────────────────────────────────

interface EvaluationFormProps {
  initialData: EvaluationPageData;
}

/** „Noch nicht abgeschickt" — die Nutzlast unterscheidet das vom Erfolg. */
const INITIAL_STATE: ActionResult<boolean> = ok(false);

/** Dasselbe für den Rückblick, dessen Nutzlast der Beleg des Eintrags ist. */
const INITIAL_REFLECTION: ActionResult<SavedEntryId | null> = ok(null);

/**
 * Vier Bühnen statt drei Phasen:
 *   rueckblick   — die Woche nachlesen, optional ergänzen
 *   erkenntnisse — KI-Einschätzung + Tausch-Entscheidung
 *   feier        — TRANSIENT, nur direkt nach dem Speichern
 *   rueckblick-erkenntnisse — Wiederbesuch, nur lesen
 *
 * Die Feier erscheint ausschließlich aus einem erfolgreichen `adjustState` in
 * derselben Session. Wer später über den Stern zurückkommt, landet auf dem
 * Erkenntnis-Rückblick — vorher rendete `complete` die Feier, und genau
 * deshalb ging die KI-Einschätzung verloren.
 */
type Stage =
  | "rueckblick"
  | "erkenntnisse"
  | "feier"
  | "rueckblick-erkenntnisse";

const STAGE_SUBTITLE: Record<Stage, string> = {
  rueckblick: "Zeit zurückzublicken",
  erkenntnisse: "Deine Werte verfeinern",
  feier: "Zyklus abgeschlossen!",
  "rueckblick-erkenntnisse": "Deine Erkenntnisse",
};

// ─── Component ──────────────────────────────────────────────────────

export function EvaluationForm({ initialData }: EvaluationFormProps) {
  const { hypothesis, entries, valueEvalEntry, phase } =
    initialData;

  // Die beiden Server-Action-States stehen hier oben, weil die Bühne aus ihnen
  // ABGELEITET wird statt in einem Effect nachgezogen zu werden: die Leiter
  // rückt ausschließlich durch einen erfolgreichen Speichervorgang weiter, und
  // die verlassenen Bühnen werden nicht mehr gerendert. Als abgeleiteter Wert
  // kann die Bühne weder einen Frame hinterherhinken noch einen Zwischenstand
  // zeigen.
  const [reflectionState, reflectionAction, reflectionPending] = useActionState(
    saveEvalReflectionAction,
    INITIAL_REFLECTION,
  );
  const [adjustState, adjustAction, adjustPending] = useActionState(
    saveAdjustedHypothesisAction,
    INITIAL_STATE,
  );

  // `error === null` allein reicht hier nicht: das wäre schon der
  // Anfangszustand. Erst die Nutzlast sagt „ist wirklich gelaufen".
  // Der Beleg des Rückblick-Eintrags: frisch aus dem Speichern, sonst der aus
  // einem früheren Besuch. Er ist zugleich die Bedingung für Bühne B — die
  // KI-Auswertung schreibt auf genau diese Zeile.
  const savedReflection =
    reflectionState.error === null ? reflectionState.data : null;
  const evalEntryId = savedReflection ?? valueEvalEntry?.id ?? null;

  const stage: Stage = adjustState.error === null && adjustState.data
    ? "feier"
    : savedReflection !== null
      ? "erkenntnisse"
      : phase === "complete"
        ? "rueckblick-erkenntnisse"
        : phase === "adjust"
          ? "erkenntnisse"
          : "rueckblick";

  useScrollTopOnChange(stage);

  // Was zuletzt gespeichert wurde — die Feier-Bühne zeigt genau diese fünf.
  // Vorbelegt mit der Hypothese, damit ein Direkteinstieg nichts Leeres zeigt.
  const [submittedValues, setSubmittedValues] = useState<string[]>(hypothesis);

  const submitValues = (values: string[]) => {
    setSubmittedValues(values);
    const fd = new FormData();
    fd.set("values", JSON.stringify(values));
    adjustAction(fd);
  };

  // Der Einstieg in den nächsten Durchlauf. `startNewCycleAction` gab es schon,
  // aber keine UI rief es auf — ein zweiter Durchlauf war schlicht nicht
  // erreichbar (KAN-20). Kein <form action>: die Action nimmt keine FormData.
  const [cycleError, setCycleError] = useState<string | null>(null);
  const [startingCycle, startCycle] = useTransition();

  function beginNewCycle() {
    setCycleError(null);
    startCycle(async () => {
      // Bei Erfolg leitet die Action um und kehrt nie zurück.
      const result = await startNewCycleAction();
      if (result.error !== null) setCycleError(result.error);
    });
  }

  const existingPositive = valueEvalEntry?.content?.positive_reflection ?? "";
  const existingNegative = valueEvalEntry?.content?.negative_reflection ?? "";

  const compassValues: CompassValue[] = submittedValues.map((id) => ({
    id,
    label: getValueLabel(id),
    emoji: getValueEmoji(id),
    description: getValueDescription(id),
  }));

  return (
    <>
      <SubPageHeader
        backHref="/me/values/journey"
        title="Auswertung"
        subtitle={STAGE_SUBTITLE[stage]}
      />
      <div data-e2e="evaluation" className="flex flex-1 flex-col px-4 py-6">
        <FormError
          message={reflectionState.error || adjustState.error || cycleError}
          className="mb-6"
        />

        {/* ── ── ── BÜHNE A: Rückblick ── ── ── */}
        {stage === "rueckblick" && (
          <div data-e2e="evaluation-rueckblick">
            {/* 7-Tage-Rückblick, eingeklappt pro Tag */}
            <div className="mb-6 space-y-2">
              <h3 className="font-heading text-base font-semibold">
                Deine Woche im Rückblick
              </h3>
              {entries.map((entry, i) => (
                <details
                  key={entry.id}
                  className="group rounded-lg border border-border bg-card transition-colors open:border-primary/30"
                >
                  <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium text-foreground">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span>{formatDateDE(entry.entry_date)}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {entry.content.happenings.slice(0, 40)}
                      {entry.content.happenings.length > 40 ? "…" : ""}
                    </span>
                  </summary>
                  <div className="space-y-3 border-t border-border px-3 py-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Was ist passiert?
                      </p>
                      <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                        {entry.content.happenings}
                      </p>
                    </div>
                    {entry.content.response && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                          Gedanken & Gefühle
                        </p>
                        <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                          {entry.content.response}
                        </p>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>

            <Separator className="mb-6" />

            <p className="mb-6 max-w-prose text-base leading-relaxed text-muted-foreground">
              <strong className="font-semibold text-foreground">
                Bevor wir gemeinsam auf deine Woche schauen:
              </strong>{" "}
              Gibt es noch etwas, das du ergänzen möchtest? Beide Felder sind
              freiwillig — du kannst auch direkt weitergehen.
            </p>

            <form action={reflectionAction} className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="positive_reflection"
                  className="text-base leading-relaxed font-medium"
                >
                  Welche Momente haben dich diese Woche positiv gestimmt — und
                  warum? Was war dir in diesen Momenten wichtig?{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="positive_reflection"
                  name="positive_reflection"
                  placeholder="Zum Beispiel: „Als ich mit Kollegin X Mittag gegessen habe – weil wir echt reden konnten. Mir war Verbindung wichtig.“"
                  defaultValue={existingPositive}
                  rows={4}
                  disabled={reflectionPending}
                  className="min-h-[100px] resize-y"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="negative_reflection"
                  className="text-base leading-relaxed font-medium"
                >
                  Welche Momente haben dich gestresst oder genervt — und warum?
                  Was wurde dabei verletzt oder vernachlässigt?{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="negative_reflection"
                  name="negative_reflection"
                  placeholder="Zum Beispiel: „Als das Meeting wieder ausuferte – weil meine Zeit nicht respektiert wurde. Mir wurde Autonomie verletzt.“"
                  defaultValue={existingNegative}
                  rows={4}
                  disabled={reflectionPending}
                  className="min-h-[100px] resize-y"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={reflectionPending}
              >
                {reflectionPending
                  ? "Wird gespeichert …"
                  : "Weiter zur Auswertung"}
              </Button>
            </form>
          </div>
        )}

        {/* ── ── ── BÜHNE B: Erkenntnisse ── ── ── */}
        {stage === "erkenntnisse" && (
          <ErkenntnisseStage
            entryId={evalEntryId}
            hypothesis={hypothesis}
            seedInsights={valueEvalEntry?.aiInsights ?? null}
            seedConfirmed={valueEvalEntry?.content?.ai_confirmed ?? []}
            seedSuggested={valueEvalEntry?.content?.ai_suggested ?? []}
            pending={adjustPending}
            onSubmit={submitValues}
          />
        )}

        {/* ── ── ── BÜHNE C: Kompass kalibriert (transient) ── ── ── */}
        {stage === "feier" && (
          <div data-e2e="evaluation-feier" className="space-y-6">
            <Card variant="glass">
              <CardContent className="space-y-4">
                <CompletionCelebration className="mt-1" />
                <p className="text-center font-heading text-lg font-semibold text-primary">
                  Erster Zyklus geschafft!
                </p>
                <p className="text-center text-base leading-relaxed text-muted-foreground">
                  Du hast eine ganze Woche reflektiert, deine Werte hinterfragt
                  und ein klareres Bild von dem bekommen, was dir wirklich
                  wichtig ist. Das ist ein großer Schritt.
                </p>
              </CardContent>
            </Card>

            {/* Die Rose ist hier ein Bild, kein Bedienelement. */}
            <Reveal delay={0.2}>
              <CompassRose values={compassValues} />
            </Reveal>

            {/* CTA direkt unter dem Inhalt — kein mt-auto, sonst steht er beim
                Ankommen unter der Falz. */}
            <Button className="w-full" size="lg" render={<Link href="/me/values" />}>
              Zu meinem Kompass
            </Button>
          </div>
        )}

        {/* ── ── ── BÜHNE B′: Erkenntnis-Rückblick ── ── ── */}
        {stage === "rueckblick-erkenntnisse" && (
          <div data-e2e="evaluation-erkenntnis-rueckblick" className="space-y-6">
            <Card variant="glass">
              <CardContent className="space-y-3">
                <h3 className="font-heading text-base font-semibold text-primary">
                  Was dir wichtig ist
                </h3>
                {valueEvalEntry?.aiInsights ? (
                  <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                    <RichText
                      text={valueEvalEntry.aiInsights}
                      strongClassName="font-semibold italic text-foreground"
                    />
                  </p>
                ) : (
                  <p className="text-base leading-relaxed text-muted-foreground">
                    Für diesen Zyklus liegt keine Einschätzung vor. Deine fünf
                    Werte stehen trotzdem — sie tragen auch ohne unsere Worte.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-2">
              <h3 className="font-heading text-base font-semibold">
                Deine fünf Werte
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {hypothesis.map((v) => (
                  <ValueChip key={v} valueId={v} />
                ))}
              </div>
            </div>

            <Button className="w-full" size="lg" render={<Link href="/me/values" />}>
              Zu meinem Kompass
            </Button>

            <div className="space-y-2 pt-2">
              <p className="text-center text-sm leading-relaxed text-muted-foreground">
                Werte verschieben sich. Wenn du magst, schau in sieben neuen
                Tagen nach, ob deine fünf noch stimmen.
              </p>
              <Button
                className="w-full"
                size="lg"
                variant="outline"
                onClick={beginNewCycle}
                disabled={startingCycle}
              >
                {startingCycle
                  ? "Wird gestartet …"
                  : "Neuen Durchlauf starten"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
