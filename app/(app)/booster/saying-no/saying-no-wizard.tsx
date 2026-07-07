"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  Copy,
  MessageCircleQuestion,
  RefreshCw,
  ShieldOff,
  X,
} from "lucide-react";

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
import { SayingNoIntroMascot } from "@/components/recipes/saying-no-intro-mascot";
import { Mascot } from "@/components/brand/mascot";
import { PAGE_TITLES } from "@/lib/content/labels";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { useScrollTopOnChange } from "@/lib/hooks/use-scroll-top-on-change";
import { useFormDraft } from "@/lib/hooks/use-form-draft";
import { markRecipeIntroSeenAction } from "@/app/(app)/recipes/actions";
import type { SayingNoChecklist } from "@/lib/types/db-json";
import { cn } from "@/lib/utils";

import { SAYING_NO_LAYERS, STATIC_SCENARIOS } from "./blueprint";
import {
  acceptSuggestedRightAction,
  saveFinalNoAction,
  saveSayingNoEntryAction,
} from "./actions";

const INTRO_CARDS = getRecipeIntro("saying-no") ?? [];

const AI_FALLBACK_MESSAGE =
  "Das Feedback hat gerade nicht geklappt. Dein Nein ist gespeichert — versuch es gleich noch einmal.";

/** Client-Cap fürs „Anderes Szenario“-Reroll, schützt das Stunden-Kontingent. */
const MAX_REROLLS = 3;

type Mode = "real" | "practice";

type Draft = {
  mode: Mode | null;
  situation: string;
  draft: string;
};

/** Antwort-Shape von /api/saying-no-coach (mode "feedback"). */
type ChecklistItem = { pass: boolean; note: string };
type FeedbackChecklist = Record<keyof SayingNoChecklist, ChecklistItem>;
type RightSuggestion =
  | { type: "existing"; id: string; text: string }
  | { type: "new"; text: string }
  | null;

type Phase =
  | "mode"
  | "situation"
  | "hellyes"
  | "scenario"
  | "draft"
  | "analyzing"
  | "feedback"
  | "final";

/** Reihenfolge der Checklist-Zeilen = Reihenfolge der Blueprint-Schichten. */
const CHECKLIST_KEYS = SAYING_NO_LAYERS.map((l) => l.key);

