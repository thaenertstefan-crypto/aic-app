"use client";

import { useReducer, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Plus,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { Funkenflug, useFunkenflug } from "@/components/ui/funkenflug";
import { Reveal } from "@/components/ui/reveal";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { DraftRestoreBanner } from "@/components/offline/draft-restore-banner";
import { useRecipeIntro } from "@/components/recipes/recipe-intro-gate";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { Mascot } from "@/components/brand/mascot";
import { StarGlyph } from "@/components/brand/star-glyph";
import { JourneyStage } from "./journey-stage";
import { FocusSky } from "@/app/(app)/me/wants/focus-sky";
import { PAGE_TITLES } from "@/lib/content/labels";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { useScrollTopOnChange } from "@/lib/hooks/use-scroll-top-on-change";
import { useFormDraft } from "@/lib/hooks/use-form-draft";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { type AiStepRequest, AI_STEPS, runAiStep } from "@/lib/recipes/ai-step";
import type { SavedEntryId } from "@/lib/recipes/saved-entry";
import {
  ANSWER_MAX,
  MAX_ANSWER_BOXES,
  advanceWants,
  farDrafts,
  initialWants,
  joinAnswers,
  keptWants,
  type AuditField,
  type DraftWant,
} from "@/lib/recipes/wants/state";
import { wantSentence } from "@/lib/recipes/wants/items";
import { momentsForDrafts } from "@/lib/recipes/wants/moments";
import type { WantItem } from "@/lib/types/db-json";
import { cn } from "@/lib/utils";

import {
  saveWantsAction,
  saveYinYangEntryAction,
} from "@/lib/recipes/wants/actions";

const INTRO_CARDS = getRecipeIntro("wants") ?? [];

// Warte-Screen: Sterne funkeln gestaffelt auf (der Himmel „entsteht").
const ANALYZING_STARS: { x: number; y: number; delay: number; big?: boolean }[] = [
  { x: 20, y: 60, delay: 0.0 },
  { x: 68, y: 70, delay: 0.25 },
  { x: 44, y: 30, delay: 0.5, big: true },
  { x: 82, y: 38, delay: 0.8 },
  { x: 12, y: 24, delay: 1.05 },
  { x: 58, y: 12, delay: 1.3 },
];

// Abschluss-Konstellation: bis zu 5 Punkte auf einer geschwungenen Bahn (viewBox 240x150).
const DONE_POINTS: { x: number; y: number }[] = [
  { x: 34, y: 110 },
  { x: 96, y: 58 },
  { x: 150, y: 96 },
  { x: 200, y: 44 },
  { x: 122, y: 128 },
];

function buildDonePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const mx = (a.x + b.x) / 2;
    d += ` Q ${mx},${a.y} ${b.x},${b.y}`;
  }
  return d;
}

type AuditDraft = {
  yin: string[];
  yang: string[];
  tagtraum: string[];
  principles: string;
};

/** Antwort-Shape von /api/wants-distiller. Die Liste trägt nur noch die
 *  NAHEN Sterne; für die fernen kommen ausschließlich Namen zurück. */
type DistillerResponse = {
  comment?: string;
  wants?: {
    text?: string;
    title?: string | null;
    example?: string | null;
    valueId?: string | null;
    valueLabel?: string | null;
    reason?: string | null;
    /** Die Antwortfelder hinter dem Stern, wörtlich — serverseitig aus den
     *  Zeigern des Modells aufgelöst, nie vom Modell abgetippt. */
    quotes?: unknown;
    question?: string | null;
  }[];
  farTitles?: (string | null)[];
};

function AnswerBoxes({
  answers,
  onChange,
  idPrefix,
  placeholders,
  disabled,
  optional,
}: {
  answers: string[];
  onChange: (next: string[]) => void;
  idPrefix: string;
  placeholders: string[];
  disabled?: boolean;
  optional?: boolean;
}) {
  const setAt = (i: number, val: string) =>
    onChange(answers.map((a, idx) => (idx === i ? val : a)));
  return (
    <div className="space-y-3">
      {answers.map((answer, i) => (
        <Textarea
          key={i}
          id={`${idPrefix}-${i}`}
          value={answer}
          onChange={(e) => setAt(i, e.target.value)}
          placeholder={placeholders[i] ?? "Noch eine Antwort …"}
          rows={2}
          required={i === 0 && !optional}
          maxLength={ANSWER_MAX}
          disabled={disabled}
          className="min-h-[64px] resize-y text-base"
          aria-label={
            i === 0
              ? optional
                ? "Antwort (optional)"
                : "Antwort (Pflicht)"
              : `Weitere Antwort ${i + 1} (optional)`
          }
        />
      ))}
      {answers.length < MAX_ANSWER_BOXES && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={() => onChange([...answers, ""])}
          disabled={disabled}
        >
          <Plus className="size-4" /> Noch eine Antwort
        </Button>
      )}
    </div>
  );
}

