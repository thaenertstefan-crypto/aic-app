"use client";

import { useReducer } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  MessageCircleQuestion,
  RefreshCw,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { Skeleton } from "@/components/ui/skeleton";
import { FormError } from "@/components/ui/form-error";
import { CompletionCelebration } from "@/components/ui/completion-celebration";
import { Reveal } from "@/components/ui/reveal";
import { BoosterBackHeader } from "@/components/booster/booster-back-header";
import { DraftRestoreBanner } from "@/components/offline/draft-restore-banner";
import { useRecipeIntro } from "@/components/recipes/recipe-intro-gate";
import { useSuggestedRight } from "@/components/recipes/use-suggested-right";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { Mascot } from "@/components/brand/mascot";
import { ModuleIcon } from "@/components/booster/module-icon";
import { PAGE_TITLES } from "@/lib/content/labels";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { useScrollTopOnChange } from "@/lib/hooks/use-scroll-top-on-change";
import { useFormDraft } from "@/lib/hooks/use-form-draft";
import { AI_STEPS, runAiStep } from "@/lib/recipes/ai-step";
import type { SavedEntryId } from "@/lib/recipes/saved-entry";
import { readRightSuggestion } from "@/lib/recipes/right-suggestion";
import {
  advanceSayingNo,
  initialSayingNo,
  type FeedbackChecklist,
  type Mode,
} from "@/lib/recipes/saying-no/state";
import { cn } from "@/lib/utils";

import { SAYING_NO_LAYERS, STATIC_SCENARIOS } from "./blueprint";
import { saveFinalNoAction, saveSayingNoEntryAction } from "@/lib/recipes/saying-no/actions";

const INTRO_CARDS = getRecipeIntro("saying-no") ?? [];

/** Client-Cap fürs „Anderes Szenario“-Reroll, schützt das Stunden-Kontingent. */
const MAX_REROLLS = 3;

type Draft = {
  mode: Mode | null;
  situation: string;
  draft: string;
};

/** Antwort-Shape von /api/saying-no-coach (mode "feedback"). */
type FeedbackResponse = {
  comment?: string;
  checklist?: unknown;
  improved?: string;
  right?: unknown;
};

/** Reihenfolge der Checklist-Zeilen = Reihenfolge der Blueprint-Schichten. */
const CHECKLIST_KEYS = SAYING_NO_LAYERS.map((l) => l.key);

