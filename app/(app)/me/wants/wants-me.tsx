"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Compass,
  FlaskConical,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form-error";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { RecipeIntroGate } from "@/components/recipes/recipe-intro-gate";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { Mascot } from "@/components/brand/mascot";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { PAGE_TITLES } from "@/lib/content/labels";
import {
  saveBetsAction,
  saveWantsAction,
} from "@/app/(app)/recipes/wants/actions";
import { getValueLabel } from "@/lib/utils/values-bank";
import type { BetItem, WantItem } from "@/lib/types/db-json";

const INTRO_CARDS = getRecipeIntro("wants") ?? [];

export function WantsMe({
  initialWants,
  initialBets,
  introSeen,
}: {
  initialWants: WantItem[];
  initialBets: BetItem[];
  introSeen: boolean;
}) {
  const [wants, setWants] = useState<WantItem[]>(initialWants);
  const [bets, setBets] = useState<BetItem[]>(initialBets);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [newWant, setNewWant] = useState("");
  const [newBet, setNewBet] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const activeWants = wants.filter((w) => w.active);
  const openBets = bets.filter((b) => b.status === "open");
  const triedBets = bets.filter((b) => b.status === "tried");

  // ── Persistenz (optimistisch, Rollback bei Fehler) ──────────────

  async function persistWants(updated: WantItem[]) {
    const previous = wants;
    setWants(updated);
    setSaveError(null);
    const fd = new FormData();
    fd.set("wants", JSON.stringify(updated));
    fd.set("previousIds", JSON.stringify(previous.map((w) => w.id)));
    const res = await saveWantsAction({ error: null }, fd);
    if (res.error) {
      setWants(previous);
      setSaveError(res.error);
    } else if (res.wants) {
      setWants(res.wants);
    }
  }

  async function persistBets(updated: BetItem[]) {
    const previous = bets;
    setBets(updated);
    setSaveError(null);
    const fd = new FormData();
    fd.set("bets", JSON.stringify(updated));
    fd.set("previousIds", JSON.stringify(previous.map((b) => b.id)));
    const res = await saveBetsAction({ error: null }, fd);
    if (res.error) {
      setBets(previous);
      setSaveError(res.error);
    } else if (res.bets) {
      setBets(res.bets);
    }
  }

  // ── Wants ────────────────────────────────────────────────────────

  function addWant() {
    const text = newWant.trim();
    if (!text) return;
    setNewWant("");
    void persistWants([
      ...wants,
      { id: crypto.randomUUID(), text, active: true, valueId: null, source: "own" },
    ]);
  }

  function startEdit(w: WantItem) {
    setEditingId(w.id);
    setEditText(w.text);
  }

  function saveEdit() {
    const t = editText.trim();
    if (!t || !editingId) return;
    void persistWants(wants.map((w) => (w.id === editingId ? { ...w, text: t } : w)));
    setEditingId(null);
  }

  function deleteWant(id: string) {
    void persistWants(wants.filter((w) => w.id !== id));
  }

  // ── Bets ─────────────────────────────────────────────────────────

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

  const isEmpty = wants.length === 0 && bets.length === 0;

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader
        backHref="/me"
        title={PAGE_TITLES.meWants}
        action={
          INTRO_CARDS.length > 0 ? <IntroInfoButton cards={INTRO_CARDS} /> : undefined
        }
      />

      <RecipeIntroGate slug="wants" cards={INTRO_CARDS} introSeen={introSeen}>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
          {isEmpty ? (
            // ── Empty state → Journey ──────────────────────────────
            <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
              <Mascot expression="curious" size="lg" />
              <div className="space-y-2">
                <h2 className="font-heading text-xl font-semibold text-foreground">
                  Noch keine Wants entdeckt
                </h2>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Finde mit dem Yin-&-Yang-Audit heraus, was du wirklich willst —
                  in etwa 10 Minuten. Danach testest du deine Wants mit kleinen
                  Experimenten.
                </p>
              </div>
              <Button className="w-full gap-2" size="lg" render={<Link href="/me/wants/journey" />}>
                <Compass className="size-4" /> Audit starten
              </Button>
            </div>
          ) : (
            <>
              <FormError message={saveError} />

              {/* ── Meine Wants ──────────────────────────────────── */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Compass className="size-5 text-primary" />
                  <h2 className="font-heading text-lg font-semibold text-foreground">
                    Meine Wants
                  </h2>
                </div>

                {activeWants.length === 0 ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Noch keine Wants bestätigt. Mach das Audit oder schreib direkt
                    eins auf.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {activeWants.map((want) => (
                      <Card key={want.id} className="w-full">
                        <CardContent className="space-y-2 pt-(--card-spacing)">
                          <div className="flex items-start gap-2">
                            <p className="flex-1 text-base leading-relaxed text-foreground">
                              {want.text}
                            </p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground/70"
                              onClick={() => startEdit(want)}
                              aria-label="Want bearbeiten"
                            >
                              <Pencil className="size-4" />
                            </Button>
                          </div>
                          {want.valueId && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                              <Sparkles className="size-3" />
                              {getValueLabel(want.valueId)}
                            </span>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <Textarea
                    value={newWant}
                    onChange={(e) => setNewWant(e.target.value)}
                    placeholder="Ich will …"
                    maxLength={300}
                    rows={2}
                    className="min-h-[52px] flex-1 resize-y"
                    aria-label="Eigenes Want hinzufügen"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="mt-1 shrink-0"
                    aria-label="Want hinzufügen"
                    disabled={!newWant.trim()}
                    onClick={addWant}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </section>

              <hr className="border-border" />

              {/* ── Little Bets ──────────────────────────────────── */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <FlaskConical className="size-5 text-primary" />
                  <h2 className="font-heading text-lg font-semibold text-foreground">
                    Little Bets
                  </h2>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Kleine Experimente, mit denen du deine Wants im echten Leben
                  testest. Nach jedem reflektierst du kurz, was es dir gezeigt hat.
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
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Schon ausprobiert
                    </p>
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
                    placeholder="Eigenes Experiment, z. B. „Einmal zum Bouldern gehen“"
                    maxLength={300}
                    aria-label="Eigenes Little Bet hinzufügen"
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
                    aria-label="Little Bet hinzufügen"
                    disabled={!newBet.trim()}
                    onClick={addBet}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </section>

              <hr className="border-border" />

              {/* Audit erneut */}
              <Button
                variant="outline"
                className="w-full gap-2"
                render={<Link href="/me/wants/journey" />}
              >
                <RefreshCw className="size-4" /> Audit nochmal machen
              </Button>
            </>
          )}

          {/* Bearbeiten-Dialog: Want umformulieren oder löschen */}
          <Dialog
            open={editingId !== null}
            onOpenChange={(open) => {
              if (!open) setEditingId(null);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Want bearbeiten</DialogTitle>
              </DialogHeader>
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                autoFocus
                className="resize-y"
                aria-label="Text des Wants"
              />
              <DialogFooter>
                <Button
                  variant="destructive"
                  className="sm:mr-auto"
                  onClick={() => {
                    if (editingId) deleteWant(editingId);
                    setEditingId(null);
                  }}
                >
                  Want löschen
                </Button>
                <DialogClose render={<Button variant="outline" />}>
                  Abbrechen
                </DialogClose>
                <Button onClick={saveEdit} disabled={!editText.trim()}>
                  Speichern
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </RecipeIntroGate>
    </div>
  );
}
