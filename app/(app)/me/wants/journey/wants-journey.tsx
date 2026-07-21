"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Compass,
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
import type { WantItem } from "@/lib/types/db-json";
import { cn } from "@/lib/utils";

import {
  saveWantsAction,
  saveYinYangEntryAction,
} from "@/app/(app)/recipes/wants/actions";

const INTRO_CARDS = getRecipeIntro("wants") ?? [];

const AI_FALLBACK_MESSAGE =
  "Das Destillieren hat gerade nicht geklappt. Deine Sternensuche ist gespeichert — du kannst deine Wants auch selbst formulieren.";

type Phase = "nudge" | "yin" | "yang" | "tagtraum" | "analyzing" | "sterne" | "done";

type AuditDraft = {
  yin: string[];
  yang: string[];
  tagtraum: string[];
  principles: string;
};

/** Ein Stern-Entwurf im Client-State — die id wird beim Bestätigen zur WantItem-id. */
type DraftWant = {
  id: string;
  text: string;
  title: string | null;
  distance: "nah" | "fern";
  valueId: string | null;
  valueLabel: string | null;
  reason: string | null;
  question: string | null;
  source: "ai" | "own";
};

/** Antwort-Shape von /api/wants-distiller. */
type DistillerResponse = {
  comment?: string;
  wants?: {
    text?: string;
    title?: string | null;
    distance?: string;
    valueId?: string | null;
    valueLabel?: string | null;
    reason?: string | null;
    question?: string | null;
  }[];
};

// Multi-Antwort-Audit: 3 Boxen vorgeschlagen (1 Pflicht), bis zu 6 möglich.
const START_BOXES = 3;
const MAX_ANSWER_BOXES = 6;
// Pro Box gecappt, damit die zusammengefügten Antworten unter TEXT_MAX_LONG (5000) bleiben.
const ANSWER_MAX = 800;