export function SayingNoWizard({ introSeen }: { introSeen: boolean }) {
  const intro = useRecipeIntro("saying-no", introSeen);

  // Der ganze Übungszustand als ein Objekt — was ein Szenario-Wechsel
  // überlebt, steht in lib/recipes/saying-no/state.ts, nicht hier.
  const [state, dispatch] = useReducer(advanceSayingNo, undefined, initialSayingNo);
  useScrollTopOnChange(state.phase);

  // Der Rechts-Vorschlag samt Übernahme — setzt sich mit jedem neuen
  // Vorschlag von selbst zurück.
  const suggestedRight = useSuggestedRight(state.right);

  // Offline draft safety net
  const { pendingDraft, saveDraft, clearDraft, dismissPendingDraft } =
    useFormDraft<Draft>("saying-no");

  const restoreDraft = () => {
    if (pendingDraft) {
      dispatch({
        type: "draftRestored",
        mode:
          pendingDraft.mode === "real" || pendingDraft.mode === "practice"
            ? pendingDraft.mode
            : null,
        situation: pendingDraft.situation ?? "",
        draft: pendingDraft.draft ?? "",
      });
    }
    dismissPendingDraft();
  };

  const currentDraft = (): Draft => ({
    mode: state.mode,
    situation: state.situation,
    draft: state.draft,
  });

  // ── Übungsszenario laden ────────────────────────────────────────
  // KI zuerst; wenn sie nicht erreichbar ist (Fehler/429/offline), kommt stumm
  // ein kuratiertes Szenario aus dem statischen Pool — der Modus muss sich
  // auch ohne KI vollständig anfühlen.

  function pickStaticScenario(seen: string[]): string {
    const unseen = STATIC_SCENARIOS.filter((s) => !seen.includes(s));
    const pool = unseen.length > 0 ? unseen : STATIC_SCENARIOS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Die Warte-Bühne setzt der Übergang, der hierher führt (Modus-Wahl,
  // „Anderes Szenario", „Nächstes Szenario") — hier wird nur geholt.
  async function loadScenario(seen: string[]) {
    try {
      const res = await fetch("/api/saying-no-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "scenario",
          exclude: seen.map((s) => s.slice(0, 80)),
        }),
      });
      const data = await res.json();
      if (res.ok && typeof data.scenario === "string" && data.scenario.trim()) {
        dispatch({ type: "scenarioLoaded", text: data.scenario.trim(), source: "ai" });
      } else {
        dispatch({
          type: "scenarioLoaded",
          text: pickStaticScenario(seen),
          source: "static",
        });
      }
    } catch {
      dispatch({
        type: "scenarioLoaded",
        text: pickStaticScenario(seen),
        source: "static",
      });
    }
  }

  // ── KI-Feedback ─────────────────────────────────────────────────
  // Der Eintrag ist zu diesem Zeitpunkt bereits gespeichert — das sagt jetzt
  // der Typ, nicht mehr diese Zeile: eine SavedEntryId gibt es nur aus der
  // Speicher-Action. Die Route lädt Texte + Rechte serverseitig nach.
  // Die Warte-Bühne setzt „feedbackRequested", die Ziel-Bühne gibt runAiStep
  // zurück: ein KI-Ausfall landet als aiError auf dem Feedback-Screen (Retry
  // möglich), blockiert die Übung aber nicht.

  async function runFeedback(id: SavedEntryId) {
    dispatch({ type: "feedbackRequested" });

    const step = await runAiStep(
      AI_STEPS.sayingNo,
      { mode: "feedback", entryId: id },
      (payload) => {
        const data = payload as FeedbackResponse;
        return {
          comment: typeof data.comment === "string" ? data.comment : "",
          checklist: isValidChecklist(data.checklist) ? data.checklist : null,
          improved:
            typeof data.improved === "string" && data.improved.trim()
              ? data.improved.trim()
              : null,
          right: readRightSuggestion(data.right),
        };
      },
    );

    if (step.error !== null) {
      dispatch({ type: "feedbackFailed", phase: step.phase, message: step.error });
      return;
    }

    dispatch({ type: "feedbackReceived", phase: step.phase, feedback: step.data });
  }

  function isValidChecklist(value: unknown): value is FeedbackChecklist {
    if (!value || typeof value !== "object") return false;
    return CHECKLIST_KEYS.every((key) => {
      const item = (value as Record<string, unknown>)[key];
      return (
        item !== null &&
        typeof item === "object" &&
        typeof (item as { pass?: unknown }).pass === "boolean"
      );
    });
  }

  // ── Speichern → Feedback ────────────────────────────────────────

  async function handleDraftSubmit() {
    dispatch({ type: "saving" });

    // No connection — keep the entry as a local draft instead of losing it.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      saveDraft(currentDraft());
      dispatch({
        type: "savingFailed",
        message:
          "Du bist offline – dein Nein wurde als Entwurf gesichert. Sobald du wieder online bist, kannst du es abschließen.",
      });
      return;
    }

    // Zweitversuch: der Eintrag existiert schon → nur draft2 nachtragen,
    // dann die zweite (und letzte) Feedback-Runde starten.
    if (state.entryId) {
      const entryId = state.entryId;
      try {
        const fd = new FormData();
        fd.set("entryId", entryId);
        fd.set("draft2", state.draft);
        const result = await saveFinalNoAction(fd);
        if (result.error !== null) {
          dispatch({ type: "savingFailed", message: result.error });
          return;
        }
        dispatch({ type: "saved", entryId });
        void runFeedback(entryId);
      } catch {
        dispatch({
          type: "savingFailed",
          message: "Speichern fehlgeschlagen. Versuch es noch einmal.",
        });
      }
      return;
    }

    const formData = new FormData();
    formData.set("mode", state.mode ?? "");
    formData.set("situation", state.situation);
    formData.set("draft", state.draft);
    if (state.mode === "practice") {
      formData.set("scenario_source", state.scenarioSource);
    }
    if (state.mode === "real") {
      formData.set("hell_yes", state.hellYes ? "true" : "false");
    }

    try {
      const result = await saveSayingNoEntryAction(formData);

      if (result.error !== null) {
        dispatch({ type: "savingFailed", message: result.error });
        return;
      }

      clearDraft();
      dispatch({ type: "saved", entryId: result.data });
      void runFeedback(result.data);
    } catch {
      // Network error mid-request — preserve the entry as a draft.
      saveDraft(currentDraft());
      dispatch({
        type: "savingFailed",
        message:
          "Speichern fehlgeschlagen – dein Nein wurde als Entwurf gesichert. Versuch es später noch einmal.",
      });
    }
  }

  // ── Finales Nein festlegen ──────────────────────────────────────

  function goFinal(text: string, source: "own" | "ai" | "edited") {
    const chosen = text.trim();
    if (!chosen) return;
    dispatch({ type: "finished", text: chosen });

    // Persistieren im Hintergrund — der Abschluss-Screen wartet nicht darauf.
    if (state.entryId) {
      const fd = new FormData();
      fd.set("entryId", state.entryId);
      fd.set("final_no", chosen);
      fd.set("final_source", source);
      void saveFinalNoAction(fd).catch(() => {
        /* Eintrag existiert bereits mit draft — kein harter Fehler nötig. */
      });
    }
  }

  async function copyFinalNo() {
    try {
      if (!navigator.clipboard || !window.isSecureContext) {
        throw new Error("clipboard unavailable");
      }
      await navigator.clipboard.writeText(state.finalNo);
      dispatch({ type: "copied" });
      window.setTimeout(() => dispatch({ type: "copyReset" }), 2000);
    } catch {
      dispatch({
        type: "copyFailed",
        message: "Kopieren klappt hier nicht — markiere den Text einfach selbst.",
      });
    }
  }

  // ── Übungsmodus: nächstes Szenario ──────────────────────────────

  function nextScenario() {
    dispatch({ type: "nextScenario" });
    void loadScenario(state.seenScenarios);
  }

  // ── Render: Intro-Sequenz (erster Besuch) ───────────────────────

  if (intro.pending) {
    return intro.page(
      <BoosterBackHeader title={PAGE_TITLES.sayingNo} />,
    );
  }

  const header = (
    <BoosterBackHeader
      title={PAGE_TITLES.sayingNo}
      // Nur der Einstiegs-Screen blendet ein — er steht am Ende des
      // Kopfwetter-Zooms. An die Phase gehängt, damit die Animation bei einem
      // späteren Branch-Wechsel nicht erneut anläuft.
      enterFade={state.phase === "mode"}
      action={
        INTRO_CARDS.length > 0 ? <IntroInfoButton cards={INTRO_CARDS} /> : undefined
      }
    />
  );

  // ── Render: Feedback läuft ──────────────────────────────────────

  if (state.phase === "analyzing") {
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-6 einblenden">
          <Mascot expression="curious" size="md" gazeX={0} />
          <p className="text-center text-base text-muted-foreground">
            Ich leg dein Nein kurz auf den Blueprint …
          </p>
          <div className="w-full max-w-sm space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Blueprint-Check (Feedback) ──────────────────────────

  if (state.phase === "feedback") {
    const ownDraft = state.draft.trim();
    const { entryId, checklist } = state;
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 einblenden">
          {state.aiError ? (
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
                      onClick={() => void runFeedback(entryId)}
                    >
                      Nochmal versuchen
                    </Button>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => goFinal(ownDraft, "own")}
                  >
                    Ohne Feedback weiter
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Tipp: Die vier Schichten oben im Entwurf-Schritt sind auch
                    ein guter Selbst-Check.
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-3 text-center">
                <Mascot expression="happy" size="md" />
                <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                  Dein Nein im Blueprint-Check
                </h1>
              </div>

              {state.comment && (
                <Reveal delay={0.15} className="w-full">
                  <Card className="w-full">
                    <CardContent className="pt-(--card-spacing)">
                      <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                        {state.comment}
                      </p>
                    </CardContent>
                  </Card>
                </Reveal>
              )}

              {checklist && (
                <Reveal delay={0.35} className="w-full">
                  <Card className="w-full">
                    <CardContent className="space-y-3 pt-(--card-spacing)">
                      {SAYING_NO_LAYERS.map((layer) => {
                        const item = checklist[layer.key];
                        return (
                          <div key={layer.key} className="flex items-start gap-3">
                            <span
                              className={cn(
                                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                                item.pass
                                  ? "bg-primary/15 text-primary"
                                  : "bg-destructive/15 text-destructive",
                              )}
                            >
                              {item.pass ? (
                                <Check className="size-3.5" />
                              ) : (
                                <X className="size-3.5" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {layer.title}
                              </p>
                              {item.note && (
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                  {item.note}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </Reveal>
              )}

              {state.improved !== null && (
                <Reveal delay={0.55} className="w-full">
                  <Card className="w-full border-primary/30">
                    <CardContent className="space-y-3 pt-(--card-spacing)">
                      <SectionLabel>So könnte dein Nein klingen</SectionLabel>
                      <p className="text-sm text-muted-foreground">
                        Du kannst die Version noch anpassen, bevor du sie
                        übernimmst:
                      </p>
                      <Textarea
                        value={state.improvedDraft}
                        onChange={(e) =>
                          dispatch({ type: "improvedEdited", text: e.target.value })
                        }
                        maxLength={5000}
                        rows={4}
                        className="min-h-[120px] resize-y"
                      />
                      <Button
                        className="w-full"
                        disabled={!state.improvedDraft.trim()}
                        onClick={() =>
                          goFinal(
                            state.improvedDraft,
                            state.improvedDraft.trim() === state.improved
                              ? "ai"
                              : "edited",
                          )
                        }
                      >
                        Diese Version übernehmen
                      </Button>
                    </CardContent>
                  </Card>
                </Reveal>
              )}

              <div className="flex w-full flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!ownDraft}
                  onClick={() => goFinal(ownDraft, "own")}
                >
                  Meine Version behalten
                </Button>
                {!state.revisionUsed && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => dispatch({ type: "revisionStarted" })}
                  >
                    Nochmal selbst umformulieren
                  </Button>
                )}
              </div>
            </>
          )}
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // ── Render: Abschluss ───────────────────────────────────────────

  if (state.phase === "final") {
    return (
      <div className="flex min-h-svh flex-col items-center px-4 py-10">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center einblenden">
          <CompletionCelebration />

          <div className="space-y-2">
            <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">
              Dein Nein steht.
            </h1>
            <p className="text-muted-foreground">
              {state.mode === "real"
                ? "Jetzt musst du es nur noch aussprechen — oder abschicken."
                : "Mit jedem geübten Nein wird das echte leichter."}
            </p>
          </div>

          <Card className="w-full border-primary/30">
            <CardContent className="space-y-3 pt-(--card-spacing)">
              <p className="whitespace-pre-wrap text-left text-base leading-relaxed text-foreground">
                {state.finalNo}
              </p>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => void copyFinalNo()}
              >
                {state.copied ? (
                  <>
                    <Check className="size-4 text-primary" /> Kopiert!
                  </>
                ) : (
                  <>
                    <Copy className="size-4" /> Nein kopieren
                  </>
                )}
              </Button>
              {state.copyError && (
                <p className="text-left text-sm text-muted-foreground">
                  {state.copyError}
                </p>
              )}
            </CardContent>
          </Card>

          {state.right?.type === "existing" && (
            <Reveal delay={0.5} className="w-full">
              <Card className="w-full border-primary/30">
                <CardContent className="space-y-2 pt-(--card-spacing)">
                  <SectionLabel>Kleiner Reminder — in deiner Bill of Rights steht:</SectionLabel>
                  <div className="flex items-start gap-2 text-left">
                    <Check className="mt-1 size-4 shrink-0 text-primary" />
                    <p className="text-base leading-relaxed text-foreground">
                      {state.right.text}
                    </p>
                  </div>
                  <p className="text-left text-sm text-muted-foreground">
                    Dein Nein setzt genau dieses Recht um — du darfst das.
                  </p>
                </CardContent>
              </Card>
            </Reveal>
          )}

          {state.right?.type === "new" && (
            <Reveal delay={0.5} className="w-full">
              <Card className="w-full border-primary/30">
                <CardContent className="space-y-3 pt-(--card-spacing)">
                  {suggestedRight.accepted ? (
                    <>
                      <SectionLabel>Zu deinen Rechten hinzugefügt</SectionLabel>
                      <div className="flex items-start gap-2 text-left">
                        <Check className="mt-1 size-4 shrink-0 text-primary" />
                        <p className="text-base leading-relaxed text-foreground">
                          {suggestedRight.text}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <SectionLabel>Ein neues Recht für dich</SectionLabel>
                      <p className="text-left text-sm text-muted-foreground">
                        Dieses Nein zeigt eine Grenze, die du dir schriftlich
                        geben kannst. Du kannst den Satz noch anpassen:
                      </p>
                      <Textarea
                        value={suggestedRight.text}
                        onChange={(e) => suggestedRight.setText(e.target.value)}
                        maxLength={300}
                        disabled={suggestedRight.pending}
                        className="min-h-[100px] resize-y"
                      />
                      <FormError message={suggestedRight.error} />
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={suggestedRight.pending || !suggestedRight.text.trim()}
                        onClick={() => void suggestedRight.accept()}
                      >
                        {suggestedRight.pending
                          ? "Wird hinzugefügt …"
                          : "Zu meinem Bill of Rights hinzufügen"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </Reveal>
          )}

          <div className="flex w-full flex-col gap-3 pt-4">
            {state.mode === "practice" && (
              <Button className="w-full gap-2" size="lg" onClick={nextScenario}>
                <RefreshCw className="size-4" /> Nächstes Szenario
              </Button>
            )}
            <Button
              variant={state.mode === "practice" ? "outline" : "default"}
              className="w-full"
              size="lg"
              render={<Link href="/booster" />}
            >
              Zurück zur {PAGE_TITLES.booster}
            </Button>
            {suggestedRight.accepted && (
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                render={<Link href="/me/bill-of-rights" />}
              >
                Meine Rechte ansehen
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Hell-yes-Check (nur echte Situation) ────────────────

  if (state.phase === "hellyes") {
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 einblenden">
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot expression="curious" size="md" />
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Hand aufs Herz:
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Ist diese Anfrage ein <span className="font-medium text-foreground">„Hell yes!“</span> für
              dich?
            </p>
          </div>

          <Card className="w-full">
            <CardContent className="pt-(--card-spacing)">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {state.situation}
              </p>
            </CardContent>
          </Card>

          {state.hellYes ? (
            <Card className="w-full border-primary/30">
              <CardContent className="space-y-4 pt-(--card-spacing)">
                <p className="text-base leading-relaxed text-foreground">
                  Dann brauchst du gar kein Nein — sag von Herzen Ja und
                  genieß es. Genau dafür machst du das ja: damit dein Ja
                  wieder etwas bedeutet.
                </p>
                <div className="flex flex-col gap-2">
                  <Button className="w-full" size="lg" render={<Link href="/booster" />}>
                    Fertig für heute
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => dispatch({ type: "draftStarted" })}
                  >
                    Trotzdem ein Nein formulieren
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                size="lg"
                onClick={() => dispatch({ type: "draftStarted" })}
              >
                Nein — also ist es ein Nein
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={() => dispatch({ type: "hellYesConfirmed" })}
              >
                Ja, eigentlich schon
              </Button>
            </div>
          )}
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // ── Render: Übungsszenario ──────────────────────────────────────

  if (state.phase === "scenario") {
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 einblenden">
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot expression={state.scenarioPending ? "curious" : "smile"} size="md" />
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Dein Übungsszenario
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Stell dir die Situation kurz richtig vor — und dann formulierst
              du dein Nein.
            </p>
          </div>

          <Card className="w-full">
            <CardContent className="pt-(--card-spacing)">
              {state.scenarioPending ? (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <p className="text-base text-muted-foreground motion-safe:animate-pulse">
                    Ich denk mir gerade eine Situation für dich aus …
                  </p>
                  <span className="flex gap-1.5" aria-hidden="true">
                    <span className="size-2 rounded-full bg-primary/60 motion-safe:animate-pulse" />
                    <span className="size-2 rounded-full bg-primary/60 motion-safe:animate-pulse [animation-delay:150ms]" />
                    <span className="size-2 rounded-full bg-primary/60 motion-safe:animate-pulse [animation-delay:300ms]" />
                  </span>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                  {state.situation}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              size="lg"
              disabled={state.scenarioPending || !state.situation}
              onClick={() => dispatch({ type: "draftStarted" })}
            >
              Mein Nein formulieren
            </Button>
            {state.rerolls < MAX_REROLLS && (
              <Button
                variant="outline"
                className="w-full gap-2"
                disabled={state.scenarioPending}
                onClick={() => {
                  dispatch({ type: "rerolled" });
                  void loadScenario(state.seenScenarios);
                }}
              >
                <RefreshCw className="size-4" /> Anderes Szenario
              </Button>
            )}
          </div>
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // ── Render: Nein-Entwurf ────────────────────────────────────────

  if (state.phase === "draft") {
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 einblenden">
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot expression="smile" size="md" />
            <p className="text-base leading-relaxed text-muted-foreground">
              {state.revisionUsed
                ? "Noch ein Anlauf — nimm dir aus dem Feedback mit, was für dich passt."
                : "Schreib dein Nein so, wie du es wirklich sagen oder abschicken würdest. Danach schauen wir gemeinsam drauf."}
            </p>
          </div>

          {/* Situation als Kontext */}
          <Card className="w-full">
            <CardContent className="pt-(--card-spacing)">
              <SectionLabel className="mb-1">
                {state.mode === "real" ? "Darum geht es" : "Das Szenario"}
              </SectionLabel>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {state.situation}
              </p>
            </CardContent>
          </Card>

          {/* Error banner */}
          <FormError message={state.error} />

          {/* ── Form ────────────────────────────────────────────── */}
          <form className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="draft" className="text-base font-medium">
                Dein Nein:
              </Label>
              <Textarea
                id="draft"
                name="draft"
                value={state.draft}
                onChange={(e) =>
                  dispatch({ type: "draftEdited", text: e.target.value })
                }
                placeholder={
                  state.mode === "real"
                    ? "Zum Beispiel: Danke, dass du an mich denkst — das freut mich wirklich. Leider passt es diesmal nicht bei mir."
                    : undefined
                }
                rows={5}
                required
                maxLength={5000}
                disabled={state.saving}
                className="min-h-[140px] resize-y"
              />
            </div>

            <Button
              type="button"
              className="w-full gap-2"
              size="lg"
              disabled={state.saving || !state.draft.trim()}
              onClick={() => void handleDraftSubmit()}
            >
              {state.saving
                ? "Wird gespeichert …"
                : state.revisionUsed && state.entryId
                  ? "Nochmal checken lassen"
                  : "Auf den Blueprint legen"}
            </Button>
          </form>
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // ── Render: Situation beschreiben (echter Modus) ────────────────

  if (state.phase === "situation") {
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 einblenden">
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot expression="smile" size="md" />
            <p className="text-base leading-relaxed text-muted-foreground">
              Erzähl kurz, worum es geht — wir bauen dein Nein dann Schritt
              für Schritt zusammen.
            </p>
          </div>

          {/* Denk-Pause: die Zeit-gewinnen-Strategie auch für Wiederkehrer
              sichtbar, nicht nur im Intro. */}
          <Card className="w-full bg-muted/30">
            <CardContent className="pt-(--card-spacing)">
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">
                  Noch nicht geantwortet?
                </span>{" "}
                Du darfst dir Zeit nehmen: „Da muss ich kurz drüber
                nachdenken.“ Entscheide in Ruhe — und formuliere dein Nein
                erst, wenn du sicher bist.
              </p>
            </CardContent>
          </Card>

          <form className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="situation" className="text-base font-medium">
                Wer bittet dich um was?
              </Label>
              <Textarea
                id="situation"
                name="situation"
                value={state.situation}
                onChange={(e) =>
                  dispatch({ type: "situationEdited", text: e.target.value })
                }
                placeholder="Zum Beispiel: Meine Kollegin fragt, ob ich am Samstag ihre Schicht übernehme. Ich hatte mir das Wochenende eigentlich freigehalten …"
                rows={5}
                required
                maxLength={5000}
                className="min-h-[160px] resize-y"
              />
            </div>

            <Button
              type="button"
              className="w-full gap-2"
              size="lg"
              disabled={!state.situation.trim()}
              onClick={() => dispatch({ type: "situationDone" })}
            >
              Weiter
            </Button>
          </form>
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // ── Render: Modus-Wahl (Einstieg) ───────────────────────────────

  return (
    <div className="flex min-h-svh flex-col">
      {header}
      {/* Reine Opacity ist hier nicht nur die Grammatik (KAN-53), sondern
          Bedingung — ModuleIcon misst seinen Rect beim Mount. Warum ein Slide
          die Landung des Zoom-Klons verfehlen ließe, steht einmal im Kopf von
          components/booster/booster-flug.tsx. */}
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 einblenden">
        {/* Signatur vor dem Entwurfs-Hinweis: der Flug-Klon fliegt auf einen
            vorausberechneten Landeplatz (lib/kopfwetter/flug.ts → LANDE_Y). Stünde
            der Banner darüber, säße das Icon bei vorhandenem Entwurf um
            Bannerhöhe + gap-6 tiefer und die Landung ginge daneben. */}
        <div className="flex flex-col items-center gap-3 text-center">
          <ModuleIcon variant="sayingNo" />
          <p className="text-base leading-relaxed text-muted-foreground">
            Schön, dass du da bist. Womit wollen wir üben?
          </p>
        </div>

        {/* Draft restore prompt */}
        {pendingDraft && (
          <DraftRestoreBanner onRestore={restoreDraft} onDiscard={clearDraft} />
        )}

        <button
          type="button"
          className="w-full text-left"
          onClick={() => dispatch({ type: "modeChosen", mode: "real" })}
        >
          <Card className="w-full transition-colors hover:bg-muted/40">
            <CardContent className="space-y-1 pt-(--card-spacing)">
              <p className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
                <MessageCircleQuestion className="size-5 text-primary" />
                Echte Situation
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Du musst gerade wirklich zu etwas Nein sagen? Wir formulieren
                es zusammen — Wort für Wort.
              </p>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          className="w-full text-left"
          onClick={() => {
            dispatch({ type: "modeChosen", mode: "practice" });
            void loadScenario(state.seenScenarios);
          }}
        >
          <Card className="w-full transition-colors hover:bg-muted/40">
            <CardContent className="space-y-1 pt-(--card-spacing)">
              <p className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
                <RefreshCw className="size-5 text-primary" />
                Übungsmodus
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Kein akuter Fall? Trainiere an einem realistischen
                Beispiel-Szenario — so oft du magst.
              </p>
            </CardContent>
          </Card>
        </button>

        <div className="h-8" />
      </div>
    </div>
  );
}
