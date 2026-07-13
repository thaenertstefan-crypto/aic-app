"use client";

import { useEffect, useState } from "react";
import { ViewTransition } from "react";
import Link from "next/link";
import { Check, Flame, FlaskConical, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionLabel } from "@/components/ui/section-label";
import { FormError } from "@/components/ui/form-error";
import { Reveal } from "@/components/ui/reveal";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { Mascot } from "@/components/brand/mascot";
import { AnvilArt } from "@/components/brand/forge-art";
import { ForgeBackdrop } from "@/components/backdrops/forge-backdrop";
import { useWarp } from "@/components/wants/warp-transition";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { useScrollTopOnChange } from "@/lib/hooks/use-scroll-top-on-change";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { saveBetsAction } from "@/app/(app)/recipes/wants/actions";
import type { BetItem } from "@/lib/types/db-json";
import { cn } from "@/lib/utils";

// Der Info-Button der Schmiede zeigt DASSELBE Wants-Intro-Overlay wie /me/wants —
// keine eigene Schmiede-Intro.
const INTRO_CARDS = getRecipeIntro("wants") ?? [];

type Phase = "intro" | "forging" | "funken" | "done";

type DraftFunke = {
  id: string;
  text: string;
  reason: string | null;
  selected: boolean;
  /** Herkunft: KI-Vorschlag oder selbst getippt. */
  source: "ai" | "own";
};

type ForgeResponse = {
  comment?: string;
  funken?: { text?: string; reason?: string | null }[];
  error?: string;
};

const AI_ERROR = "Das Funkenschlagen hat gerade nicht geklappt. Versuch es gleich noch einmal.";

