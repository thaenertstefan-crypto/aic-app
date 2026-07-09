"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Compass,
  FlaskConical,
  Plus,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { WantsIntroMascot } from "@/components/recipes/wants-intro-mascot";
import { Mascot } from "@/components/brand/mascot";
import { PAGE_TITLES } from "@/lib/content/labels";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { useScrollTopOnChange } from "@/lib/hooks/use-scroll-top-on-change";
import { useFormDraft } from "@/lib/hooks/use-form-draft";
import { markRecipeIntroSeenAction } from "@/app/(app)/recipes/actions";
import type { BetItem, WantItem } from "@/lib/types/db-json";
import { cn } from "@/lib/utils";

import {
  saveBetsAction,
  saveWantsAction,
  saveYinYangEntryAction,
} from "@/app/(app)/recipes/wants/actions";

const INTRO_CARDS = getRecipeIntro("wants") ?? [];

const AI_FALLBACK_MESSAGE =
  "Das Destillieren hat gerade nicht geklappt. Dein Audit ist gespeichert — du kannst deine Wants auch selbst formulieren.";

type Phase = "yin" | "yang" | "analyzing" | "hypotheses" | "bets" | "done";

type AuditDraft = {
  yin: string;
  yang: string;
  principles: string;
};

/** Eine Hypothese im Client-State — die id wird beim Bestätigen zur WantItem-id. */
type DraftWant = {
  id: string;
  text: string;
  valueId: string | null;
  valueLabel: string | null;
  reason: string | null;
  source: "ai" | "own";
};

/** Ein Bet-Vorschlag im Client-State; wantClientId zeigt auf DraftWant.id. */
type DraftBet = {
  id: string;
  text: string;
  wantClientId: string | null;
  selected: boolean;
  source: "ai" | "own";
};

/** Antwort-Shape von /api/wants-distiller. */
type DistillerResponse = {
  comment?: string;
  wants?: {
    text?: string;
    valueId?: string | null;
    valueLabel?: string | null;
    reason?: string | null;
  }[];
  bets?: { text?: string; wantIndex?: number | null }[];
};

