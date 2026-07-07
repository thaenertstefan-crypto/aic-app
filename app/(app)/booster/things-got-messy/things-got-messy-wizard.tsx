"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FormError } from "@/components/ui/form-error";
import { CompletionCelebration } from "@/components/ui/completion-celebration";
import { Reveal } from "@/components/ui/reveal";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { DraftRestoreBanner } from "@/components/offline/draft-restore-banner";
import { RecipeIntro } from "@/components/recipes/recipe-intro";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { ThingsGotMessyIntroMascot } from "@/components/recipes/things-got-messy-intro-mascot";
import { Mascot } from "@/components/brand/mascot";
import { PAGE_TITLES } from "@/lib/content/labels";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { useScrollTopOnChange } from "@/lib/hooks/use-scroll-top-on-change";
import { useFormDraft } from "@/lib/hooks/use-form-draft";
import { markRecipeIntroSeenAction } from "@/app/(app)/recipes/actions";

import {
  acceptSuggestedRightAction,
  saveGuiltFeedbackAction,
  saveMessyMomentAction,
} from "./actions";

const INTRO_CARDS = getRecipeIntro("things-got-messy") ?? [];

const AI_FALLBACK_MESSAGE =
  "Die Auswertung hat gerade nicht geklappt. Dein Eintrag ist gespeichert — versuch es gleich noch einmal.";

type Draft = {
  messy_when: string;
};

/** Antwort-Shape von /api/messy-guilt-coach. */
type RightSuggestion =
  | { type: "existing"; id: string; text: string }
  | { type: "new"; text: string }
  | null;

type Phase = "reflect" | "analyzing" | "result";

