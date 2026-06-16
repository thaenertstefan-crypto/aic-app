"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Pencil,
  Check,
  X,
  Shield,
  Sparkles,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FormError } from "@/components/ui/form-error";
import { DraftRestoreBanner } from "@/components/offline/draft-restore-banner";
import { useFormDraft } from "@/lib/hooks/use-form-draft";

import {
  getBillOfRightsData,
  saveReflectionAction,
  saveRightsAction,
} from "./actions";

type ReflectionDraft = {
  prompt1: string;
  prompt2: string;
  prompt3: string;
};

// ─── Types ──────────────────────────────────────────────────────────────

type Right = {
  id: string;
  text: string;
  active: boolean;
};

type PageData = {
  prompt1: string;
  prompt2: string;
  prompt3: string;
  rights: Right[];
  progressStatus: string | null;
};

function generateId(): string {
  return crypto.randomUUID();
}

// ─── Example rights from the cookbook ───────────────────────────────────

const EXAMPLE_RIGHTS: string[] = [
  "Ich habe das Recht, meine eigenen Bedürfnisse ernst zu nehmen.",
  "Ich habe das Recht, Nein zu sagen, ohne mich zu rechtfertigen.",
  "Ich habe das Recht, Fehler zu machen und daraus zu lernen.",
  "Ich habe das Recht, meine eigenen Grenzen zu setzen.",
];

// ─── Manifesto Item ─────────────────────────────────────────────────────

