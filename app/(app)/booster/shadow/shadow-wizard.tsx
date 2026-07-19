"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Flame, Footprints, Lock, NotebookPen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { DraftRestoreBanner } from "@/components/offline/draft-restore-banner";
import { RecipeIntro } from "@/components/recipes/recipe-intro";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { ShadowIntroMascot } from "@/components/recipes/shadow-intro-mascot";
import { Mascot } from "@/components/brand/mascot";
import { PAGE_TITLES } from "@/lib/content/labels";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { useScrollTopOnChange } from "@/lib/hooks/use-scroll-top-on-change";
import { useFormDraft } from "@/lib/hooks/use-form-draft";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { markRecipeIntroSeenAction } from "@/app/(app)/recipes/actions";

import { markShadowDoneAction, saveShadowEntryAction } from "./actions";

const INTRO_CARDS = getRecipeIntro("shadow") ?? [];

/** Dauer der Verbrenn-Animation (muss zur sh-burn-Keyframe-Dauer passen). */
const BURN_MS = 1600;

/** Rage-Walk-Prompts, rotieren alle 45 Sekunden. */
const WALK_PROMPTS = [
  "Sprich es aus — laut oder leise gemurmelt. Was hat sich angestaut?",
  "Wem würdest du am liebsten mal richtig die Meinung sagen — und was?",
  "Was genau hat dich verletzt? Sag es, wie es ist — unfair darf es sein.",
  "Und was noch? Meistens kommt hinter der ersten Wut noch eine zweite.",
  "Was davon frisst dich am meisten? Bleib ruhig einen Moment dort.",
];
const PROMPT_SECONDS = 45;

type Draft = { body: string };

type Phase = "mode" | "journal" | "walk" | "walkEnd" | "burning" | "done";
type Outcome = "kept" | "burned" | "walked";