export function WantsJourney({
  introSeen,
  hasValuesHypothesis,
}: {
  introSeen: boolean;
  hasValuesHypothesis: boolean;
}) {
  const intro = useRecipeIntro("wants", introSeen);

  // Der ganze Übungszustand als ein Objekt — was ein neues Destillat
  // überlebt, steht in lib/recipes/wants/state.ts, nicht hier.
  const [state, dispatch] = useReducer(
    advanceWants,
    hasValuesHypothesis,
    initialWants,
  );
  useScrollTopOnChange(state.phase);
  const reduced = useReducedMotion();

  // Der eine Wartescreen (KAN-61) beim Nachschaerfen — hier zum ersten Mal:
  // bis dahin trug „Schärfe …“ am Button das Warten allein. Massstab „zeile“:
  // die wartende Karte selbst wird die Bühne, statt die ganze Liste für das
  // Nachschärfen EINES Satzes wegzureissen.
  const [flugStern, setFlugStern] = useState<string | null>(null);
  const flug = useFunkenflug(state.refiningId !== null);
  const flugAufStern = flug !== "aus" ? flugStern : null;

  const setAnswers = (field: AuditField) => (answers: string[]) =>
    dispatch({ type: "answersEdited", field, answers });

  // Offline draft safety net
  const { pendingDraft, saveDraft, clearDraft, dismissPendingDraft } =
    useFormDraft<AuditDraft>("wants-audit");

  const restoreDraft = () => {
    if (pendingDraft) {
      dispatch({
        type: "draftRestored",
        yin: Array.isArray(pendingDraft.yin) ? pendingDraft.yin : [],
        yang: Array.isArray(pendingDraft.yang) ? pendingDraft.yang : [],
        tagtraum: Array.isArray(pendingDraft.tagtraum) ? pendingDraft.tagtraum : [],
        principles: pendingDraft.principles ?? "",
      });
    }
    dismissPendingDraft();
  };

  const currentDraft = (): AuditDraft => ({
    yin: state.yin,
    yang: state.yang,
    tagtraum: state.tagtraum,
    principles: state.principles,
  });

  // ── KI-Destillat laden ──────────────────────────────────────────
  // Der Eintrag ist zu diesem Zeitpunkt bereits gespeichert — das sagt jetzt
  // der Typ, nicht mehr diese Zeile: eine SavedEntryId gibt es nur aus der
  // Speicher-Action. Die Route lädt Audit + bestätigte Werte serverseitig
  // nach. Die Warte-Bühne setzt „distillateRequested", die Ziel-Bühne gibt
  // runAiStep zurück: ein KI-Ausfall landet als aiError auf dem Sterne-Screen,
  // das Rezept bleibt ohne KI vollständig nutzbar (manueller Modus).

  async function runDistiller(id: SavedEntryId) {
    // Die fernen Sterne baut der Client, bevor gefragt wird: ein ausgefülltes
    // Antwortfeld der Tagtraum-Frage ergibt genau einen, im Wortlaut. Fällt
    // der Aufruf aus, stehen sie trotzdem — ihnen fehlt nur der Name.
    dispatch({
      type: "distillateRequested",
      farWants: farDrafts(state.tagtraum, () => crypto.randomUUID()),
    });

    const step = await runAiStep(AI_STEPS.wants, { entryId: id }, (payload) => {
      const data = payload as DistillerResponse;
      const wants: DraftWant[] = (data.wants ?? [])
        .filter((w) => typeof w.text === "string" && w.text.trim())
        .map((w) => ({
          id: crypto.randomUUID(),
          text: (w.text as string).trim(),
          title: typeof w.title === "string" && w.title.trim() ? w.title.trim() : null,
          example:
            typeof w.example === "string" && w.example.trim()
              ? w.example.trim()
              : null,
          // Destilliert heißt nah — „fern" ist eine Herkunftsmarke, und diese
          // Sätze kommen nicht aus einem Antwortfeld.
          distance: "nah",
          valueId: typeof w.valueId === "string" ? w.valueId : null,
          valueLabel: typeof w.valueLabel === "string" ? w.valueLabel : null,
          reason: typeof w.reason === "string" ? w.reason : null,
          quotes: Array.isArray(w.quotes)
            ? w.quotes.filter((q): q is string => typeof q === "string")
            : [],
          question: typeof w.question === "string" ? w.question : null,
          source: "ai",
        }));
      return {
        comment: typeof data.comment === "string" ? data.comment : "",
        wants,
        farTitles: Array.isArray(data.farTitles) ? data.farTitles : [],
      };
    });

    if (step.error !== null) {
      dispatch({ type: "distillateFailed", phase: step.phase, message: step.error });
      return;
    }

    dispatch({ type: "distillateReceived", phase: step.phase, distillate: step.data });
  }

  // ── Audit speichern → Destillat ─────────────────────────────────

  async function handleAuditSubmit() {
    dispatch({ type: "saving" });

    // No connection — keep the audit as a local draft instead of losing it.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      saveDraft(currentDraft());
      dispatch({
        type: "savingFailed",
        message:
          "Du bist offline – deine Sternensuche wurde als Entwurf gesichert. Sobald du wieder online bist, kannst du es abschließen.",
      });
      return;
    }

    // Jede Frage geht zweimal mit: als Lesetext und als Liste der einzelnen
    // Antwortfelder. Aus dem zusammengefügten String sind die Feldgrenzen
    // nicht zurückzugewinnen — ein Antwortfeld darf selbst mehrzeilig sein.
    const formData = new FormData();
    formData.set("yin", joinAnswers(state.yin));
    formData.set("yin_answers", JSON.stringify(state.yin));
    formData.set("yang", joinAnswers(state.yang));
    formData.set("yang_answers", JSON.stringify(state.yang));
    formData.set("tagtraum", joinAnswers(state.tagtraum));
    formData.set("tagtraum_answers", JSON.stringify(state.tagtraum));
    formData.set("principles", state.principles);

    try {
      const result = await saveYinYangEntryAction(formData);

      if (result.error !== null) {
        dispatch({ type: "savingFailed", message: result.error });
        return;
      }

      clearDraft();
      dispatch({ type: "saved", entryId: result.data });
      void runDistiller(result.data);
    } catch {
      // Network error mid-request — preserve the audit as a draft.
      saveDraft(currentDraft());
      dispatch({
        type: "savingFailed",
        message:
          "Speichern fehlgeschlagen – deine Sternensuche wurde als Entwurf gesichert. Versuch es später noch einmal.",
      });
    }
  }

  // ── Wants bestätigen ────────────────────────────────────────────

  async function confirmWants() {
    const kept = keptWants(state);
    if (kept.length === 0) return;

    // Ein naher Stern wird mit seinen Momenten geboren (KAN-58): die Belege,
    // die unter ihm stehen, werden in derselben Action zu Zeilen. Gerechnet
    // wird aus `kept` — wer einen Stern hier verworfen hat, verwirft seine
    // Momente ungeschrieben mit.
    //
    // Beim zweiten Anlauf nach einem Fehlschlag stehen die Momente des ersten
    // schon im Zustand und werden wiederverwendet: neu gewürfelte ids ließen
    // eine Wiederholung jeden Beleg ein zweites Mal schreiben.
    const moments =
      state.bornMoments ?? momentsForDrafts(kept, () => crypto.randomUUID());

    dispatch({ type: "wantsSaving", moments });

    const items: WantItem[] = kept.map((w) => ({
      id: w.id,
      text: w.text.trim(),
      active: true,
      title: w.title?.trim() ? w.title.trim() : null,
      example: w.example?.trim() ? w.example.trim() : null,
      distance: w.distance,
      valueId: w.valueId,
      source: w.source,
    }));

    const fd = new FormData();
    fd.set("wants", JSON.stringify(items));
    // Leere Baseline: bestehende Wants (Re-Run) bleiben durch den
    // Server-Merge erhalten — hier werden nur neue bestätigt.
    fd.set("previousIds", "[]");
    fd.set("moments", JSON.stringify(moments));

    try {
      const result = await saveWantsAction(fd);
      if (result.error !== null) {
        dispatch({ type: "wantsSaveFailed", message: result.error });
        return;
      }
      dispatch({ type: "wantsSaved" });
    } catch {
      dispatch({
        type: "wantsSaveFailed",
        message: "Speichern fehlgeschlagen. Versuch es noch einmal.",
      });
    }
  }

  // ── Want per Rückfrage nachschärfen ─────────────────────────────

  async function refineWant(want: DraftWant) {
    const answer = (state.refineAnswers[want.id] ?? "").trim();
    if (!answer || !state.entryId) return;
    // Welcher Stern gerade geschärft wird — eigener Zustand und nicht aus
    // `state.refiningId` gelesen, weil der beim Eintreffen der Antwort sofort
    // wieder null ist, der Flug aber noch seine Mindeststandzeit steht. Ohne
    // das Gedächtnis risse die Antwort ihm die Bühne unter den Füßen weg.
    // Ein stehengebliebener Wert schadet nicht: er zählt nur, solange der Flug
    // nicht `aus` ist.
    setFlugStern(want.id);
    dispatch({ type: "refineRequested", id: want.id });

    // Kein runAiStep: das Nachschärfen wechselt keine Bühne, sondern trifft
    // einen einzelnen Stern. Die Anfrage ist trotzdem eine AiStepRequest —
    // /api/wants-refiner lädt denselben Eintrag nach und antwortet mit 404,
    // also gilt hier derselbe Zwang.
    const request: AiStepRequest = {
      entryId: state.entryId,
      // Der ganze Satz, wie ihn die Person liest — sonst schärft der Refiner
      // an einem Text, dem der Anker fehlt, und das alte Beispiel bliebe.
      text: wantSentence(want),
      question: want.question ?? "",
      answer,
    };

    try {
      const res = await fetch("/api/wants-refiner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        dispatch({
          type: "refineFailed",
          id: want.id,
          message: data.error ?? "Nachschärfen fehlgeschlagen.",
        });
        return;
      }
      dispatch({ type: "refineSucceeded", id: want.id, text: data.text });
    } catch {
      dispatch({
        type: "refineFailed",
        id: want.id,
        message: "Nachschärfen fehlgeschlagen.",
      });
    }
  }

  // ── Render: Intro-Sequenz (erster Besuch) ───────────────────────

  if (intro.pending) {
    return intro.page(
      <SubPageHeader backHref="/me/wants" title={PAGE_TITLES.wants} />,
    );
  }

  const introAction =
    INTRO_CARDS.length > 0 ? <IntroInfoButton cards={INTRO_CARDS} /> : undefined;

  // Fortschritt nur auf den drei Eingabeschritten (nutzt die leere Untertitelzeile).
  const stepSubtitle =
    state.phase === "yin"
      ? "Schritt 1 von 3"
      : state.phase === "yang"
        ? "Schritt 2 von 3"
        : state.phase === "tagtraum"
          ? "Schritt 3 von 3"
          : undefined;

  // ── Render: Werte-Nudge ──────────────────────────────────────────

  if (state.phase === "nudge") {
    return (
      <JourneyStage
        backHref="/me/wants"
        title={PAGE_TITLES.wants}
        headerAction={introAction}
        mascot={null}
        stepKey="nudge"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Mascot expression="curious" size="md" />
          <div className="space-y-2">
            <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
              Erst der Kompass, dann die Sterne?
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Deine Sterne leuchten heller, wenn dein Kompass schon steht. Findest
              du zuerst deine Werte, kann ich deine Wants viel besser mit dem
              verbinden, was dir wirklich wichtig ist.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 pt-2">
            <Button className="w-full" size="lg" render={<Link href="/me/values" />}>
              Zu meinen Werten
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => dispatch({ type: "stageChanged", phase: "yin" })}
            >
              Trotzdem mit den Wants starten
            </Button>
          </div>
        </div>
      </JourneyStage>
    );
  }

  // ── Render: Destillat läuft ─────────────────────────────────────

  if (state.phase === "analyzing") {
    return (
      <JourneyStage
        backHref="/me/wants"
        title={PAGE_TITLES.wants}
        headerAction={introAction}
        mascot={{ expression: "curious", gazeY: -1.4 }}
        stepKey="analyzing"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          {/* Sterne, die nach und nach auffunkeln — der Himmel entsteht. */}
          <div className="relative h-40 w-full max-w-xs" aria-hidden="true">
            {ANALYZING_STARS.map((s, i) => (
              <span
                key={i}
                className="absolute quiet-glow-in"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  animationDelay: `${s.delay}s`,
                }}
              >
                <StarGlyph sizeClass={s.big ? "size-5" : "size-3"} glow={s.big ? 10 : 5} />
              </span>
            ))}
          </div>
          <p className="text-base leading-relaxed text-muted-foreground">
            Dein Himmel entsteht gerade …
          </p>
        </div>
      </JourneyStage>
    );
  }

  // ── Render: Sterne ───────────────────────────────────────────────

  if (state.phase === "sterne") {
    const keptCount = keptWants(state).length;
    const { entryId } = state;

    return (
      <JourneyStage
        backHref="/me/wants"
        title={PAGE_TITLES.wants}
        headerAction={introAction}
        mascot={null}
        stepKey="sterne"
      >
        {/* Der Ausfall räumt die Bühne nur, wenn nichts darauf steht. Die
            fernen Sterne kommen nicht aus der KI — sie bleiben, und ihnen
            fehlt bloß der Name. */}
        {state.aiError && state.wants.length === 0 ? (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <Mascot expression="sorrowMild" size="md" />
            </div>
            <Card className="w-full">
              <CardContent className="space-y-3 pt-(--card-spacing)">
                <p className="text-base leading-relaxed text-muted-foreground">
                  {state.aiError}
                </p>
                {entryId && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => void runDistiller(entryId)}
                  >
                    Nochmal versuchen
                  </Button>
                )}
                <Button
                  className="w-full"
                  onClick={() => dispatch({ type: "manualStarted" })}
                >
                  Meine Wants selbst formulieren
                </Button>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Held-Stern statt Maskottchen */}
            <div className="flex flex-col items-center gap-3 text-center">
              <StarGlyph sizeClass="size-14" glow={18} />
              <p className="text-base leading-relaxed text-muted-foreground">
                {state.aiError
                  ? "Deine fernen Sterne stehen — ihre Namen fehlen noch. Tipp einen an, um ihn zu taufen."
                  : state.manualMode
                    ? "Formuliere 3–6 Sätze dazu, was dich antreibt — so, wie es sich für dich richtig anfühlt."
                    : "Das lese ich aus deiner Sternensuche heraus. Tipp einen Stern an, um ihn zu taufen oder zu ändern — und verwirf, was nicht stimmt."}
              </p>
            </div>

            {/* Ausfall bei stehenden Sternen: Meldung daneben, nicht davor —
                und bewusst OHNE „Nochmal versuchen". Ein zweiter Anlauf baut
                die Bühne neu (s. `distillateRequested`) und nähme der Person
                die Namen, die sie hier gerade selbst vergeben hat. */}
            {state.aiError && (
              <Card className="w-full">
                <CardContent className="pt-(--card-spacing)">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {state.aiError}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* KI-Einschätzung als Glass-Karte */}
            {state.comment && (
              <Reveal delay={0.15} className="w-full">
                <Card variant="glass" className="w-full">
                  <CardContent className="pt-(--card-spacing)">
                    <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                      {state.comment}
                    </p>
                  </CardContent>
                </Card>
              </Reveal>
            )}

            {/* Vorschläge als kompakte Stern-Zeilen (Tap-to-Edit) */}
            <div className="flex w-full flex-col">
              {state.wants.map((want) => {
                const open = state.openIds.includes(want.id);
                const sentence = wantSentence(want);
                const displayName = want.title?.trim() ? want.title.trim() : sentence;
                return (
                  <div key={want.id} className="border-b border-foreground/10 last:border-b-0">
                    {/* Kollabierte Zeile */}
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 py-3 text-left"
                      aria-expanded={open}
                      onClick={() => dispatch({ type: "wantToggled", id: want.id })}
                    >
                      <StarGlyph
                        sizeClass={want.distance === "fern" ? "size-4" : "size-5"}
                        dim={want.distance === "fern"}
                        glow={want.distance === "fern" ? 4 : 7}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-heading text-base font-semibold text-foreground">
                          {displayName}
                        </span>
                        {!open && (
                          <span className="block truncate text-sm text-muted-foreground">
                            {sentence}
                          </span>
                        )}
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-transform",
                          open && "rotate-180",
                        )}
                      />
                    </button>

                    {/* Aufgeklappt: sanft ausklappen (Grid 0fr→1fr statt hartem Mounten) */}
                    <div
                      className={cn(
                        "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
                        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      )}
                    >
                      <div className="overflow-hidden">
                      <div className="space-y-2 pb-4">
                        <div className="flex items-center gap-2">
                          <Input
                            value={want.title ?? ""}
                            onChange={(e) =>
                              dispatch({
                                type: "wantEdited",
                                id: want.id,
                                patch: { title: e.target.value },
                              })
                            }
                            maxLength={60}
                            placeholder="Name des Sterns (2–3 Worte)"
                            className="font-heading"
                            aria-label="Name des Sterns"
                          />
                          {want.distance === "fern" && (
                            <span className="shrink-0 rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                              Ferner Stern
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-2">
                          <Textarea
                            value={want.text}
                            onChange={(e) =>
                              dispatch({
                                type: "wantEdited",
                                id: want.id,
                                patch: { text: e.target.value },
                              })
                            }
                            // Ein ferner Stern trägt ein ganzes Antwortfeld —
                            // hier darf nichts abgeschnitten werden.
                            maxLength={ANSWER_MAX}
                            rows={2}
                            className="min-h-[60px] resize-y text-base"
                            aria-label="Want bearbeiten"
                          />
                          <button
                            type="button"
                            className="mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label="Want verwerfen"
                            onClick={() => dispatch({ type: "wantDiscarded", id: want.id })}
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                        {want.example && (
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            z. B. {want.example}
                          </p>
                        )}
                        {want.valueLabel && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            <Sparkles className="size-3" />
                            Passt zu deinem Wert: {want.valueLabel}
                          </span>
                        )}
                        {want.reason && (
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {want.reason}
                          </p>
                        )}
                        {/* Die eigenen Worte, aus denen der Stern destilliert
                            ist — ungekürzt und in Fraunces, damit sie sich von
                            der Herleitung darüber als andere Stimme abheben.
                            Die Anführungszeichen tun die Arbeit, die sonst ein
                            Eyebrow täte. */}
                        {want.quotes.length > 0 && (
                          <ul className="space-y-2 border-l border-foreground/15 pl-3">
                            {want.quotes.map((quote, i) => (
                              <li
                                key={i}
                                className="whitespace-pre-wrap font-heading text-sm leading-relaxed text-foreground"
                              >
                                „{quote}“
                              </li>
                            ))}
                          </ul>
                        )}
                        {/* Der Flug steht VOR der Rückfrage-Box und nicht in
                            ihr: `refineSucceeded` setzt `question` auf null,
                            die Box verschwindet also im selben Commit wie die
                            Antwort. Stünde er darin, verlöre er genau dabei
                            seine Mindeststandzeit und seine Blende. */}
                        {flugAufStern === want.id ? (
                          /* Die wartende Karte IST die Bühne: die Funken
                             steigen über ihre volle Höhe auf, der Satz steht
                             daneben. Kein vollflächiger Screen — der risse die
                             ganze Liste weg, um EINEN Satz nachzuschärfen
                             (KAN-52). */
                          <div className="mt-1 rounded-lg border border-primary/25 bg-primary/5 p-3">
                            <Funkenflug
                              flug={flug}
                              massstab="zeile"
                              satz="Ich schärfe deinen Stern …"
                            />
                          </div>
                        ) : (
                          want.question && (
                            <div className="mt-1 space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
                              <p className="text-sm leading-relaxed text-foreground">
                                {want.question}
                              </p>
                              <Textarea
                                value={state.refineAnswers[want.id] ?? ""}
                                onChange={(e) =>
                                  dispatch({
                                    type: "refineAnswerEdited",
                                    id: want.id,
                                    text: e.target.value,
                                  })
                                }
                                rows={2}
                                maxLength={300}
                                placeholder="Deine Antwort — dann mach ich es konkreter."
                                className="min-h-[52px] resize-y bg-background text-sm"
                                aria-label="Antwort zum Konkretisieren"
                              />
                              {state.refineErrors[want.id] && (
                                <p className="text-xs text-destructive">
                                  {state.refineErrors[want.id]}
                                </p>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={
                                  state.refiningId === want.id ||
                                  !(state.refineAnswers[want.id] ?? "").trim()
                                }
                                onClick={() => void refineWant(want)}
                              >
                                {state.refiningId === want.id ? "Schärfe …" : "Konkreter machen"}
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Eigenen Stern hinzufügen */}
            <div className="flex w-full items-start gap-2">
              <Textarea
                value={state.newWantText}
                onChange={(e) =>
                  dispatch({ type: "newWantEdited", text: e.target.value })
                }
                placeholder="Was zieht dich an? Z. B. „Mir macht … Spaß“ oder „Ich will …“"
                maxLength={300}
                rows={2}
                className="min-h-[60px] flex-1 resize-y"
                aria-label="Eigenes Want hinzufügen"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="mt-1 shrink-0"
                aria-label="Want hinzufügen"
                disabled={!state.newWantText.trim()}
                onClick={() =>
                  dispatch({
                    type: "ownWantAdded",
                    id: crypto.randomUUID(),
                    text: state.newWantText,
                  })
                }
              >
                <Plus className="size-4" />
              </Button>
            </div>

            <FormError message={state.wantsError} />

            <Button
              className="w-full gap-2"
              size="lg"
              disabled={state.savingWants || keptCount === 0}
              onClick={() => void confirmWants()}
            >
              <StarGlyph sizeClass="size-4" glow={0} fill="var(--primary-foreground)" />
              {state.savingWants
                ? "Wird gespeichert …"
                : keptCount === 1
                  ? "Diesen Stern behalten"
                  : `Diese ${keptCount} Sterne behalten`}
            </Button>
          </>
        )}
      </JourneyStage>
    );
  }

  // ── Render: Abschluss ───────────────────────────────────────────

  if (state.phase === "done") {
    const keptStarCount = keptWants(state).length;
    const n = Math.min(keptStarCount, DONE_POINTS.length);
    const pts = DONE_POINTS.slice(0, Math.max(n, 1));
    const path = buildDonePath(pts);

    return (
      <div
        className="relative flex min-h-lvh flex-col items-center justify-center overflow-hidden px-4 pb-10"
        // Kein Header hier — die Safe-Area-Brücke zieht die Bühne unter den Notch, damit
        // FocusSky bis an die obere Bildschirmkante reicht (keine Lücke). Der obere
        // Inhaltsabstand (2.5rem = py-10) bleibt on top erhalten.
        style={{
          marginTop: "calc(env(safe-area-inset-top, 0px) * -1)",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 2.5rem)",
        }}
      >
        <FocusSky />
        <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center einblenden">
          {n >= 2 ? (
            <div className="relative h-[150px] w-[240px]" aria-hidden="true">
              <svg viewBox="0 0 240 150" className="absolute inset-0 size-full">
                {path && (
                  <path
                    d={path}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    opacity="0.6"
                    pathLength={1}
                    strokeDasharray="1"
                    strokeDashoffset={reduced ? 0 : undefined}
                    className={reduced ? undefined : "constellation-draw"}
                  />
                )}
              </svg>
              {pts.map((p, i) => (
                <span
                  key={i}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${(p.x / 240) * 100}%`, top: `${(p.y / 150) * 100}%` }}
                >
                  <StarGlyph
                    sizeClass={i === Math.floor(pts.length / 2) ? "size-8" : "size-5"}
                    glow={i === Math.floor(pts.length / 2) ? 16 : 9}
                    twinkle={!reduced}
                  />
                </span>
              ))}
            </div>
          ) : (
            <StarGlyph sizeClass="size-16" glow={22} twinkle={!reduced} />
          )}

          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              {n >= 2
                ? `${keptStarCount} Sterne stehen jetzt an deinem Himmel.`
                : "Dein Stern leuchtet."}
            </h1>
            <p className="text-muted-foreground">
              Sie warten auf deiner Sterne-Seite. Und wenn du Lust hast, etwas
              Neues auszuprobieren, das ein neuer Stern werden könnte: In der
              Sternschmiede schlägst du dafür ein paar Funken.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 pt-4">
            <Button className="w-full" size="lg" render={<Link href="/me/wants" />}>
              Zu deinen Sternen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Tagträume (überspringbar) ───────────────────────────

  if (state.phase === "tagtraum") {
    return (
      <JourneyStage
        backHref="/me/wants"
        title={PAGE_TITLES.wants}
        subtitle={stepSubtitle}
        headerAction={introAction}
        mascot={{ expression: "curious" }}
        stepKey="tagtraum"
      >
        <div className="space-y-2 text-center">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Wovon tagträumst du?
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Die Dinge, bei denen du gedankenversunken in die Leere starrst:
            „Irgendwann mach ich mal einen Ironman.“ Solche Sterne stehen
            weiter weg — nach ihnen greift man. Schreib auf, was dir kommt,
            oder überspring den Schritt.
          </p>
        </div>

        <FormError message={state.error} />

        <form className="space-y-5">
          <AnswerBoxes
            answers={state.tagtraum}
            onChange={setAnswers("tagtraum")}
            idPrefix="tagtraum"
            optional
            placeholders={[
              "Zum Beispiel: Irgendwann mach ich mal einen Ironman …",
              "Noch ein Tagtraum …",
              "Und noch einer …",
            ]}
            disabled={state.saving}
          />

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="w-full gap-2"
              size="lg"
              disabled={state.saving}
              onClick={() => void handleAuditSubmit()}
            >
              {state.saving ? "Wird gespeichert …" : "Meine Sterne finden"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={state.saving}
              onClick={() => dispatch({ type: "stageChanged", phase: "yang" })}
            >
              Zurück
            </Button>
          </div>
        </form>
      </JourneyStage>
    );
  }

  // ── Render: Yang (Flow) ─────────────────────────────────────────

  if (state.phase === "yang") {
    return (
      <JourneyStage
        backHref="/me/wants"
        title={PAGE_TITLES.wants}
        subtitle={stepSubtitle}
        headerAction={introAction}
        mascot={{ expression: "smile" }}
        stepKey="yang"
      >
        <div className="space-y-2 text-center">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            Was bringt dich in „Flow“?
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Flow ist dieser Zustand, in dem du die Zeit vergisst — so vertieft,
            dass die Welt und das Gedankenchaos im Kopf ausgeblendet sind. Laut
            Forschung eines der schönsten Gefühle, die wir haben können.
          </p>
        </div>

        <FormError message={state.error} />

        <form className="space-y-5">
          <div className="space-y-2">
            <Label className="text-base font-medium">
              Bei welchen Aktivitäten vergisst du die Zeit? Eine reicht, drei
              sind ideal.
            </Label>
            <AnswerBoxes
              answers={state.yang}
              onChange={setAnswers("yang")}
              idPrefix="yang"
              placeholders={[
                "Zum Beispiel: Wenn ich an einem Design tüftle, sind plötzlich drei Stunden weg …",
                "Noch etwas, das dich in Flow bringt …",
                "Und noch etwas …",
              ]}
              disabled={state.saving}
            />
          </div>

          {/* Bonus: kognitive Prinzipien (aufklappbar) */}
          <Card className="w-full">
            <CardContent>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left"
                onClick={() => dispatch({ type: "principlesToggled" })}
                aria-expanded={state.principlesOpen}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="size-4 text-primary" />
                  Bonus: Willst du tiefer graben?
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    state.principlesOpen && "rotate-180",
                  )}
                />
              </button>
              {/* Aufgeklappt: sanft ausklappen (Grid 0fr→1fr statt hartem Mounten) */}
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
                  state.principlesOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <div className="mt-3 space-y-3 border-t pt-3">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Was ist das Prinzip hinter diesen Aktivitäten, das sie
                      für dich so genussvoll macht? Wenn dich z. B. Photoshop
                      in Flow bringt: Ist es das Erschaffen? Die Ästhetik?
                      Diese inneren Treiber helfen dir, neue Dinge zu finden,
                      die dich genauso erfüllen.
                    </p>
                    <Textarea
                      id="principles"
                      name="principles"
                      value={state.principles}
                      onChange={(e) =>
                        dispatch({ type: "principlesEdited", text: e.target.value })
                      }
                      placeholder="Zum Beispiel: Ich glaube, es geht mir ums Erschaffen — etwas, das vorher nicht da war …"
                      rows={3}
                      maxLength={5000}
                      disabled={state.saving}
                      className="min-h-[80px] resize-y"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="w-full gap-2"
              size="lg"
              disabled={state.saving || !state.yang[0]?.trim()}
              onClick={() => dispatch({ type: "stageChanged", phase: "tagtraum" })}
            >
              Weiter
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={state.saving}
              onClick={() => dispatch({ type: "stageChanged", phase: "yin" })}
            >
              Zurück
            </Button>
          </div>
        </form>
      </JourneyStage>
    );
  }

  // ── Render: Yin (Mühsal) — Einstieg ─────────────────────────────

  return (
    <JourneyStage
      backHref="/me/wants"
      title={PAGE_TITLES.wants}
      subtitle={stepSubtitle}
      headerAction={introAction}
      mascot={{ expression: "smile" }}
      stepKey="yin"
    >
      {pendingDraft && (
        <DraftRestoreBanner onRestore={restoreDraft} onDiscard={clearDraft} />
      )}

      <div className="space-y-2 text-center">
        <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
          Wofür nimmst du Mühsal in Kauf?
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          Nicht jede Anstrengung stört uns gleich — manche Mühsal nehmen wir
          erstaunlich bereitwillig in Kauf. Genau die verrät, was dir wirklich
          wichtig ist.
        </p>
      </div>

      <FormError message={state.error} />

      <form className="space-y-5">
        <div className="space-y-2">
          <Label className="text-base font-medium">
            Denk an Momente von Stress oder Schmerz, auf die du zurückblickst
            und denkst: „Hat mich an den Rand gebracht … war’s aber wert.“
            Eine reicht, drei sind ideal.
          </Label>
          <AnswerBoxes
            answers={state.yin}
            onChange={setAnswers("yin")}
            idPrefix="yin"
            placeholders={[
              "Zum Beispiel: die durchgemachten Nächte vor der Abgabe …",
              "Noch eine Mühsal, die sich gelohnt hat …",
              "Und noch eine …",
            ]}
          />
        </div>

        <Button
          type="button"
          className="w-full"
          size="lg"
          disabled={!state.yin[0]?.trim()}
          onClick={() => dispatch({ type: "stageChanged", phase: "yang" })}
        >
          Weiter
        </Button>
      </form>
    </JourneyStage>
  );
}