function ManifestoItem({
  right,
  index,
  total,
  onToggle,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  right: Right;
  index: number;
  total: number;
  onToggle: () => void;
  onEdit: (newText: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(right.text);

  const handleSave = () => {
    if (editText.trim()) {
      onEdit(editText.trim());
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setEditText(right.text);
    setEditing(false);
  };

  return (
    <div
      className={`group relative rounded-lg border-l-4 px-4 py-3 transition-all ${
        right.active
          ? "border-amber-500 bg-amber-50/50 dark:border-amber-400 dark:bg-amber-950/20"
          : "border-muted-foreground/20 bg-muted/30 opacity-60"
      }`}
    >
      {editing ? (
        <div className="flex items-start gap-2">
          <span className="mt-2 shrink-0 font-heading text-lg font-bold text-amber-600 dark:text-amber-400">
            {index + 1}.
          </span>
          <div className="flex-1 space-y-2">
            <Input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="text-base"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
            />
            <div className="flex gap-1">
              <Button size="xs" variant="default" onClick={handleSave} className="gap-1">
                <Check className="size-3" />
                Speichern
              </Button>
              <Button size="xs" variant="outline" onClick={handleCancel} className="gap-1">
                <X className="size-3" />
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          {/* Number */}
          <span
            className={`mt-0.5 shrink-0 font-heading text-lg font-bold ${
              right.active
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
            }`}
          >
            {index + 1}.
          </span>

          {/* Text */}
          <p
            className={`flex-1 pt-0.5 text-base leading-relaxed ${
              right.active
                ? "text-foreground"
                : "text-muted-foreground line-through"
            }`}
          >
            {right.text}
          </p>

          {/* Actions — visible on hover / always on mobile */}
          <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => {
                setEditText(right.text);
                setEditing(true);
              }}
              aria-label="Bearbeiten"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={onDelete}
              aria-label="Löschen"
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>

          {/* Reorder buttons */}
          <div className="flex shrink-0 flex-col gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              disabled={index === 0}
              onClick={onMoveUp}
              aria-label="Nach oben"
            >
              <ChevronUp className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              disabled={index === total - 1}
              onClick={onMoveDown}
              aria-label="Nach unten"
            >
              <ChevronDown className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────

export default function BillOfRightsPage() {
  // Data
  const [loading, setLoading] = useState(true);
  const [prompt1, setPrompt1] = useState("");
  const [prompt2, setPrompt2] = useState("");
  const [prompt3, setPrompt3] = useState("");
  const [rights, setRights] = useState<Right[]>([]);
  const [progressStatus, setProgressStatus] = useState<string | null>(null);

  // Right builder input
  const [builderText, setBuilderText] = useState("");
  const [generating, setGenerating] = useState(false);

  // Saving states
  const [savingReflection, setSavingReflection] = useState(false);
  const [savingRights, setSavingRights] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Offline draft safety net (covers the reflection prompts)
  const { pendingDraft, saveDraft, clearDraft, dismissPendingDraft } =
    useFormDraft<ReflectionDraft>("bill-of-rights-reflection");

  const restoreReflectionDraft = () => {
    if (pendingDraft) {
      setPrompt1(pendingDraft.prompt1 ?? "");
      setPrompt2(pendingDraft.prompt2 ?? "");
      setPrompt3(pendingDraft.prompt3 ?? "");
    }
    dismissPendingDraft();
  };

  // ── Load data ─────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const result = await getBillOfRightsData();
      if (result.data) {
        if (result.data.journalEntry) {
          setPrompt1(result.data.journalEntry.prompt1 ?? "");
          setPrompt2(result.data.journalEntry.prompt2 ?? "");
          setPrompt3(result.data.journalEntry.prompt3 ?? "");
        }
        if (result.data.rights) {
          setRights(result.data.rights);
        }
        if (result.data.progress) {
          setProgressStatus(result.data.progress.status);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────

  const showSuccess = (msg: string) => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(null), 3000);
  };

  // ── Reflection form ───────────────────────────────────────────────

  const handleSaveReflection = async () => {
    setSavingReflection(true);
    setError(null);

    const draft: ReflectionDraft = { prompt1, prompt2, prompt3 };

    const formData = new FormData();
    formData.set("prompt1", prompt1);
    formData.set("prompt2", prompt2);
    formData.set("prompt3", prompt3);

    // No connection — keep the reflection as a local draft instead of losing it.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      saveDraft(draft);
      setSavingReflection(false);
      setError(
        "Du bist offline – deine Reflexion wurde als Entwurf gesichert. Sobald du wieder online bist, kannst du sie speichern.",
      );
      return;
    }

    try {
      const result = await saveReflectionAction({ error: null, success: false }, formData);

      setSavingReflection(false);

      if (result.error) {
        setError(result.error);
      } else {
        clearDraft();
        setProgressStatus("in_progress");
        showSuccess("Reflexion gespeichert ✓");
      }
    } catch {
      // Network error mid-request — preserve the reflection as a draft.
      saveDraft(draft);
      setSavingReflection(false);
      setError(
        "Speichern fehlgeschlagen – deine Reflexion wurde als Entwurf gesichert. Versuch es später noch einmal.",
      );
    }
  };

  // ── Rights persistence ────────────────────────────────────────────

  const persistRights = useCallback(
    async (updatedRights: Right[]) => {
      setSavingRights(true);
      setError(null);

      const formData = new FormData();
      formData.set("rights", JSON.stringify(updatedRights));

      const result = await saveRightsAction({ error: null, success: false }, formData);

      setSavingRights(false);

      if (result.error) {
        setError(result.error);
      } else {
        const activeCount = updatedRights.filter((r) => r.active).length;
        if (activeCount >= 3) {
          setProgressStatus("completed");
        } else if (progressStatus === "not_started" || progressStatus === null) {
          setProgressStatus("in_progress");
        }
      }
    },
    [progressStatus],
  );

  // ── Right Builder ─────────────────────────────────────────────────

  const handleAddRight = () => {
    const text = builderText.trim();
    if (!text || text === "Ich habe das Recht, ") return;

    const newRight: Right = {
      id: generateId(),
      text: text.startsWith("Ich habe das Recht, ") ? text : text,
      active: true,
    };

    const updated = [...rights, newRight];
    setRights(updated);
    setBuilderText("");
    persistRights(updated);
  };

  // ── AI suggestion ─────────────────────────────────────────────────

  const RIGHT_PREFIX = "Ich habe das Recht, ";

  const handleGenerateSuggestion = async () => {
    setGenerating(true);
    setError(null);

    // The held-back situation, enriched with the inner rule that held them back.
    const situation = [prompt1.trim(), prompt2.trim()].filter(Boolean).join("\n\n");

    try {
      const res = await fetch("/api/rights-formulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation, idealReaction: prompt3.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Wir konnten gerade keinen Vorschlag erstellen.");
        return;
      }

      // The input sits behind a static "Ich habe das Recht," prefix overlay and
      // stores only the continuation, so strip the prefix before pre-filling.
      const suggestion: string = data.suggestion ?? "";
      const continuation = suggestion.startsWith(RIGHT_PREFIX)
        ? suggestion.slice(RIGHT_PREFIX.length)
        : suggestion;
      setBuilderText(continuation);
    } catch {
      setError("Wir konnten gerade keinen Vorschlag erstellen. Versuch es noch einmal.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Suggestion chips ──────────────────────────────────────────────

  const handleAddSuggestion = (example: string) => {
    // Check if already present
    if (rights.some((r) => r.text === example)) return;

    const newRight: Right = {
      id: generateId(),
      text: example,
      active: true,
    };

    const updated = [...rights, newRight];
    setRights(updated);
    persistRights(updated);
  };

  // ── Rights list actions ───────────────────────────────────────────

  const handleToggleActive = (id: string) => {
    const updated = rights.map((r) =>
      r.id === id ? { ...r, active: !r.active } : r,
    );
    setRights(updated);
    persistRights(updated);
  };

  const handleEditRight = (id: string, newText: string) => {
    const updated = rights.map((r) =>
      r.id === id ? { ...r, text: newText } : r,
    );
    setRights(updated);
    persistRights(updated);
  };

  const handleDeleteRight = (id: string) => {
    const updated = rights.filter((r) => r.id !== id);
    setRights(updated);
    persistRights(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...rights];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setRights(updated);
    persistRights(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === rights.length - 1) return;
    const updated = [...rights];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setRights(updated);
    persistRights(updated);
  };

  const activeRights = rights.filter((r) => r.active);
  const isCompleted = progressStatus === "completed";

  // ── Loading state ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-svh flex-col px-4 py-6">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6">
          <div className="space-y-2">
            <Skeleton className="mx-auto h-8 w-56" />
            <Skeleton className="mx-auto h-4 w-72" />
          </div>
          <Card>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    );
  }

  // ── Completion screen ─────────────────────────────────────────────

  if (isCompleted && rights.length > 0) {
    return (
      <div className="flex min-h-svh flex-col px-4 py-6">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
          {/* Header */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              Dein Bill of Rights
            </h1>
            <p className="text-muted-foreground">
              Du hast {rights.length} persönliche{/* eslint-disable-next-line react/jsx-no-comment-textnodes */ /* eslint-disable-next-line */}
              Grundrechte formuliert. Sie stehen dir immer zur Seite, wenn du sie brauchst.
            </p>
          </div>

          {/* Manifesto */}
          <div className="mt-8 space-y-2">
            {rights.map((right, i) => (
              <div
                key={right.id}
                className={`rounded-lg border-l-4 px-4 py-3 ${
                  right.active
                    ? "border-amber-500 bg-amber-50/50 dark:border-amber-400 dark:bg-amber-950/20"
                    : "border-muted-foreground/20 bg-muted/30 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 font-heading text-lg font-bold text-amber-600 dark:text-amber-400">
                    {i + 1}.
                  </span>
                  <p
                    className={`pt-0.5 text-base leading-relaxed ${
                      right.active ? "text-foreground" : "text-muted-foreground italic"
                    }`}
                  >
                    {right.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-8 flex w-full flex-col gap-3">
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => setProgressStatus("in_progress")}
            >
              Weiter bearbeiten
            </Button>
            <Button className="w-full" size="lg" render={<Link href="/recipes" />}>
              Zurück zur Übersicht
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────

  return (
    <div className="flex min-h-svh flex-col px-4 py-6">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Shield className="size-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Dein Bill of Rights
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Innere Regeln prägen unser Verhalten – oft unbewusst. Dieses Rezept hilft dir, deine
            persönlichen Grundrechte zu entdecken und bewusst neu zu formulieren. Rechte, die dich
            schützen und dir helfen, authentisch zu leben.
          </p>
        </div>

        {/* Progress indicator */}
        {progressStatus && progressStatus !== "not_started" && (
          <div className="flex items-center justify-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`size-2.5 rounded-full transition-all ${
                    activeRights.length >= i
                      ? "bg-amber-500 dark:bg-amber-400"
                      : "bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {activeRights.length} von 3 Rechten{activeRights.length >= 3 ? " – geschafft! 🎉" : ""}
            </span>
          </div>
        )}

        {/* ── Error banner ────────────────────────────────────── */}
        <FormError message={error} />

        {/* ── Success message ─────────────────────────────────── */}
        {savedMessage && (
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 animate-in fade-in slide-in-from-top-2 duration-300">
            {savedMessage}
          </div>
        )}

        {/* ── Draft restore prompt ────────────────────────────── */}
        {pendingDraft && (
          <DraftRestoreBanner onRestore={restoreReflectionDraft} onDiscard={clearDraft} />
        )}

        {/* ── Section: Reflection Form ────────────────────────── */}
        <Card>
          <CardContent className="space-y-4 pt-(--card-spacing)">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              1. Reflexion – Deine inneren Konflikte
            </h2>
            <p className="text-sm text-muted-foreground">
              Nimm dir einen Moment Zeit und denk an die vergangene Woche zurück.
            </p>

            <div className="space-y-2">
              <Label htmlFor="prompt1" className="text-base font-medium">
                Was ist diese Woche passiert, wo du einen inneren Konflikt gespürt hast?
              </Label>
              <Textarea
                id="prompt1"
                value={prompt1}
                onChange={(e) => setPrompt1(e.target.value)}
                placeholder="Zum Beispiel: Ich habe zugestimmt, obwohl ich eigentlich Nein sagen wollte …"
                rows={3}
                className="min-h-[100px] resize-y"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt2" className="text-base font-medium">
                Welche innere Regel hat dich dabei zurückgehalten?
              </Label>
              <Textarea
                id="prompt2"
                value={prompt2}
                onChange={(e) => setPrompt2(e.target.value)}
                placeholder={`Eine Stimme in dir, die sagt: „Das macht man nicht“ oder „Sei bloß kein Aufwand“?`}
                rows={3}
                className="min-h-[100px] resize-y"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt3" className="text-base font-medium">
                Wie würdest du handeln, wenn du frei von Angst, Schuld und Zweifel wärst?
              </Label>
              <Textarea
                id="prompt3"
                value={prompt3}
                onChange={(e) => setPrompt3(e.target.value)}
                placeholder="Was wäre dein mutigstes, authentischstes Ich?"
                rows={3}
                className="min-h-[100px] resize-y"
              />
            </div>

            <Button
              onClick={handleSaveReflection}
              disabled={savingReflection || !prompt1.trim()}
              className="w-full gap-2"
            >
              {savingReflection ? "Wird gespeichert …" : "Reflexion speichern"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Section: Right Builder ──────────────────────────── */}
        <Card>
          <CardContent className="space-y-4 pt-(--card-spacing)">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              2. Deine Rechte formulieren
            </h2>
            <p className="text-sm text-muted-foreground">
              Basierend auf dem, was du oben geschrieben hast: Welches Recht brauchst du, um
              nächstes Mal anders zu handeln? Vervollständige den Satz.
            </p>

            <div className="flex flex-col gap-2">
              <Label htmlFor="right-builder" className="text-sm font-medium">
                Neues Recht
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Ich habe das Recht,{" "}
                </span>
                <Input
                  id="right-builder"
                  value={builderText}
                  onChange={(e) => setBuilderText(e.target.value)}
                  placeholder="z.B. meine Meinung frei zu sagen."
                  className="pl-[9.5rem] text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddRight();
                  }}
                />
              </div>
              <Button
                onClick={handleGenerateSuggestion}
                disabled={generating || (!prompt1.trim() && !prompt3.trim())}
                variant="outline"
                size="sm"
                className="w-full gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Wird formuliert …
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Vorschlag generieren
                  </>
                )}
              </Button>
              <Button
                onClick={handleAddRight}
                disabled={!builderText.trim()}
                className="w-full gap-2"
                size="sm"
              >
                <Plus className="size-4" />
                Hinzufügen
              </Button>
            </div>

            {/* Suggestion chips (empty state) */}
            {rights.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Oder lass dich von diesen Beispielen inspirieren:
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_RIGHTS.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => handleAddSuggestion(example)}
                      className="cursor-pointer rounded-full border border-dashed border-muted-foreground/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-amber-400 hover:text-amber-600 dark:hover:border-amber-500 dark:hover:text-amber-400"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Section: Rights List (Manifesto) ──────────────────── */}
        {rights.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Deine Grundrechte
              </h2>
              <span className="text-xs text-muted-foreground">
                {activeRights.length} aktiv
                {savingRights && " …"}
              </span>
            </div>

            <div className="space-y-2">
              {rights.map((right, index) => (
                <ManifestoItem
                  key={right.id}
                  right={right}
                  index={index}
                  total={rights.length}
                  onToggle={() => handleToggleActive(right.id)}
                  onEdit={(newText) => handleEditRight(right.id, newText)}
                  onDelete={() => handleDeleteRight(right.id)}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Messy Moment CTA ──────────────────────────────────────── */}
        <Card className="border-amber-200/50 bg-amber-50/30 dark:border-amber-800/30 dark:bg-amber-950/10">
          <CardContent className="space-y-3 pt-(--card-spacing) text-center">
            <p className="text-sm font-medium text-foreground">
              Es ist mal wieder messy geworden?
            </p>
            <p className="text-xs text-muted-foreground">
              Nicht nach deinen eigenen Rechten gehandelt? Reflektiere hier, was passiert ist –
              ohne Druck, ohne Urteil.
            </p>
            <Button
              className="w-full gap-2"
              render={<Link href="/recipes/bill-of-rights/messy" />}
            >
              Hier reflektieren &rarr;
            </Button>
          </CardContent>
        </Card>

        {/* ── Bottom spacing ────────────────────────────────────── */}
        <div className="h-8" />
      </div>
    </div>
  );
}