export function ShadowWizard({ introSeen }: { introSeen: boolean }) {
  // Hybrid-Intro (Muster Things-Got-Messy-Wizard)
  const [introDismissed, setIntroDismissed] = useState(false);

  const [phase, setPhase] = useState<Phase>("mode");
  useScrollTopOnChange(phase);
  const reduced = useReducedMotion();

  // Schreibfläche
  const [body, setBody] = useState("");
  /** true, wenn die Schreibfläche nach einem Rage Walk geöffnet wurde. */
  const [afterWalk, setAfterWalk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Erster Tap auf „Verbrennen" fragt nach; zweiter führt aus. */
  const [confirmBurn, setConfirmBurn] = useState(false);

  // Rage Walk
  const [elapsed, setElapsed] = useState(0);
  /** Die Stoppuhr startet erst nach explizitem Tipp auf den Startknopf. */
  const [walkStarted, setWalkStarted] = useState(false);

  const [outcome, setOutcome] = useState<Outcome>("burned");

  // Offline draft safety net (nur fürs Behalten relevant; lokal auf dem Gerät)
  const { pendingDraft, saveDraft, clearDraft, dismissPendingDraft } =
    useFormDraft<Draft>("shadow");

  const restoreDraft = () => {
    if (pendingDraft) {
      setBody(pendingDraft.body ?? "");
      setPhase("journal");
    }
    dismissPendingDraft();
  };

  // ── Rage-Walk-Timer (läuft nur in der walk-Phase) ───────────────

  useEffect(() => {
    if (phase !== "walk" || !walkStarted) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase, walkStarted]);

  // „Verbrennen?"-Nachfrage nach kurzer Zeit zurücksetzen.
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
  }, []);

  // ── Aktionen ────────────────────────────────────────────────────

  async function keepEntry() {
    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.set("body", body);
    formData.set("mode", afterWalk ? "walk" : "journal");

    // No connection — keep the text as a local draft instead of losing it.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      saveDraft({ body });
      setSaving(false);
      setError(
        "Du bist offline – dein Text wurde als Entwurf gesichert. Sobald du wieder online bist, kannst du ihn behalten.",
      );
      return;
    }

    try {
      const result = await saveShadowEntryAction(
        { error: null, success: false },
        formData,
      );
      setSaving(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      clearDraft();
      setOutcome("kept");
      setPhase("done");
    } catch {
      saveDraft({ body });
      setSaving(false);
      setError(
        "Speichern fehlgeschlagen – dein Text wurde als Entwurf gesichert. Versuch es später noch einmal.",
      );
    }
  }

  function burnEntry() {
    if (!confirmBurn) {
      setConfirmBurn(true);
      confirmTimer.current = setTimeout(() => setConfirmBurn(false), 3500);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    clearDraft();
    setOutcome("burned");
    // Fortschritt abschließen — gespeichert wird bewusst NICHTS.
    void markShadowDoneAction().catch(() => {});

    if (reduced) {
      setBody("");
      setPhase("done");
      return;
    }
    setPhase("burning");
    window.setTimeout(() => {
      setBody("");
      setPhase("done");
    }, BURN_MS);
  }

  function finishWalkWithoutNote() {
    setOutcome("walked");
    void markShadowDoneAction().catch(() => {});
    setPhase("done");
  }

  // ── Render: Intro-Sequenz (erster Besuch) ───────────────────────

  const handleIntroSeen = () => {
    setIntroDismissed(true);
    void markRecipeIntroSeenAction("shadow");
  };

  if (!introSeen && !introDismissed && INTRO_CARDS.length > 0) {
    return (
      <div className="flex min-h-svh flex-col">
        <SubPageHeader backHref="/booster" title={PAGE_TITLES.shadow} />
        <div className="flex flex-1 flex-col justify-center">
          <RecipeIntro
            cards={INTRO_CARDS}
            onComplete={handleIntroSeen}
            onSkip={handleIntroSeen}
            renderMascot={(index) => <ShadowIntroMascot index={index} />}
          />
        </div>
      </div>
    );
  }

  const header = (
    <SubPageHeader
      backHref="/booster"
      title={PAGE_TITLES.shadow}
      action={
        INTRO_CARDS.length > 0 ? <IntroInfoButton cards={INTRO_CARDS} /> : undefined
      }
    />
  );

  // ── Render: Abschluss ───────────────────────────────────────────

  if (phase === "done") {
    return (
      <div className="flex min-h-svh flex-col items-center px-4 py-10">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Mascot expression="smile" size="md" />

          <div className="space-y-2">
            <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">
              {outcome === "kept" ? "Privat gespeichert." : "Losgelassen."}
            </h1>
            {outcome === "kept" ? (
              <p className="flex items-center justify-center gap-1.5 text-muted-foreground">
                <Lock className="size-4 shrink-0" />
                Mit Schloss im Journal — nur für dich.
              </p>
            ) : (
              <p className="text-muted-foreground">
                {outcome === "burned"
                  ? "Nichts wurde gespeichert — kein einziges Zeichen. Rausgelassen und losgelassen."
                  : "Gut rausgelassen. Nichts wurde gespeichert."}
              </p>
            )}
          </div>

          {/* Weiche Verzahnung — bewusst opt-in und ignorierbar. */}
          <Card className="w-full border-dashed">
            <CardContent className="space-y-2 pt-(--card-spacing)">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Wenn du magst, ein Gedanke zum Mitnehmen: Steckt hinter dem
                Ärger eine Grenze, die überschritten wurde? Dann könnte ein
                Blick in dein{" "}
                <Link
                  href="/me/bill-of-rights"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Bill of Rights
                </Link>{" "}
                oder eine Runde im{" "}
                <Link
                  href="/booster/saying-no"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {PAGE_TITLES.sayingNo}
                </Link>{" "}
                guttun. Musst du aber nicht — Rauslassen allein ist schon
                genug.
              </p>
            </CardContent>
          </Card>

          <div className="flex w-full flex-col gap-3 pt-2">
            <Button className="w-full" size="lg" render={<Link href="/booster" />}>
              Zurück zur {PAGE_TITLES.booster}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Schreibfläche (Shadow Journal) ──────────────────────

  if (phase === "journal" || phase === "burning") {
    const burning = phase === "burning";
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6 animate-in fade-in duration-500">
          <p className="flex items-center justify-center gap-1.5 text-center text-sm text-muted-foreground">
            <Lock className="size-3.5 shrink-0" />
            Niemand liest mit.
          </p>

          {/* Bewusst dunkle Fläche in beiden Themes: der Schatten-Raum. */}
          <Card
            className="border-zinc-700 bg-zinc-900"
            style={burning ? { animation: `sh-burn ${BURN_MS}ms ease-in forwards` } : undefined}
          >
            <CardContent className="py-2">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Lass alles raus. So hässlich, unfair und unfertig, wie es sich anfühlt — hier darf es genau so sein."
                maxLength={5000}
                disabled={saving || burning}
                autoFocus
                className="min-h-[45svh] resize-y border-0 bg-transparent text-base leading-relaxed text-zinc-100 shadow-none placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:border-0 dark:bg-transparent"
              />
            </CardContent>
          </Card>

          <FormError message={error} />

          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full gap-2"
              disabled={saving || burning || !body.trim()}
              onClick={() => void keepEntry()}
            >
              <Lock className="size-4" />
              {saving ? "Wird gespeichert …" : "Behalten — privat speichern"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full gap-2"
              disabled={saving || burning || !body.trim()}
              onClick={burnEntry}
            >
              <Flame className="size-4" />
              {confirmBurn ? "Wirklich verbrennen?" : "Verbrennen"}
            </Button>
          </div>
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // ── Render: Rage Walk ───────────────────────────────────────────

  if (phase === "walk") {
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const seconds = String(elapsed % 60).padStart(2, "0");
    const prompt =
      WALK_PROMPTS[Math.floor(elapsed / PROMPT_SECONDS) % WALK_PROMPTS.length];

    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-4 py-6 text-center animate-in fade-in duration-500">
          <p className="text-base leading-relaxed text-muted-foreground">
            Geh los — draußen oder im Kreis um den Küchentisch. Und sprich
            aus, was raus muss, wo dich niemand hört.
          </p>

          {walkStarted ? (
            <>
              <p
                className="font-heading text-6xl font-bold tabular-nums tracking-tight text-foreground"
                aria-label={`Bisher ${minutes} Minuten ${seconds} Sekunden`}
              >
                {minutes}:{seconds}
              </p>

              <Card className="w-full">
                <CardContent className="pt-(--card-spacing)">
                  <p
                    key={prompt}
                    className="text-base leading-relaxed text-foreground animate-in fade-in duration-700"
                  >
                    {prompt}
                  </p>
                </CardContent>
              </Card>

              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  setWalkStarted(false);
                  setPhase("walkEnd");
                }}
              >
                Ich bin fertig
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                setElapsed(0);
                setWalkStarted(true);
              }}
            >
              Los geht&apos;s
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Render: Rage Walk beendet ───────────────────────────────────

  if (phase === "walkEnd") {
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Mascot expression="happy" size="md" />
          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Gut rausgelassen.
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Wenn dabei etwas klar geworden ist, kannst du es noch
              festhalten — musst du aber nicht.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => {
                setAfterWalk(true);
                setPhase("journal");
              }}
            >
              <NotebookPen className="size-4" />
              Noch etwas aufschreiben
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={finishWalkWithoutNote}
            >
              Fertig für heute
            </Button>
          </div>
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
          <Mascot expression="curious" size="md" />
          <p className="text-base leading-relaxed text-muted-foreground">
            Etwas staut sich an? Dann lass es raus — auf deine Art.
          </p>
        </div>

        <button
          type="button"
          className="w-full text-left"
          onClick={() => {
            setAfterWalk(false);
            setPhase("journal");
          }}
        >
          <Card className="w-full transition-colors hover:bg-muted/40">
            <CardContent className="space-y-1 pt-(--card-spacing)">
              <p className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
                <NotebookPen className="size-5 text-primary" />
                Shadow Journal
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Eine leere, dunkle Seite. Kipp alles drauf — danach
                entscheidest du: behalten oder verbrennen.
              </p>
            </CardContent>
          </Card>
        </button>

        <button
          type="button"
          className="w-full text-left"
          onClick={() => {
            setElapsed(0);
            setPhase("walk");
          }}
        >
          <Card className="w-full transition-colors hover:bg-muted/40">
            <CardContent className="space-y-1 pt-(--card-spacing)">
              <p className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
                <Footprints className="size-5 text-primary" />
                Rage Walk
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Geh raus und sprich deinen Groll laut aus, wo dich niemand
                hört. Die App läuft mit — Timer und sanfte Fragen.
              </p>
            </CardContent>
          </Card>
        </button>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground/80">
          <Lock className="size-3 shrink-0" />
          Alles hier ist privat — die KI liest nie mit.
        </p>
        <div className="h-8" />
      </div>
    </div>
  );
}