export function ThingsGotMessyWizard({ introSeen }: { introSeen: boolean }) {
  // Hybrid-Intro (Muster Overthinking-Wizard)
  const [introDismissed, setIntroDismissed] = useState(false);

  const [phase, setPhase] = useState<Phase>("reflect");
  useScrollTopOnChange(phase);

  // Reflexions-Feld
  const [messyWhen, setMessyWhen] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // KI-Ergebnis
  const [entryId, setEntryId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [guilt, setGuilt] = useState<"healthy" | "unhealthy" | null>(null);
  const [rules, setRules] = useState<string | null>(null);
  const [right, setRight] = useState<RightSuggestion>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // „Fühlt sich das stimmig an?"-Feedback
  const [feedback, setFeedback] = useState<"agree" | "disagree" | null>(null);
  const [feedbackPending, setFeedbackPending] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Editierbarer Neues-Recht-Vorschlag + Übernahme-Status
  const [suggestionText, setSuggestionText] = useState("");
  const [acceptPending, setAcceptPending] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  // Offline draft safety net
  const { pendingDraft, saveDraft, clearDraft, dismissPendingDraft } =
    useFormDraft<Draft>("things-got-messy");

  const restoreDraft = () => {
    if (pendingDraft) {
      // Alte Drafts (mit conflicting_rules/guilt_type) restoren kompatibel —
      // es wird nur noch messy_when gelesen.
      setMessyWhen(pendingDraft.messy_when ?? "");
    }
    dismissPendingDraft();
  };

  const currentDraft = (): Draft => ({
    messy_when: messyWhen,
  });

  // ── KI-Auswertung ───────────────────────────────────────────────
  // Der Eintrag ist zu diesem Zeitpunkt bereits gespeichert; die Route lädt
  // Texte + Rechte serverseitig nach — der Client schickt nur die entryId.
  // Fehler landen als aiError auf dem Ergebnis-Screen (Retry möglich).

  async function runAnalysis(id: string) {
    setAiError(null);
    // Retry darf keine Werte des vorherigen Versuchs behalten.
    setGuilt(null);
    setRules(null);
    setPhase("analyzing");
    try {
      const res = await fetch("/api/messy-guilt-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error ?? AI_FALLBACK_MESSAGE);
        setPhase("result");
        return;
      }
      setAnalysis(data.analysis ?? "");
      setGuilt(data.guilt === "healthy" || data.guilt === "unhealthy" ? data.guilt : null);
      setRules(typeof data.rules === "string" && data.rules ? data.rules : null);
      setRight(data.right ?? null);
      if (data.right?.type === "new") {
        setSuggestionText(data.right.text ?? "");
      }
      setPhase("result");
    } catch {
      setAiError(AI_FALLBACK_MESSAGE);
      setPhase("result");
    }
  }

  // ── Speichern → Auswertung ──────────────────────────────────────

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("messy_when", messyWhen);

    // No connection — keep the entry as a local draft instead of losing it.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      saveDraft(currentDraft());
      setSubmitting(false);
      setError(
        "Du bist offline – dein Eintrag wurde als Entwurf gesichert. Sobald du wieder online bist, kannst du ihn abschließen.",
      );
      return;
    }

    try {
      const result = await saveMessyMomentAction(
        { error: null, success: false, entryId: null },
        formData,
      );
      setSubmitting(false);

      if (result.error || !result.entryId) {
        setError(result.error ?? "Speichern fehlgeschlagen. Versuch es noch einmal.");
        return;
      }

      clearDraft();
      setEntryId(result.entryId);
      void runAnalysis(result.entryId);
    } catch {
      // Network error mid-request — preserve the entry as a draft.
      saveDraft(currentDraft());
      setSubmitting(false);
      setError(
        "Speichern fehlgeschlagen – dein Eintrag wurde als Entwurf gesichert. Versuch es später noch einmal.",
      );
    }
  }

  async function acceptRight() {
    setAcceptPending(true);
    setAcceptError(null);
    try {
      const fd = new FormData();
      fd.set("text", suggestionText);
      const res = await acceptSuggestedRightAction(
        { error: null, success: false },
        fd,
      );
      if (res.error) {
        setAcceptError(res.error);
      } else {
        setAccepted(true);
      }
    } catch {
      setAcceptError("Das hat gerade nicht geklappt. Versuch es noch einmal.");
    } finally {
      setAcceptPending(false);
    }
  }

  async function sendFeedback(value: "agree" | "disagree") {
    if (!entryId) return;
    setFeedbackPending(true);
    setFeedbackError(null);
    try {
      const fd = new FormData();
      fd.set("entryId", entryId);
      fd.set("feedback", value);
      const res = await saveGuiltFeedbackAction({ error: null, success: false }, fd);
      if (res.error) {
        setFeedbackError(res.error);
      } else {
        setFeedback(value);
      }
    } catch {
      setFeedbackError("Das hat gerade nicht geklappt. Versuch es noch einmal.");
    } finally {
      setFeedbackPending(false);
    }
  }

  // ── Render: Intro-Sequenz (erster Besuch) ───────────────────────

  const handleIntroSeen = () => {
    setIntroDismissed(true);
    void markRecipeIntroSeenAction("things-got-messy");
  };

  if (!introSeen && !introDismissed && INTRO_CARDS.length > 0) {
    return (
      <div className="flex min-h-svh flex-col">
        <SubPageHeader backHref="/booster" title={PAGE_TITLES.thingsGotMessy} />
        <div className="flex flex-1 flex-col justify-center">
          <RecipeIntro
            cards={INTRO_CARDS}
            onComplete={handleIntroSeen}
            onSkip={handleIntroSeen}
            renderMascot={(index) => <ThingsGotMessyIntroMascot index={index} />}
          />
        </div>
      </div>
    );
  }

  // ── Render: Auswertung läuft ────────────────────────────────────

  if (phase === "analyzing") {
    return (
      <div className="flex min-h-svh flex-col">
        <SubPageHeader backHref="/booster" title={PAGE_TITLES.thingsGotMessy} />
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-6 animate-in fade-in duration-500">
          <Mascot expression="curious" size="md" gazeX={0} />
          <p className="text-center text-base text-muted-foreground">
            Ich schau mir das kurz an …
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

  // ── Render: Ergebnis ────────────────────────────────────────────

  if (phase === "result") {
    return (
      <div className="flex min-h-svh flex-col items-center px-4 py-10">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CompletionCelebration />

          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              Das war der wichtigste Schritt.
            </h1>
            <p className="text-muted-foreground">
              Ehrlich hinzuschauen, statt dich zu verurteilen — genau darum
              geht&apos;s.
            </p>
          </div>

          {aiError ? (
            <Card className="w-full">
              <CardContent className="space-y-3 pt-(--card-spacing)">
                <p className="text-left text-base leading-relaxed text-muted-foreground">
                  {aiError}
                </p>
                {entryId && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => void runAnalysis(entryId)}
                  >
                    Nochmal versuchen
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {analysis && (
                <Reveal delay={0.4} className="w-full">
                  <Card className="w-full">
                    <CardContent className="space-y-3 pt-(--card-spacing)">
                      <p className="text-left font-heading text-sm font-semibold text-foreground">
                        Meine Einschätzung
                      </p>

                      <p className="whitespace-pre-wrap text-left text-base leading-relaxed text-foreground">
                        {analysis}
                      </p>

                      {rules && (
                        <p className="text-left text-base leading-relaxed text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Die zwei Regeln, die da gerungen haben:
                          </span>{" "}
                          {rules}
                        </p>
                      )}

                      {guilt && entryId && (
                        <div className="space-y-2 border-t pt-3">
                          {feedback ? (
                            <p className="text-left text-sm leading-relaxed text-muted-foreground">
                              {feedback === "agree" ? (
                                <>
                                  <Check className="mr-1 inline size-4 text-primary" />
                                  Danke dir — gut, wenn es sich stimmig anfühlt.
                                </>
                              ) : (
                                <>
                                  Danke, dass du ehrlich bist. Dein Gefühl zählt
                                  hier mehr als meine Vermutung — du kennst dich
                                  selbst am besten. Nimm aus der Analyse einfach
                                  das mit, was für dich passt.
                                </>
                              )}
                            </p>
                          ) : (
                            <>
                              <p className="text-left text-sm text-muted-foreground">
                                Fühlt sich das stimmig an?
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  className="flex-1"
                                  disabled={feedbackPending}
                                  onClick={() => void sendFeedback("agree")}
                                >
                                  Ja, passt
                                </Button>
                                <Button
                                  variant="outline"
                                  className="flex-1"
                                  disabled={feedbackPending}
                                  onClick={() => void sendFeedback("disagree")}
                                >
                                  Eher nicht
                                </Button>
                              </div>
                              <FormError message={feedbackError} />
                            </>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Reveal>
              )}

              {right?.type === "existing" && (
                <Reveal delay={0.7} className="w-full">
                  <Card className="w-full border-primary/30">
                    <CardContent className="space-y-2 pt-(--card-spacing)">
                      <p className="text-xs font-medium uppercase tracking-wide text-primary">
                        Du hast dir dieses Recht schon gegeben
                      </p>
                      <div className="flex items-start gap-2 text-left">
                        <Check className="mt-1 size-4 shrink-0 text-primary" />
                        <p className="text-base leading-relaxed text-foreground">
                          {right.text}
                        </p>
                      </div>
                      <p className="text-left text-sm text-muted-foreground">
                        Vielleicht musst du dich nur wieder daran erinnern.
                      </p>
                    </CardContent>
                  </Card>
                </Reveal>
              )}

              {right?.type === "new" && (
                <Reveal delay={0.7} className="w-full">
                  <Card className="w-full border-primary/30">
                    <CardContent className="space-y-3 pt-(--card-spacing)">
                      {accepted ? (
                        <>
                          <p className="text-xs font-medium uppercase tracking-wide text-primary">
                            Zu deinen Rechten hinzugefügt
                          </p>
                          <div className="flex items-start gap-2 text-left">
                            <Check className="mt-1 size-4 shrink-0 text-primary" />
                            <p className="text-base leading-relaxed text-foreground">
                              {suggestionText}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-medium uppercase tracking-wide text-primary">
                            Ein neues Recht für dich
                          </p>
                          <p className="text-left text-sm text-muted-foreground">
                            Du kannst es noch anpassen, bevor du es übernimmst:
                          </p>
                          <Textarea
                            value={suggestionText}
                            onChange={(e) => setSuggestionText(e.target.value)}
                            maxLength={300}
                            disabled={acceptPending}
                            className="min-h-[100px] resize-y"
                          />
                          <FormError message={acceptError} />
                          <Button
                            className="w-full"
                            disabled={acceptPending || !suggestionText.trim()}
                            onClick={() => void acceptRight()}
                          >
                            {acceptPending
                              ? "Wird hinzugefügt …"
                              : "Zu meinem Bill of Rights hinzufügen"}
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Reveal>
              )}
            </>
          )}

          <div className="flex w-full flex-col gap-3 pt-4">
            <Button className="w-full" size="lg" render={<Link href="/booster" />}>
              Zurück zur {PAGE_TITLES.booster}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              render={<Link href="/me/bill-of-rights" />}
            >
              Meine Rechte ansehen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Reflexion ───────────────────────────────────────────

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader
        backHref="/booster"
        title={PAGE_TITLES.thingsGotMessy}
        action={
          INTRO_CARDS.length > 0 ? (
            <IntroInfoButton cards={INTRO_CARDS} />
          ) : undefined
        }
      />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Draft restore prompt */}
        {pendingDraft && (
          <DraftRestoreBanner onRestore={restoreDraft} onDiscard={clearDraft} />
        )}

        {/* Begleiter + Einstieg */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Mascot expression="smile" size="md" />
          <p className="text-base leading-relaxed text-muted-foreground">
            Es ist messy geworden — das passiert. Erzähl einfach, was passiert
            ist — die Einordnung übernehmen wir danach gemeinsam.
          </p>
        </div>

        {/* Error banner */}
        <FormError message={error} />

        {/* ── Form ────────────────────────────────────────────────── */}
        <form className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="messy_when" className="text-base font-medium">
              Was ist passiert — und wo hat sich das Schuldgefühl gemeldet?
            </Label>
            <Textarea
              id="messy_when"
              name="messy_when"
              value={messyWhen}
              onChange={(e) => setMessyWhen(e.target.value)}
              placeholder="Zum Beispiel: Ich habe meiner Kollegin zugesagt auszuhelfen, obwohl ich eigentlich keine Zeit hatte. Auf dem Heimweg kam dann dieses nagende Gefühl …"
              rows={5}
              required
              disabled={submitting}
              className="min-h-[160px] resize-y"
            />
          </div>

          <Button
            type="button"
            className="w-full gap-2"
            size="lg"
            disabled={submitting || !messyWhen.trim()}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "Wird gespeichert …" : "Speichern & auswerten"}
          </Button>
        </form>

        {/* Bottom spacing */}
        <div className="h-8" />
      </div>
    </div>
  );
}