export function SayingNoWizard({ introSeen }: { introSeen: boolean }) {
  // Hybrid-Intro (Muster Things-Got-Messy-Wizard)
  const [introDismissed, setIntroDismissed] = useState(false);

  const [phase, setPhase] = useState<Phase>("mode");
  useScrollTopOnChange(phase);

  const [mode, setMode] = useState<Mode | null>(null);

  // Echte Situation bzw. Übungsszenario
  const [situation, setSituation] = useState("");
  const [hellYesAnswered, setHellYesAnswered] = useState<"yes" | null>(null);
  const [scenarioSource, setScenarioSource] = useState<"ai" | "static">("static");
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [seenScenarios, setSeenScenarios] = useState<string[]>([]);
  const [rerollCount, setRerollCount] = useState(0);

  // Nein-Entwurf
  const [draftText, setDraftText] = useState("");
  const [blueprintOpen, setBlueprintOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** true, sobald „Nochmal selbst umformulieren“ benutzt wurde (max. 1×). */
  const [revisionUsed, setRevisionUsed] = useState(false);

  // KI-Feedback
  const [entryId, setEntryId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [checklist, setChecklist] = useState<FeedbackChecklist | null>(null);
  const [improvedText, setImprovedText] = useState("");
  const [improvedOriginal, setImprovedOriginal] = useState<string | null>(null);
  const [right, setRight] = useState<RightSuggestion>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Finales Nein + Copy-Button
  const [finalNo, setFinalNo] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Editierbarer Neues-Recht-Vorschlag + Übernahme-Status
  const [suggestionText, setSuggestionText] = useState("");
  const [acceptPending, setAcceptPending] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  // Offline draft safety net
  const { pendingDraft, saveDraft, clearDraft, dismissPendingDraft } =
    useFormDraft<Draft>("saying-no");

  const restoreDraft = () => {
    if (pendingDraft) {
      const restoredMode =
        pendingDraft.mode === "real" || pendingDraft.mode === "practice"
          ? pendingDraft.mode
          : null;
      setMode(restoredMode);
      setSituation(pendingDraft.situation ?? "");
      setDraftText(pendingDraft.draft ?? "");
      if (restoredMode && pendingDraft.situation) {
        setPhase("draft");
      }
    }
    dismissPendingDraft();
  };

  const currentDraft = (): Draft => ({
    mode,
    situation,
    draft: draftText,
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

  async function loadScenario(seen: string[]) {
    setScenarioLoading(true);
    setPhase("scenario");
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
        setSituation(data.scenario.trim());
        setScenarioSource("ai");
        setSeenScenarios([...seen, data.scenario.trim()]);
      } else {
        const fallback = pickStaticScenario(seen);
        setSituation(fallback);
        setScenarioSource("static");
        setSeenScenarios([...seen, fallback]);
      }
    } catch {
      const fallback = pickStaticScenario(seen);
      setSituation(fallback);
      setScenarioSource("static");
      setSeenScenarios([...seen, fallback]);
    } finally {
      setScenarioLoading(false);
    }
  }

  // ── KI-Feedback ─────────────────────────────────────────────────
  // Der Eintrag ist zu diesem Zeitpunkt bereits gespeichert; die Route lädt
  // Texte + Rechte serverseitig nach — der Client schickt nur die entryId.
  // Fehler landen als aiError auf dem Feedback-Screen (Retry möglich).

  async function runFeedback(id: string) {
    setAiError(null);
    setChecklist(null);
    setComment("");
    setImprovedOriginal(null);
    setPhase("analyzing");
    try {
      const res = await fetch("/api/saying-no-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "feedback", entryId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error ?? AI_FALLBACK_MESSAGE);
        setPhase("feedback");
        return;
      }
      setComment(typeof data.comment === "string" ? data.comment : "");
      setChecklist(isValidChecklist(data.checklist) ? data.checklist : null);
      const improved =
        typeof data.improved === "string" && data.improved.trim()
          ? data.improved.trim()
          : null;
      setImprovedOriginal(improved);
      setImprovedText(improved ?? "");
      setRight(data.right ?? null);
      if (data.right?.type === "new") {
        setSuggestionText(data.right.text ?? "");
      }
      setPhase("feedback");
    } catch {
      setAiError(AI_FALLBACK_MESSAGE);
      setPhase("feedback");
    }
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
    setSubmitting(true);
    setError(null);

    // No connection — keep the entry as a local draft instead of losing it.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      saveDraft(currentDraft());
      setSubmitting(false);
      setError(
        "Du bist offline – dein Nein wurde als Entwurf gesichert. Sobald du wieder online bist, kannst du es abschließen.",
      );
      return;
    }

    // Zweitversuch: der Eintrag existiert schon → nur draft2 nachtragen,
    // dann die zweite (und letzte) Feedback-Runde starten.
    if (entryId) {
      try {
        const fd = new FormData();
        fd.set("entryId", entryId);
        fd.set("draft2", draftText);
        const result = await saveFinalNoAction({ error: null, success: false }, fd);
        setSubmitting(false);
        if (result.error) {
          setError(result.error);
          return;
        }
        void runFeedback(entryId);
      } catch {
        setSubmitting(false);
        setError("Speichern fehlgeschlagen. Versuch es noch einmal.");
      }
      return;
    }

    const formData = new FormData();
    formData.set("mode", mode ?? "");
    formData.set("situation", situation);
    formData.set("draft", draftText);
    if (mode === "practice") {
      formData.set("scenario_source", scenarioSource);
    }
    if (mode === "real") {
      formData.set("hell_yes", hellYesAnswered === "yes" ? "true" : "false");
    }

    try {
      const result = await saveSayingNoEntryAction(
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
      void runFeedback(result.entryId);
    } catch {
      // Network error mid-request — preserve the entry as a draft.
      saveDraft(currentDraft());
      setSubmitting(false);
      setError(
        "Speichern fehlgeschlagen – dein Nein wurde als Entwurf gesichert. Versuch es später noch einmal.",
      );
    }
  }

  // ── Finales Nein festlegen ──────────────────────────────────────

  function goFinal(text: string, source: "own" | "ai" | "edited") {
    const chosen = text.trim();
    if (!chosen) return;
    setFinalNo(chosen);
    setCopied(false);
    setCopyError(null);
    setPhase("final");

    // Persistieren im Hintergrund — der Abschluss-Screen wartet nicht darauf.
    if (entryId) {
      const fd = new FormData();
      fd.set("entryId", entryId);
      fd.set("final_no", chosen);
      fd.set("final_source", source);
      void saveFinalNoAction({ error: null, success: false }, fd).catch(() => {
        /* Eintrag existiert bereits mit draft — kein harter Fehler nötig. */
      });
    }
  }

  async function copyFinalNo() {
    setCopyError(null);
    try {
      if (!navigator.clipboard || !window.isSecureContext) {
        throw new Error("clipboard unavailable");
      }
      await navigator.clipboard.writeText(finalNo);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("Kopieren klappt hier nicht — markiere den Text einfach selbst.");
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

  // ── Übungsmodus: nächstes Szenario ──────────────────────────────

  function nextScenario() {
    setEntryId(null);
    setDraftText("");
    setRevisionUsed(false);
    setComment("");
    setChecklist(null);
    setImprovedText("");
    setImprovedOriginal(null);
    setRight(null);
    setAiError(null);
    setFinalNo("");
    setCopied(false);
    setCopyError(null);
    setSuggestionText("");
    setAccepted(false);
    setAcceptError(null);
    setError(null);
    setRerollCount(0);
    void loadScenario(seenScenarios);
  }

  // ── Render: Intro-Sequenz (erster Besuch) ───────────────────────

  const handleIntroSeen = () => {
    setIntroDismissed(true);
    void markRecipeIntroSeenAction("saying-no");
  };

  if (!introSeen && !introDismissed && INTRO_CARDS.length > 0) {
    return (
      <div className="flex min-h-svh flex-col">
        <SubPageHeader backHref="/booster" title={PAGE_TITLES.sayingNo} />
        <div className="flex flex-1 flex-col justify-center">
          <RecipeIntro
            cards={INTRO_CARDS}
            onComplete={handleIntroSeen}
            onSkip={handleIntroSeen}
            renderMascot={(index) => <SayingNoIntroMascot index={index} />}
          />
        </div>
      </div>
    );
  }

  const header = (
    <SubPageHeader
      backHref="/booster"
      title={PAGE_TITLES.sayingNo}
      action={
        INTRO_CARDS.length > 0 ? <IntroInfoButton cards={INTRO_CARDS} /> : undefined
      }
    />
  );

  // ── Render: Feedback läuft ──────────────────────────────────────

  if (phase === "analyzing") {
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-6 animate-in fade-in duration-500">
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

  if (phase === "feedback") {
    const ownDraft = draftText.trim();
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {aiError ? (
            <>
              <div className="flex flex-col items-center gap-3 text-center">
                <Mascot expression="sorrowMild" size="md" />
              </div>
              <Card className="w-full">
                <CardContent className="space-y-3 pt-(--card-spacing)">
                  <p className="text-base leading-relaxed text-muted-foreground">
                    {aiError}
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

              {comment && (
                <Reveal delay={0.15} className="w-full">
                  <Card className="w-full">
                    <CardContent className="pt-(--card-spacing)">
                      <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                        {comment}
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

              {improvedOriginal !== null && (
                <Reveal delay={0.55} className="w-full">
                  <Card className="w-full border-primary/30">
                    <CardContent className="space-y-3 pt-(--card-spacing)">
                      <p className="text-xs font-medium uppercase tracking-wide text-primary">
                        So könnte dein Nein klingen
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Du kannst die Version noch anpassen, bevor du sie
                        übernimmst:
                      </p>
                      <Textarea
                        value={improvedText}
                        onChange={(e) => setImprovedText(e.target.value)}
                        maxLength={5000}
                        rows={4}
                        className="min-h-[120px] resize-y"
                      />
                      <Button
                        className="w-full"
                        disabled={!improvedText.trim()}
                        onClick={() =>
                          goFinal(
                            improvedText,
                            improvedText.trim() === improvedOriginal ? "ai" : "edited",
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
                {!revisionUsed && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setRevisionUsed(true);
                      setError(null);
                      setPhase("draft");
                    }}
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

  if (phase === "final") {
    return (
      <div className="flex min-h-svh flex-col items-center px-4 py-10">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CompletionCelebration />

          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              Dein Nein steht.
            </h1>
            <p className="text-muted-foreground">
              {mode === "real"
                ? "Jetzt musst du es nur noch aussprechen — oder abschicken."
                : "Mit jedem geübten Nein wird das echte leichter."}
            </p>
          </div>

          <Card className="w-full border-primary/30">
            <CardContent className="space-y-3 pt-(--card-spacing)">
              <p className="whitespace-pre-wrap text-left text-base leading-relaxed text-foreground">
                {finalNo}
              </p>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => void copyFinalNo()}
              >
                {copied ? (
                  <>
                    <Check className="size-4 text-primary" /> Kopiert!
                  </>
                ) : (
                  <>
                    <Copy className="size-4" /> Nein kopieren
                  </>
                )}
              </Button>
              {copyError && (
                <p className="text-left text-sm text-muted-foreground">{copyError}</p>
              )}
            </CardContent>
          </Card>

          {right?.type === "existing" && (
            <Reveal delay={0.5} className="w-full">
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
                    Dein Nein setzt genau dieses Recht um — du darfst das.
                  </p>
                </CardContent>
              </Card>
            </Reveal>
          )}

          {right?.type === "new" && (
            <Reveal delay={0.5} className="w-full">
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
                        Dieses Nein zeigt eine Grenze, die du dir schriftlich
                        geben kannst. Du kannst den Satz noch anpassen:
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

          <div className="flex w-full flex-col gap-3 pt-4">
            {mode === "practice" && (
              <Button className="w-full gap-2" size="lg" onClick={nextScenario}>
                <RefreshCw className="size-4" /> Nächstes Szenario
              </Button>
            )}
            <Button
              variant={mode === "practice" ? "outline" : "default"}
              className="w-full"
              size="lg"
              render={<Link href="/booster" />}
            >
              Zurück zur {PAGE_TITLES.booster}
            </Button>
            {accepted && (
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

  if (phase === "hellyes") {
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                {situation}
              </p>
            </CardContent>
          </Card>

          {hellYesAnswered === "yes" ? (
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
                    onClick={() => setPhase("draft")}
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
                onClick={() => setPhase("draft")}
              >
                Nein — also ist es ein Nein
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                onClick={() => setHellYesAnswered("yes")}
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

  if (phase === "scenario") {
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot expression="smile" size="md" />
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
              {scenarioLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                  {situation}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              size="lg"
              disabled={scenarioLoading || !situation}
              onClick={() => setPhase("draft")}
            >
              Mein Nein formulieren
            </Button>
            {rerollCount < MAX_REROLLS && (
              <Button
                variant="outline"
                className="w-full gap-2"
                disabled={scenarioLoading}
                onClick={() => {
                  setRerollCount((c) => c + 1);
                  void loadScenario(seenScenarios);
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

  if (phase === "draft") {
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot expression="smile" size="md" />
            <p className="text-base leading-relaxed text-muted-foreground">
              {revisionUsed
                ? "Noch ein Anlauf — nimm dir aus dem Feedback mit, was für dich passt."
                : "Schreib dein Nein so, wie du es wirklich sagen oder abschicken würdest. Danach schauen wir gemeinsam drauf."}
            </p>
          </div>

          {/* Situation als Kontext */}
          <Card className="w-full">
            <CardContent className="pt-(--card-spacing)">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {mode === "real" ? "Darum geht es" : "Das Szenario"}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {situation}
              </p>
            </CardContent>
          </Card>

          {/* Einklappbare 4-Schichten-Referenz */}
          <Card className="w-full">
            <CardContent className="pt-(--card-spacing)">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left"
                onClick={() => setBlueprintOpen((o) => !o)}
                aria-expanded={blueprintOpen}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ShieldOff className="size-4 text-primary" />
                  Die vier Schichten eines guten Neins
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    blueprintOpen && "rotate-180",
                  )}
                />
              </button>
              {blueprintOpen && (
                <div className="mt-3 space-y-3 border-t pt-3">
                  {SAYING_NO_LAYERS.map((layer, i) => (
                    <div key={layer.key} className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground">
                        {i + 1}. {layer.title}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {layer.rule}
                      </p>
                      <p className="text-sm italic leading-relaxed text-muted-foreground">
                        {layer.example}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error banner */}
          <FormError message={error} />

          {/* ── Form ────────────────────────────────────────────── */}
          <form className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="draft" className="text-base font-medium">
                Dein Nein:
              </Label>
              <Textarea
                id="draft"
                name="draft"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder="Zum Beispiel: Danke, dass du an mich denkst — das freut mich wirklich. Leider passt es diesmal nicht bei mir."
                rows={5}
                required
                maxLength={5000}
                disabled={submitting}
                className="min-h-[140px] resize-y"
              />
            </div>

            <Button
              type="button"
              className="w-full gap-2"
              size="lg"
              disabled={submitting || !draftText.trim()}
              onClick={() => void handleDraftSubmit()}
            >
              {submitting
                ? "Wird gespeichert …"
                : revisionUsed && entryId
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

  if (phase === "situation") {
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot expression="smile" size="md" />
            <p className="text-base leading-relaxed text-muted-foreground">
              Erzähl kurz, worum es geht — wir bauen dein Nein dann Schritt
              für Schritt zusammen.
            </p>
          </div>

          <form className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="situation" className="text-base font-medium">
                Wer bittet dich um was?
              </Label>
              <Textarea
                id="situation"
                name="situation"
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
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
              disabled={!situation.trim()}
              onClick={() => {
                setHellYesAnswered(null);
                setPhase("hellyes");
              }}
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
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Draft restore prompt */}
        {pendingDraft && (
          <DraftRestoreBanner onRestore={restoreDraft} onDiscard={clearDraft} />
        )}

        <div className="flex flex-col items-center gap-3 text-center">
          <Mascot expression="smile" size="md" />
          <p className="text-base leading-relaxed text-muted-foreground">
            Schön, dass du da bist. Womit wollen wir üben?
          </p>
        </div>

        <button
          type="button"
          className="w-full text-left"
          onClick={() => {
            setMode("real");
            setSituation("");
            setPhase("situation");
          }}
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
            setMode("practice");
            setSituation("");
            setRerollCount(0);
            void loadScenario(seenScenarios);
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