/** Nicht-leere Antworten zeilenweise zu einem String zusammenfügen (für die Action). */
function joinAnswers(answers: string[]): string {
  return answers.map((a) => a.trim()).filter(Boolean).join("\n");
}

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
  // Hybrid-Intro (Muster Saying-No-Wizard)
  const [introDismissed, setIntroDismissed] = useState(false);

  const [phase, setPhase] = useState<Phase>(hasValuesHypothesis ? "yin" : "nudge");
  useScrollTopOnChange(phase);

  // Audit
  const [yin, setYin] = useState<string[]>(Array(START_BOXES).fill(""));
  const [yang, setYang] = useState<string[]>(Array(START_BOXES).fill(""));
  const [tagtraum, setTagtraum] = useState<string[]>(Array(START_BOXES).fill(""));
  const [principles, setPrinciples] = useState("");
  const [principlesOpen, setPrinciplesOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // KI-Destillat
  const [entryId, setEntryId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);

  // Sterne-Karten
  const [draftWants, setDraftWants] = useState<DraftWant[]>([]);
  const [newWantText, setNewWantText] = useState("");
  const [savingWants, setSavingWants] = useState(false);
  const [wantsError, setWantsError] = useState<string | null>(null);

  // Inline-Refine: pro Want die eingetippte Antwort + laufender/fehlerhafter Zustand.
  const [refineAnswers, setRefineAnswers] = useState<Record<string, string>>({});
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [refineError, setRefineError] = useState<Record<string, string | null>>({});

  // Offline draft safety net
  const { pendingDraft, saveDraft, clearDraft, dismissPendingDraft } =
    useFormDraft<AuditDraft>("wants-audit");

  const restoreDraft = () => {
    if (pendingDraft) {
      setYin(
        Array.isArray(pendingDraft.yin) && pendingDraft.yin.length
          ? pendingDraft.yin
          : Array(START_BOXES).fill(""),
      );
      setYang(
        Array.isArray(pendingDraft.yang) && pendingDraft.yang.length
          ? pendingDraft.yang
          : Array(START_BOXES).fill(""),
      );
      setTagtraum(
        Array.isArray(pendingDraft.tagtraum) && pendingDraft.tagtraum.length
          ? pendingDraft.tagtraum
          : Array(START_BOXES).fill(""),
      );
      setPrinciples(pendingDraft.principles ?? "");
      if (pendingDraft.principles) setPrinciplesOpen(true);
    }
    dismissPendingDraft();
  };

  const currentDraft = (): AuditDraft => ({ yin, yang, tagtraum, principles });

  // ── KI-Destillat laden ──────────────────────────────────────────
  // Der Eintrag ist zu diesem Zeitpunkt bereits gespeichert; die Route lädt
  // Audit + bestätigte Werte serverseitig nach — der Client schickt nur die
  // entryId. Fehler landen als aiError auf dem Sterne-Screen; das Rezept
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
        setPhase("sterne");
        return;
      }

      const wants: DraftWant[] = (data.wants ?? [])
        .filter((w) => typeof w.text === "string" && w.text.trim())
        .map((w) => ({
          id: crypto.randomUUID(),
          text: (w.text as string).trim(),
          title: typeof w.title === "string" && w.title.trim() ? w.title.trim() : null,
          distance: w.distance === "fern" ? "fern" : "nah",
          valueId: typeof w.valueId === "string" ? w.valueId : null,
          valueLabel: typeof w.valueLabel === "string" ? w.valueLabel : null,
          reason: typeof w.reason === "string" ? w.reason : null,
          question: typeof w.question === "string" ? w.question : null,
          source: "ai",
        }));

      setComment(typeof data.comment === "string" ? data.comment : "");
      setDraftWants(wants);
      setManualMode(wants.length === 0);
      setPhase("sterne");
    } catch {
      setAiError(AI_FALLBACK_MESSAGE);
      setPhase("sterne");
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
        "Du bist offline – deine Sternensuche wurde als Entwurf gesichert. Sobald du wieder online bist, kannst du es abschließen.",
      );
      return;
    }

    const formData = new FormData();
    formData.set("yin", joinAnswers(yin));
    formData.set("yang", joinAnswers(yang));
    formData.set("tagtraum", joinAnswers(tagtraum));
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
        "Speichern fehlgeschlagen – deine Sternensuche wurde als Entwurf gesichert. Versuch es später noch einmal.",
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
        title: null,
        distance: "nah",
        valueId: null,
        valueLabel: null,
        reason: null,
        question: null,
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
      title: w.title?.trim() ? w.title.trim() : null,
      distance: w.distance,
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
      setPhase("done");
    } catch {
      setSavingWants(false);
      setWantsError("Speichern fehlgeschlagen. Versuch es noch einmal.");
    }
  }

  // ── Want per Rückfrage nachschärfen ─────────────────────────────

  async function refineWant(want: DraftWant) {
    const answer = (refineAnswers[want.id] ?? "").trim();
    if (!answer || !entryId) return;
    setRefiningId(want.id);
    setRefineError((e) => ({ ...e, [want.id]: null }));
    try {
      const res = await fetch("/api/wants-refiner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId,
          text: want.text,
          question: want.question ?? "",
          answer,
        }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        setRefineError((e) => ({
          ...e,
          [want.id]: data.error ?? "Nachschärfen fehlgeschlagen.",
        }));
        return;
      }
      // Text ersetzen und die Rückfrage schließen.
      setDraftWants((prev) =>
        prev.map((w) => (w.id === want.id ? { ...w, text: data.text!, question: null } : w)),
      );
      setRefineAnswers((a) => {
        const next = { ...a };
        delete next[want.id];
        return next;
      });
    } catch {
      setRefineError((e) => ({ ...e, [want.id]: "Nachschärfen fehlgeschlagen." }));
    } finally {
      setRefiningId(null);
    }
  }

  // ── Render: Intro-Sequenz (erster Besuch) ───────────────────────

  const handleIntroSeen = () => {
    setIntroDismissed(true);
    void markRecipeIntroSeenAction("wants");
  };

  if (!introSeen && !introDismissed && INTRO_CARDS.length > 0) {
    return (
      <div className="flex min-h-lvh flex-col">
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

  // ── Render: Werte-Nudge ──────────────────────────────────────────

  if (phase === "nudge") {
    return (
      <div className="flex min-h-lvh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Mascot expression="curious" size="md" />
          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
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
              onClick={() => setPhase("yin")}
            >
              Trotzdem mit den Wants starten
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Destillat läuft ─────────────────────────────────────

  if (phase === "analyzing") {
    return (
      <div className="flex min-h-lvh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-6 animate-in fade-in duration-500">
          <Mascot expression="curious" size="md" gazeX={0} />
          <p className="text-center text-base text-muted-foreground">
            Ich schaue, was deine Sternensuche über deine Wants verrät …
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

  // ── Render: Sterne ───────────────────────────────────────────────

  if (phase === "sterne") {
    const keptCount = draftWants.filter((w) => w.text.trim()).length;

    return (
      <div className="flex min-h-lvh flex-col">
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
                <p className="text-base leading-relaxed text-muted-foreground">
                  {manualMode
                    ? "Formuliere 3–6 Sätze dazu, was dich antreibt — so, wie es sich für dich richtig anfühlt."
                    : "Das lese ich aus deiner Sternensuche heraus. Pass die Sätze an, verwirf, was nicht stimmt — und tauf deine Sterne: Jeder trägt einen Namensvorschlag, den du ändern kannst."}
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
                      <div className="flex items-center gap-2">
                        <Input
                          value={want.title ?? ""}
                          onChange={(e) =>
                            setDraftWants((prev) =>
                              prev.map((w) =>
                                w.id === want.id ? { ...w, title: e.target.value } : w,
                              ),
                            )
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
                      {want.question && (
                        <div className="mt-1 space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
                          <p className="text-sm leading-relaxed text-foreground">
                            {want.question}
                          </p>
                          <Textarea
                            value={refineAnswers[want.id] ?? ""}
                            onChange={(e) =>
                              setRefineAnswers((a) => ({ ...a, [want.id]: e.target.value }))
                            }
                            rows={2}
                            maxLength={300}
                            placeholder="Deine Antwort — dann mach ich es konkreter."
                            className="min-h-[52px] resize-y bg-background text-sm"
                            aria-label="Antwort zum Konkretisieren"
                          />
                          {refineError[want.id] && (
                            <p className="text-xs text-destructive">{refineError[want.id]}</p>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              refiningId === want.id || !(refineAnswers[want.id] ?? "").trim()
                            }
                            onClick={() => void refineWant(want)}
                          >
                            {refiningId === want.id ? "Schärfe …" : "Konkreter machen"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex w-full items-start gap-2">
                <Textarea
                  value={newWantText}
                  onChange={(e) => setNewWantText(e.target.value)}
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
                    ? "Diesen Stern behalten"
                    : `Diese ${keptCount} Sterne behalten`}
              </Button>
            </>
          )}
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // ── Render: Abschluss ───────────────────────────────────────────

  if (phase === "done") {
    return (
      <div className="flex min-h-lvh flex-col items-center px-4 py-10">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CompletionCelebration />

          <div className="space-y-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Deine Sterne leuchten.
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

  if (phase === "tagtraum") {
    return (
      <div className="flex min-h-lvh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot expression="curious" size="md" />
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Wovon tagträumst du?
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Die Dinge, bei denen du gedankenversunken in die Leere starrst:
              „Irgendwann mach ich mal einen Ironman.“ Solche Sterne stehen
              weiter weg — nach ihnen greift man. Schreib auf, was dir kommt,
              oder überspring den Schritt.
            </p>
          </div>

          <FormError message={error} />

          <form className="space-y-5">
            <AnswerBoxes
              answers={tagtraum}
              onChange={setTagtraum}
              idPrefix="tagtraum"
              optional
              placeholders={[
                "Zum Beispiel: Irgendwann mach ich mal einen Ironman …",
                "Noch ein Tagtraum …",
                "Und noch einer …",
              ]}
              disabled={submitting}
            />

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="w-full gap-2"
                size="lg"
                disabled={submitting}
                onClick={() => void handleAuditSubmit()}
              >
                {submitting ? "Wird gespeichert …" : "Meine Wants destillieren"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={submitting}
                onClick={() => setPhase("yang")}
              >
                Zurück
              </Button>
            </div>
          </form>
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // ── Render: Yang (Flow) ─────────────────────────────────────────

  if (phase === "yang") {
    return (
      <div className="flex min-h-lvh flex-col">
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot expression="smile" size="md" />
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Was bringt dich in „Flow“?
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Flow ist dieser Zustand, in dem du die Zeit vergisst — so vertieft,
              dass die Welt und das Gedankenchaos im Kopf ausgeblendet sind. Laut
              Forschung eines der schönsten Gefühle, die wir haben können.
            </p>
          </div>

          <FormError message={error} />

          <form className="space-y-5">
            <div className="space-y-2">
              <Label className="text-base font-medium">
                Bei welchen Aktivitäten vergisst du die Zeit? Eine reicht, drei
                sind ideal.
              </Label>
              <AnswerBoxes
                answers={yang}
                onChange={setYang}
                idPrefix="yang"
                placeholders={[
                  "Zum Beispiel: Wenn ich an einem Design tüftle, sind plötzlich drei Stunden weg …",
                  "Noch etwas, das dich in Flow bringt …",
                  "Und noch etwas …",
                ]}
                disabled={submitting}
              />
            </div>

            {/* Bonus: kognitive Prinzipien (aufklappbar) */}
            <Card className="w-full">
              <CardContent>
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
                disabled={submitting || !yang[0]?.trim()}
                onClick={() => setPhase("tagtraum")}
              >
                Weiter
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={submitting}
                onClick={() => setPhase("yin")}
              >
                Zurück
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
    <div className="flex min-h-lvh flex-col">
      {header}
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Draft restore prompt */}
        {pendingDraft && (
          <DraftRestoreBanner onRestore={restoreDraft} onDiscard={clearDraft} />
        )}

        <div className="flex flex-col items-center gap-3 text-center">
          <Mascot expression="smile" size="md" />
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Wofür nimmst du Mühsal in Kauf?
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Nicht jede Anstrengung stört uns gleich — manche Mühsal nehmen wir
            erstaunlich bereitwillig in Kauf. Genau die verrät, was dir wirklich
            wichtig ist.
          </p>
        </div>

        <FormError message={error} />

        <form className="space-y-5">
          <div className="space-y-2">
            <Label className="text-base font-medium">
              Denk an Momente von Stress oder Schmerz, auf die du zurückblickst
              und denkst: „Hat mich an den Rand gebracht … war’s aber wert.“
              Eine reicht, drei sind ideal.
            </Label>
            <AnswerBoxes
              answers={yin}
              onChange={setYin}
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
            className="w-full gap-2"
            size="lg"
            disabled={!yin[0]?.trim()}
            onClick={() => setPhase("yang")}
          >
            Weiter zum Leuchten
          </Button>
        </form>
        <div className="h-8" />
      </div>
    </div>
  );
}
