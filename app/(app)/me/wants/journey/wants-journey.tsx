"use client";

import { useState } from "react";
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
import { Reveal } from "@/components/ui/reveal";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { DraftRestoreBanner } from "@/components/offline/draft-restore-banner";
import { RecipeIntro } from "@/components/recipes/recipe-intro";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { WantsIntroMascot } from "@/components/recipes/wants-intro-mascot";
import { Mascot } from "@/components/brand/mascot";
import { StarGlyph } from "@/components/brand/star-glyph";
import { JourneyStage } from "./journey-stage";
import { FocusSky } from "@/app/(app)/me/wants/focus-sky";
import { PAGE_TITLES } from "@/lib/content/labels";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { useScrollTopOnChange } from "@/lib/hooks/use-scroll-top-on-change";
import { useFormDraft } from "@/lib/hooks/use-form-draft";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
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
  const reduced = useReducedMotion();

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

  // Welche Vorschlags-Sterne sind aufgeklappt (Tap-to-Edit). Unabhängig togglebar.
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const toggleOpen = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

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
    const id = crypto.randomUUID();
    setDraftWants((prev) => [
      ...prev,
      {
        id,
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
    setOpenIds((prev) => new Set(prev).add(id));
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

  const introAction =
    INTRO_CARDS.length > 0 ? <IntroInfoButton cards={INTRO_CARDS} /> : undefined;

  // Fortschritt nur auf den drei Eingabeschritten (nutzt die leere Untertitelzeile).
  const stepSubtitle =
    phase === "yin"
      ? "Schritt 1 von 3"
      : phase === "yang"
        ? "Schritt 2 von 3"
        : phase === "tagtraum"
          ? "Schritt 3 von 3"
          : undefined;

  // ── Render: Werte-Nudge ──────────────────────────────────────────

  if (phase === "nudge") {
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
              onClick={() => setPhase("yin")}
            >
              Trotzdem mit den Wants starten
            </Button>
          </div>
        </div>
      </JourneyStage>
    );
  }

  // ── Render: Destillat läuft ─────────────────────────────────────

  if (phase === "analyzing") {
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

  if (phase === "sterne") {
    const keptCount = draftWants.filter((w) => w.text.trim()).length;

    return (
      <JourneyStage
        backHref="/me/wants"
        title={PAGE_TITLES.wants}
        headerAction={introAction}
        mascot={null}
        stepKey="sterne"
      >
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
            {/* Held-Stern statt Maskottchen */}
            <div className="flex flex-col items-center gap-3 text-center">
              <StarGlyph sizeClass="size-14" glow={18} />
              <p className="text-base leading-relaxed text-muted-foreground">
                {manualMode
                  ? "Formuliere 3–6 Sätze dazu, was dich antreibt — so, wie es sich für dich richtig anfühlt."
                  : "Das lese ich aus deiner Sternensuche heraus. Tipp einen Stern an, um ihn zu taufen oder zu ändern — und verwirf, was nicht stimmt."}
              </p>
            </div>

            {/* KI-Einschätzung als Glass-Karte */}
            {comment && (
              <Reveal delay={0.15} className="w-full">
                <Card variant="glass" className="w-full">
                  <CardContent className="pt-(--card-spacing)">
                    <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                      {comment}
                    </p>
                  </CardContent>
                </Card>
              </Reveal>
            )}

            {/* Vorschläge als kompakte Stern-Zeilen (Tap-to-Edit) */}
            <div className="flex w-full flex-col">
              {draftWants.map((want) => {
                const open = openIds.has(want.id);
                const displayName = want.title?.trim() ? want.title.trim() : want.text.trim();
                return (
                  <div key={want.id} className="border-b border-foreground/10 last:border-b-0">
                    {/* Kollabierte Zeile */}
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 py-3 text-left"
                      aria-expanded={open}
                      onClick={() => toggleOpen(want.id)}
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
                            {want.text}
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
                            onClick={() => {
                              setDraftWants((prev) => prev.filter((w) => w.id !== want.id));
                              setOpenIds((prev) => {
                                const next = new Set(prev);
                                next.delete(want.id);
                                return next;
                              });
                            }}
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
              <StarGlyph sizeClass="size-4" glow={0} fill="var(--primary-foreground)" />
              {savingWants
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

  if (phase === "done") {
    const keptStarCount = draftWants.filter((w) => w.text.trim()).length;
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
        <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
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

  if (phase === "tagtraum") {
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
              {submitting ? "Wird gespeichert …" : "Meine Sterne finden"}
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
      </JourneyStage>
    );
  }

  // ── Render: Yang (Flow) ─────────────────────────────────────────

  if (phase === "yang") {
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
          className="w-full"
          size="lg"
          disabled={!yin[0]?.trim()}
          onClick={() => setPhase("yang")}
        >
          Weiter
        </Button>
      </form>
    </JourneyStage>
  );
}