export function WantsJourney({ introSeen }: { introSeen: boolean }) {
  // Hybrid-Intro (Muster Saying-No-Wizard)
  const [introDismissed, setIntroDismissed] = useState(false);

  const [phase, setPhase] = useState<Phase>("yin");
  useScrollTopOnChange(phase);

  // Audit
  const [yin, setYin] = useState("");
  const [yang, setYang] = useState("");
  const [principles, setPrinciples] = useState("");
  const [principlesOpen, setPrinciplesOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // KI-Destillat
  const [entryId, setEntryId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);

  // Hypothesen-Karten
  const [draftWants, setDraftWants] = useState<DraftWant[]>([]);
  const [newWantText, setNewWantText] = useState("");
  const [savingWants, setSavingWants] = useState(false);
  const [wantsError, setWantsError] = useState<string | null>(null);

  // Little Bets
  const [draftBets, setDraftBets] = useState<DraftBet[]>([]);
  const [newBetText, setNewBetText] = useState("");
  const [savingBets, setSavingBets] = useState(false);
  const [betsError, setBetsError] = useState<string | null>(null);

  // Offline draft safety net
  const { pendingDraft, saveDraft, clearDraft, dismissPendingDraft } =
    useFormDraft<AuditDraft>("wants-audit");

  const restoreDraft = () => {
    if (pendingDraft) {
      setYin(pendingDraft.yin ?? "");
      setYang(pendingDraft.yang ?? "");
      setPrinciples(pendingDraft.principles ?? "");
      if (pendingDraft.principles) setPrinciplesOpen(true);
    }
    dismissPendingDraft();
  };

  const currentDraft = (): AuditDraft => ({ yin, yang, principles });

  // ── KI-Destillat laden ──────────────────────────────────────────
  // Der Eintrag ist zu diesem Zeitpunkt bereits gespeichert; die Route lädt
  // Audit + bestätigte Werte serverseitig nach — der Client schickt nur die
  // entryId. Fehler landen als aiError auf dem Hypothesen-Screen; das Rezept
  // bleibt ohne KI vollständig nutzbar (manueller Modus).

  async function runDistiller(id: string) {
    setAiError(null);
    setComment("");
    setPhase("analyzing");
    try {
      const res = await fetch("/api/wants-distiller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: id }),
      });
      const data = (await res.json()) as DistillerResponse & { error?: string };
      if (!res.ok) {
        setAiError(data.error ?? AI_FALLBACK_MESSAGE);
        setPhase("hypotheses");
        return;
      }

      const wants: DraftWant[] = (data.wants ?? [])
        .filter((w) => typeof w.text === "string" && w.text.trim())
        .map((w) => ({
          id: crypto.randomUUID(),
          text: (w.text as string).trim(),
          valueId: typeof w.valueId === "string" ? w.valueId : null,
          valueLabel: typeof w.valueLabel === "string" ? w.valueLabel : null,
          reason: typeof w.reason === "string" ? w.reason : null,
          source: "ai",
        }));

      const bets: DraftBet[] = (data.bets ?? [])
        .filter((b) => typeof b.text === "string" && b.text.trim())
        .map((b) => ({
          id: crypto.randomUUID(),
          text: (b.text as string).trim(),
          wantClientId:
            typeof b.wantIndex === "number" && wants[b.wantIndex]
              ? wants[b.wantIndex].id
              : null,
          selected: true,
          source: "ai",
        }));

      setComment(typeof data.comment === "string" ? data.comment : "");
      setDraftWants(wants);
      setDraftBets(bets);
      setManualMode(wants.length === 0);
      setPhase("hypotheses");
    } catch {
      setAiError(AI_FALLBACK_MESSAGE);
      setPhase("hypotheses");
    }
  }

  // ── Audit speichern → Destillat ─────────────────────────────────

  async function handleAuditSubmit() {
    setSubmitting(true);
    setError(null);

    // No connection — keep the audit as a local draft instead of losing it.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      saveDraft(currentDraft());
      setSubmitting(false);
      setError(
        "Du bist offline – dein Audit wurde als Entwurf gesichert. Sobald du wieder online bist, kannst du es abschließen.",
      );
      return;
    }

    const formData = new FormData();
    formData.set("yin", yin);
    formData.set("yang", yang);
    formData.set("principles", principles);

    try {
      const result = await saveYinYangEntryAction(
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
      void runDistiller(result.entryId);
    } catch {
      // Network error mid-request — preserve the audit as a draft.
      saveDraft(currentDraft());
      setSubmitting(false);
      setError(
        "Speichern fehlgeschlagen – dein Audit wurde als Entwurf gesichert. Versuch es später noch einmal.",
      );
    }
  }

  // ── Wants bestätigen ────────────────────────────────────────────

  function addOwnWant() {
    const text = newWantText.trim();
    if (!text) return;
    setDraftWants((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text,
        valueId: null,
        valueLabel: null,
        reason: null,
        source: "own",
      },
    ]);
    setNewWantText("");
  }

  async function confirmWants() {
    const kept = draftWants.filter((w) => w.text.trim());
    if (kept.length === 0) return;

    setSavingWants(true);
    setWantsError(null);

    const items: WantItem[] = kept.map((w) => ({
      id: w.id,
      text: w.text.trim(),
      active: true,
      valueId: w.valueId,
      source: w.source,
    }));

    const fd = new FormData();
    fd.set("wants", JSON.stringify(items));
    // Leere Baseline: bestehende Wants (Re-Run) bleiben durch den
    // Server-Merge erhalten — hier werden nur neue bestätigt.
    fd.set("previousIds", "[]");

    try {
      const result = await saveWantsAction({ error: null }, fd);
      setSavingWants(false);
      if (result.error) {
        setWantsError(result.error);
        return;
      }
      setPhase("bets");
    } catch {
      setSavingWants(false);
      setWantsError("Speichern fehlgeschlagen. Versuch es noch einmal.");
    }
  }

  // ── Bets speichern ──────────────────────────────────────────────

  function addOwnBet() {
    const text = newBetText.trim();
    if (!text) return;
    setDraftBets((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text,
        wantClientId: null,
        selected: true,
        source: "own",
      },
    ]);
    setNewBetText("");
  }

  async function confirmBets() {
    const chosen = draftBets.filter((b) => b.selected && b.text.trim());
    if (chosen.length === 0) {
      setPhase("done");
      return;
    }

    setSavingBets(true);
    setBetsError(null);

    // wantClientId nur übernehmen, wenn das Want auch bestätigt wurde
    // (der User kann Hypothesen verworfen haben).
    const keptWantIds = new Set(draftWants.map((w) => w.id));
    const items: BetItem[] = chosen.map((b) => ({
      id: b.id,
      text: b.text.trim(),
      wantId: b.wantClientId && keptWantIds.has(b.wantClientId) ? b.wantClientId : null,
      status: "open",
      journalEntryId: null,
      source: b.source,
    }));

    const fd = new FormData();
    fd.set("bets", JSON.stringify(items));
    fd.set("previousIds", "[]");

    try {
      const result = await saveBetsAction({ error: null }, fd);
      setSavingBets(false);
      if (result.error) {
        setBetsError(result.error);
        return;
      }
      setPhase("done");
    } catch {
      setSavingBets(false);
      setBetsError("Speichern fehlgeschlagen. Versuch es noch einmal.");
    }
  }

  // ── Render: Intro-Sequenz (erster Besuch) ───────────────────────

  const handleIntroSeen = () => {
    setIntroDismissed(true);
    void markRecipeIntroSeenAction("wants");
  };

  if (!introSeen && !introDismissed && INTRO_CARDS.length > 0) {
    return (
      <div className="flex min-h-svh flex-col">
        <SubPageHeader backHref="/me/wants" title={PAGE_TITLES.wants} />
        <div className="flex flex-1 flex-col justify-center">
          <RecipeIntro
            cards={INTRO_CARDS}
            onComplete={handleIntroSeen}
            onSkip={handleIntroSeen}
            renderMascot={(index) => <WantsIntroMascot index={index} />}
          />
        </div>
      </div>
    );
  }

  const header = (
    <SubPageHeader
      backHref="/me/wants"
      title={PAGE_TITLES.wants}
      action={
        INTRO_CARDS.length > 0 ? <IntroInfoButton cards={INTRO_CARDS} /> : undefined
      }
    />
  );

  // ── Render: Destillat läuft ─────────────────────────────────────

  if (phase === "analyzing") {
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-6 animate-in fade-in duration-500">
          <Mascot expression="curious" size="md" gazeX={0} />
          <p className="text-center text-base text-muted-foreground">
            Ich schaue, was dein Audit über deine Wants verrät …
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

  // ── Render: Wants-Hypothesen ────────────────────────────────────

  if (phase === "hypotheses") {
    const keptCount = draftWants.filter((w) => w.text.trim()).length;

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
                      onClick={() => void runDistiller(entryId)}
                    >
                      Nochmal versuchen
                    </Button>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => {
                      setAiError(null);
                      setManualMode(true);
                    }}
                  >
                    Meine Wants selbst formulieren
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-3 text-center">
                <Mascot expression="happy" size="md" />
                <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                  Deine Wants-Hypothesen
                </h1>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {manualMode
                    ? "Formuliere 3–6 Sätze, die mit „Ich will …“ beginnen — destilliert aus deinem Audit."
                    : "Das lese ich aus deinem Audit heraus. Pass die Sätze an, verwirf, was nicht stimmt, und ergänze, was fehlt — es sind deine Wants."}
                </p>
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

              <div className="flex w-full flex-col gap-3">
                {draftWants.map((want) => (
                  <Card key={want.id} className="w-full">
                    <CardContent className="space-y-2 pt-(--card-spacing)">
                      <div className="flex items-start gap-2">
                        <Textarea
                          value={want.text}
                          onChange={(e) =>
                            setDraftWants((prev) =>
                              prev.map((w) =>
                                w.id === want.id ? { ...w, text: e.target.value } : w,
                              ),
                            )
                          }
                          maxLength={300}
                          rows={2}
                          className="min-h-[60px] resize-y text-base"
                          aria-label="Want bearbeiten"
                        />
                        <button
                          type="button"
                          className="mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label="Want verwerfen"
                          onClick={() =>
                            setDraftWants((prev) => prev.filter((w) => w.id !== want.id))
                          }
                        >
                          <X className="size-4" />
                        </button>
                      </div>
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
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex w-full items-start gap-2">
                <Textarea
                  value={newWantText}
                  onChange={(e) => setNewWantText(e.target.value)}
                  placeholder="Ich will …"
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
                  disabled={!newWantText.trim()}
                  onClick={addOwnWant}
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <FormError message={wantsError} />

              <Button
                className="w-full gap-2"
                size="lg"
                disabled={savingWants || keptCount === 0}
                onClick={() => void confirmWants()}
              >
                <Compass className="size-4" />
                {savingWants
                  ? "Wird gespeichert …"
                  : keptCount === 1
                    ? "Dieses Want bestätigen"
                    : `Diese ${keptCount} Wants bestätigen`}
              </Button>
            </>
          )}
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // ── Render: Little Bets ─────────────────────────────────────────

  if (phase === "bets") {
    const selectedCount = draftBets.filter((b) => b.selected && b.text.trim()).length;

    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot expression="smile" size="md" />
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Zeit für Little Bets
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Deine Wants sind erstmal nur eine These. Kleine, risikofreie
              Experimente liefern dir die Beweise — welche willst du platzieren?
            </p>
          </div>

          {draftBets.length > 0 && (
            <div className="flex w-full flex-col gap-3">
              {draftBets.map((bet) => (
                <button
                  key={bet.id}
                  type="button"
                  className="w-full text-left"
                  aria-pressed={bet.selected}
                  onClick={() =>
                    setDraftBets((prev) =>
                      prev.map((b) =>
                        b.id === bet.id ? { ...b, selected: !b.selected } : b,
                      ),
                    )
                  }
                >
                  <Card
                    className={cn(
                      "w-full transition-colors",
                      bet.selected
                        ? "border-primary/40 bg-primary/5"
                        : "opacity-60 hover:opacity-80",
                    )}
                  >
                    <CardContent className="flex items-start gap-3 pt-(--card-spacing)">
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                          bet.selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40",
                        )}
                      >
                        {bet.selected && <FlaskConical className="size-3" />}
                      </span>
                      <p className="text-base leading-relaxed text-foreground">
                        {bet.text}
                      </p>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}

          <div className="flex w-full items-start gap-2">
            <Input
              value={newBetText}
              onChange={(e) => setNewBetText(e.target.value)}
              placeholder="Eigenes Experiment, z. B. „Einmal zum Bouldern gehen“"
              maxLength={300}
              aria-label="Eigenes Little Bet hinzufügen"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOwnBet();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label="Little Bet hinzufügen"
              disabled={!newBetText.trim()}
              onClick={addOwnBet}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          <FormError message={betsError} />

          <div className="flex w-full flex-col gap-2">
            <Button
              className="w-full gap-2"
              size="lg"
              disabled={savingBets || selectedCount === 0}
              onClick={() => void confirmBets()}
            >
              <FlaskConical className="size-4" />
              {savingBets
                ? "Wird gespeichert …"
                : selectedCount === 1
                  ? "1 Bet platzieren"
                  : `${selectedCount} Bets platzieren`}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              disabled={savingBets}
              onClick={() => setPhase("done")}
            >
              Später auf meiner Wants-Seite
            </Button>
          </div>
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // ── Render: Abschluss ───────────────────────────────────────────

  if (phase === "done") {
    return (
      <div className="flex min-h-svh flex-col items-center px-4 py-10">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CompletionCelebration />

          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              Deine Wants stehen.
            </h1>
            <p className="text-muted-foreground">
              Jetzt beginnt der spannende Teil: ausprobieren. Deine Wants und
              Little Bets warten auf deiner Me-Seite — und nach jedem Experiment
              reflektierst du kurz, was es dir gezeigt hat.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 pt-4">
            <Button className="w-full" size="lg" render={<Link href="/me/wants" />}>
              Zu deinen Wants
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              render={<Link href="/dashboard" />}
            >
              Zurück zum Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Yang (Flow) ─────────────────────────────────────────

  if (phase === "yang") {
    return (
      <div className="flex min-h-svh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot expression="smile" size="md" />
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Yang — Was bringt dich in Flow?
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Flow ist dieser Zustand, in dem du die Zeit vergisst: Du bist so
              in einer Sache drin, dass die Welt (und das Gedankenchaos im
              Kopf) einfach ausgeblendet ist. Laut Forschung eines der
              schönsten Gefühle, die wir haben können.
            </p>
          </div>

          <FormError message={error} />

          <form className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="yang" className="text-base font-medium">
                Bei welchen Aktivitäten vergisst du die Zeit? Und was hast du
                früher aus purem Spaß gemacht, tust es heute aber nicht mehr?
              </Label>
              <Textarea
                id="yang"
                name="yang"
                value={yang}
                onChange={(e) => setYang(e.target.value)}
                placeholder="Zum Beispiel: Wenn ich an einem Design tüftle, schaue ich plötzlich auf die Uhr und drei Stunden sind weg. Früher habe ich ständig gezeichnet — heute gar nicht mehr …"
                rows={6}
                required
                maxLength={5000}
                disabled={submitting}
                className="min-h-[160px] resize-y"
              />
            </div>

            {/* Bonus: kognitive Prinzipien (aufklappbar) */}
            <Card className="w-full">
              <CardContent className="pt-(--card-spacing)">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-left"
                  onClick={() => setPrinciplesOpen((o) => !o)}
                  aria-expanded={principlesOpen}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Sparkles className="size-4 text-primary" />
                    Bonus: Willst du tiefer graben?
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      principlesOpen && "rotate-180",
                    )}
                  />
                </button>
                {principlesOpen && (
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
                      value={principles}
                      onChange={(e) => setPrinciples(e.target.value)}
                      placeholder="Zum Beispiel: Ich glaube, es geht mir ums Erschaffen — etwas, das vorher nicht da war …"
                      rows={3}
                      maxLength={5000}
                      disabled={submitting}
                      className="min-h-[80px] resize-y"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="w-full gap-2"
                size="lg"
                disabled={submitting || !yang.trim()}
                onClick={() => void handleAuditSubmit()}
              >
                {submitting ? "Wird gespeichert …" : "Meine Wants destillieren"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={submitting}
                onClick={() => setPhase("yin")}
              >
                Zurück zu Yin
              </Button>
            </div>
          </form>
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // ── Render: Yin (Mühsal) — Einstieg ─────────────────────────────

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
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Yin — Wofür nimmst du Mühsal in Kauf?
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Egal wie gut dein Leben läuft — manches ist einfach anstrengend.
            Aber interessanterweise stört uns nicht jede Anstrengung gleich:
            Manche Mühsal nehmen wir erstaunlich bereitwillig in Kauf. Und
            genau die verrät, was dir wirklich wichtig ist.
          </p>
        </div>

        <FormError message={error} />

        <form className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="yin" className="text-base font-medium">
              Denk an Momente von Stress, Anstrengung oder Schmerz, auf die du
              zurückblickst und denkst: „Hat mich an den Rand gebracht … war’s
              aber wert.“
            </Label>
            <Textarea
              id="yin"
              name="yin"
              value={yin}
              onChange={(e) => setYin(e.target.value)}
              placeholder="Zum Beispiel: die durchgemachten Nächte vor der Abgabe, das Lampenfieber vor meinem ersten Vortrag, der kräftezehrende Umzug in die neue Stadt …"
              rows={6}
              required
              maxLength={5000}
              className="min-h-[160px] resize-y"
            />
          </div>

          <Button
            type="button"
            className="w-full gap-2"
            size="lg"
            disabled={!yin.trim()}
            onClick={() => setPhase("yang")}
          >
            Weiter zu Yang
          </Button>
        </form>
        <div className="h-8" />
      </div>
    </div>
  );
}