export function Sternschmiede({
  hasSterne,
  initialBets,
}: {
  hasSterne: boolean;
  initialBets: BetItem[];
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  useScrollTopOnChange(phase);

  const reduced = useReducedMotion();
  // Löst den Warp-Sturz beim Ankommen auf (no-op, wenn direkt navigiert wurde).
  const { phase: warpPhase, arrive } = useWarp();
  // Beim ersten Render festhalten, ob wir per Warp ankommen — dann slidet die
  // Schmiede-Szene von unten herein. Direktaufruf (phase "idle") → kein Slide.
  const [warpArrival] = useState(() => warpPhase !== "idle");
  useEffect(() => {
    arrive();
  }, [arrive]);

  const [childAnswer, setChildAnswer] = useState("");
  const [comment, setComment] = useState("");
  const [funken, setFunken] = useState<DraftFunke[]>([]);
  const [newFunkeText, setNewFunkeText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Bets leben jetzt hier (aus /me/wants hierher gezogen).
  const [bets, setBets] = useState<BetItem[]>(initialBets);
  const [betError, setBetError] = useState<string | null>(null);
  const [newBet, setNewBet] = useState("");

  const openBets = bets.filter((b) => b.status === "open");
  const triedBets = bets.filter((b) => b.status === "tried");

  const header = (
    <SubPageHeader
      backHref="/me/wants"
      title="Sternschmiede"
      backTransitionTypes={["forge-up"]}
      action={
        INTRO_CARDS.length > 0 ? (
          <IntroInfoButton cards={INTRO_CARDS} />
        ) : undefined
      }
    />
  );

  async function persistBets(updated: BetItem[]) {
    const previous = bets;
    setBets(updated);
    setBetError(null);
    const fd = new FormData();
    fd.set("bets", JSON.stringify(updated));
    fd.set("previousIds", JSON.stringify(previous.map((b) => b.id)));
    const res = await saveBetsAction({ error: null }, fd);
    if (res.error) {
      setBets(previous);
      setBetError(res.error);
    } else if (res.bets) {
      setBets(res.bets);
    }
  }

  function addBet() {
    const text = newBet.trim();
    if (!text) return;
    setNewBet("");
    void persistBets([
      ...bets,
      {
        id: crypto.randomUUID(),
        text,
        wantId: null,
        status: "open",
        journalEntryId: null,
        source: "own",
      },
    ]);
  }

  function deleteBet(id: string) {
    void persistBets(bets.filter((b) => b.id !== id));
  }

  async function forge() {
    setError(null);
    setComment("");
    setPhase("forging");
    try {
      const res = await fetch("/api/sternschmiede", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childAnswer }),
      });
      const data = (await res.json()) as ForgeResponse;
      if (!res.ok) {
        setError(data.error ?? AI_ERROR);
        setPhase("intro");
        return;
      }
      const parsed: DraftFunke[] = (data.funken ?? [])
        .filter((f) => typeof f.text === "string" && f.text.trim())
        .map((f) => ({
          id: crypto.randomUUID(),
          text: (f.text as string).trim(),
          reason: typeof f.reason === "string" ? f.reason : null,
          selected: true,
          source: "ai" as const,
        }));
      setComment(typeof data.comment === "string" ? data.comment : "");
      setFunken(parsed);
      setPhase("funken");
    } catch {
      setError(AI_ERROR);
      setPhase("intro");
    }
  }

  function addOwnFunke() {
    const text = newFunkeText.trim();
    if (!text) return;
    setFunken((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, reason: null, selected: true, source: "own" },
    ]);
    setNewFunkeText("");
  }

  async function saveFunken() {
    const chosen = funken.filter((f) => f.selected && f.text.trim());
    if (chosen.length === 0) {
      setPhase("done");
      return;
    }
    setSaving(true);
    setError(null);
    const items: BetItem[] = chosen.map((f) => ({
      id: f.id,
      text: f.text.trim(),
      wantId: null,
      status: "open",
      journalEntryId: null,
      source: f.source,
    }));
    const fd = new FormData();
    fd.set("bets", JSON.stringify(items));
    fd.set("previousIds", "[]");
    try {
      const result = await saveBetsAction({ error: null }, fd);
      setSaving(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Frisch geschlagene Funken sofort in die Landing-Liste übernehmen —
      // bevorzugt die autoritative Server-Liste, sonst lokaler Merge.
      if (result.bets) {
        setBets(result.bets);
      } else {
        setBets((prev) => [...prev, ...items]);
      }
      setPhase("done");
    } catch {
      setSaving(false);
      setError("Speichern fehlgeschlagen. Versuch es noch einmal.");
    }
  }

  // ── Forging (Ladezustand) ───────────────────────────────────────
  if (phase === "forging") {
    return (
      <div className="flex min-h-svh flex-col">
        <ForgeBackdrop />
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-4 py-6 animate-in fade-in duration-500">
          <AnvilArt animate={!reduced} active />
          <p className="text-center text-base text-muted-foreground">
            Ich schlage ein paar Funken für dich …
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

  // ── Funken auswählen ────────────────────────────────────────────
  if (phase === "funken") {
    const selectedCount = funken.filter((f) => f.selected && f.text.trim()).length;
    return (
      <div className="flex min-h-svh flex-col">
        <ForgeBackdrop />
        {header}
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot expression="happy" size="md" />
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Deine Funken
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Kleine Wetten mit dir selbst. Nimm mit, was dich neugierig macht —
              aus einem Funken kann ein neuer Stern werden.
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
            {funken.map((funke) => (
              <button
                key={funke.id}
                type="button"
                className="w-full text-left"
                aria-pressed={funke.selected}
                onClick={() =>
                  setFunken((prev) =>
                    prev.map((f) =>
                      f.id === funke.id ? { ...f, selected: !f.selected } : f,
                    ),
                  )
                }
              >
                <Card
                  className={cn(
                    "w-full transition-colors",
                    funke.selected ? "border-primary/40 bg-primary/5" : "opacity-60 hover:opacity-80",
                  )}
                >
                  <CardContent className="flex items-start gap-3 pt-(--card-spacing)">
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                        funke.selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40",
                      )}
                    >
                      {funke.selected && <Flame className="size-3" />}
                    </span>
                    <div className="flex-1">
                      <p className="text-base leading-relaxed text-foreground">{funke.text}</p>
                      {funke.reason && (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {funke.reason}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>

          <div className="flex w-full items-start gap-2">
            <Input
              value={newFunkeText}
              onChange={(e) => setNewFunkeText(e.target.value)}
              placeholder="Eigener Funke, z. B. „Einmal zum Bouldern gehen“"
              maxLength={300}
              aria-label="Eigenen Funken hinzufügen"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOwnFunke();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label="Funken hinzufügen"
              disabled={!newFunkeText.trim()}
              onClick={addOwnFunke}
            >
              <Plus className="size-4" />
            </Button>
          </div>

          <FormError message={error} />

          <div className="flex w-full flex-col gap-2">
            <Button
              className="w-full gap-2"
              size="lg"
              disabled={saving || selectedCount === 0}
              onClick={() => void saveFunken()}
            >
              <Flame className="size-4" />
              {saving
                ? "Wird gespeichert …"
                : selectedCount === 1
                  ? "1 Funken mitnehmen"
                  : `${selectedCount} Funken mitnehmen`}
            </Button>
            <Button variant="ghost" className="w-full" disabled={saving} onClick={() => forge()}>
              Neue Funken schlagen
            </Button>
          </div>
          <div className="h-8" />
        </div>
      </div>
    );
  }

  // ── Abschluss ───────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <div className="flex min-h-svh flex-col">
        <ForgeBackdrop />
        {header}
        <ViewTransition
          enter={{ "forge-down": "forge-in-up", "forge-up": "forge-in-down", default: "none" }}
          exit={{ "forge-down": "forge-out-up", "forge-up": "forge-out-down", default: "none" }}
          default="none"
        >
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Mascot expression="happy" size="lg" />
            <div className="space-y-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                Funken geschlagen.
              </h1>
              <p className="text-muted-foreground">
                Sie warten auf deiner Sterne-Seite. Probier sie aus — und danach
                reflektierst du kurz, was der Funke dir gezeigt hat.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 pt-2">
              <Button className="w-full" size="lg" onClick={() => setPhase("intro")}>
                Zu deinen Funken
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                render={<Link href="/me/wants" transitionTypes={["forge-up"]} />}
              >
                Zu deinen Sternen
              </Button>
            </div>
          </div>
        </ViewTransition>
      </div>
    );
  }

  // ── Intro + Bets + Kind-Frage (Einstieg / Landing) ──────────────
  return (
    <div
      className={cn("flex min-h-svh flex-col", warpArrival && "warp-page-enter")}
    >
      <ForgeBackdrop />
      {header}
      <ViewTransition
        enter={{ "forge-down": "forge-in-up", "forge-up": "forge-in-down", default: "none" }}
        exit={{ "forge-down": "forge-out-up", "forge-up": "forge-out-down", default: "none" }}
        default="none"
      >
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <AnvilArt animate={!reduced} />
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Willkommen in der Sternschmiede
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              Hier schlägst du Funken — kleine, risikofreie Experimente, mit denen
              du Neues (oder längst Vergessenes) ausprobierst. Aus manchem Funken
              wird ein neuer Stern.
            </p>
            {!hasSterne && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Du hast noch keine Sterne bestätigt — kein Problem, ein Funke kann
                trotzdem der Anfang sein.
              </p>
            )}
          </div>

          {/* ── Nach den Sternen greifen (Bets leben jetzt hier) ── */}
          {(openBets.length > 0 || triedBets.length > 0) && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Nach den Sternen greifen
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Deine Funken — kleine Experimente. Nach jedem reflektierst du kurz,
                was er dir gezeigt hat.
              </p>

              {openBets.length > 0 && (
                <div className="flex flex-col gap-3">
                  {openBets.map((bet) => (
                    <Card key={bet.id} className="w-full">
                      <CardContent className="space-y-3 pt-(--card-spacing)">
                        <p className="text-base leading-relaxed text-foreground">
                          {bet.text}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="gap-2"
                            render={<Link href={`/me/wants/reflect/${bet.id}`} />}
                          >
                            <FlaskConical className="size-4" /> Ausprobiert? Reflektieren
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground"
                            onClick={() => deleteBet(bet.id)}
                          >
                            Verwerfen
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {triedBets.length > 0 && (
                <div className="flex flex-col gap-2 pt-1">
                  <SectionLabel>Schon gegriffen</SectionLabel>
                  {triedBets.map((bet) => (
                    <div
                      key={bet.id}
                      className="flex items-start gap-2 rounded-lg border border-border/60 px-3 py-2"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="flex-1 text-sm leading-relaxed text-muted-foreground">
                        {bet.text}
                      </span>
                      {bet.journalEntryId && (
                        <Link
                          href="/journal"
                          className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Reflexion
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-start gap-2">
                <Input
                  value={newBet}
                  onChange={(e) => setNewBet(e.target.value)}
                  placeholder="Eigener Funke, z. B. „Einmal zum Bouldern gehen“"
                  maxLength={300}
                  aria-label="Eigenen Funken hinzufügen"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addBet();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label="Funken hinzufügen"
                  disabled={!newBet.trim()}
                  onClick={addBet}
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <FormError message={betError} />
            </section>
          )}

          {/* ── Neue Funken schlagen ── */}
          <Card className="w-full">
            <CardContent className="space-y-3 pt-(--card-spacing)">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Was hat dir als Kind Spaß gemacht?
                </p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Etwas, das dir vielleicht immer noch Spaß machen könnte? Optional —
                aber es hilft mir, bessere Funken für dich zu schlagen.
              </p>
              <Textarea
                value={childAnswer}
                onChange={(e) => setChildAnswer(e.target.value)}
                placeholder="Zum Beispiel: stundenlang Höhlen aus Decken bauen, Fußball auf der Straße, Geschichten erfinden …"
                rows={3}
                maxLength={800}
                className="min-h-[80px] resize-y"
                aria-label="Was dir als Kind Spaß gemacht hat (optional)"
              />
            </CardContent>
          </Card>

          <FormError message={error} />

          <Button className="w-full gap-2" size="lg" onClick={() => void forge()}>
            <Flame className="size-4" /> Funken schlagen
          </Button>
          <div className="h-8" />
        </div>
      </ViewTransition>
    </div>
  );
}
