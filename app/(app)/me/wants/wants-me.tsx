"use client";

import { useEffect, useState } from "react";
import { ViewTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flame, Loader2, Pencil, Plus, RefreshCw, Sparkles, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
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
import { StarArt } from "@/components/brand/star-art";
import { SkyBackdrop } from "@/components/backdrops/sky-backdrop";
import { useWarp, warpPageClass } from "@/components/wants/warp-transition";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { PAGE_TITLES } from "@/lib/content/labels";
import { saveWantsAction } from "@/app/(app)/recipes/wants/actions";
import { getValueLabel } from "@/lib/utils/values-bank";
import type { WantItem } from "@/lib/types/db-json";

const INTRO_CARDS = getRecipeIntro("wants") ?? [];
const FORGE_HREF = "/me/wants/schmiede";

export function WantsMe({
  initialWants,
  introSeen,
}: {
  initialWants: WantItem[];
  introSeen: boolean;
}) {
  const [wants, setWants] = useState<WantItem[]>(initialWants);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newWant, setNewWant] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const reduced = useReducedMotion();
  const router = useRouter();
  // Der Warp-Übergang lebt im gemeinsamen me/wants-Layout und überlebt so die
  // Navigation. `busy` sperrt den Button während des Sturzes.
  const { phase, direction, dive, arrive } = useWarp();
  const busy = phase !== "idle";

  // Ziel-Route vorab laden, damit nach der Raus-Animation ohne Lücke
  // navigiert werden kann (die Schmiede slidet dann sofort von unten rein).
  useEffect(() => {
    router.prefetch(FORGE_HREF);
  }, [router]);

  // Beim Rück-Aufstieg (schmiede→wants) ist Wants das Ziel: arrive() löst
  // Tunnel→Ankunft aus. Beim Direktaufruf/Load ist phase "idle" → no-op.
  useEffect(() => {
    arrive();
  }, [arrive]);

  const activeWants = wants.filter((w) => w.active);
  const hasSterne = activeWants.length > 0;

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

  // „Der Sturz": das Warp-Overlay startet, stürzt durch die Sterne und navigiert
  // mitten in der Bewegung in die Schmiede (dive() übernimmt Timing + reduced
  // motion). Die Schmiede löst den Warp beim Mount per arrive() auf.
  function goToForge() {
    if (busy) return;
    dive(() => router.push(FORGE_HREF));
  }

  // Im Leer-Zustand steht die Sternschmiede gleichwertig NEBEN „Sternensuche
  // starten" (siehe Kommentar unten: „Sternsuche ODER direkt in die
  // Schmiede") — dort bleibt sie outline, damit nur eine Gold-Kerze brennt.
  // Sobald schon Sterne existieren, ist sie die einzige verbleibende
  // Primäraktion des Screens und wird zur Gold-Kerze.
  function forgeBridge(primary: boolean) {
    return (
      <section className="space-y-3 rounded-2xl bg-primary/5 p-5 text-center">
        <Flame className="mx-auto size-6 text-primary" />
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Lust, neue Sterne zu entdecken?
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Manchmal steckt man in der Routine fest und will endlich wieder etwas
          Neues ausprobieren — weiß aber nicht was. In der Sternschmiede schlägst du
          Funken: kleine Wetten, aus denen ein neuer Stern werden könnte.
        </p>
        <Button
          variant={primary ? "default" : "outline"}
          className="w-full gap-2"
          size="lg"
          disabled={busy}
          onClick={goToForge}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Flame className="size-4" />
          )}
          Zur Sternschmiede
        </Button>
      </section>
    );
  }

  return (
    <div className={cn("flex min-h-svh flex-col", warpPageClass("wants", phase, direction))}>
      <SkyBackdrop />
      <SubPageHeader
        backHref="/me"
        title={PAGE_TITLES.meWants}
        action={
          INTRO_CARDS.length > 0 ? <IntroInfoButton cards={INTRO_CARDS} /> : undefined
        }
      />

      <RecipeIntroGate slug="wants" cards={INTRO_CARDS} introSeen={introSeen}>
        <ViewTransition
          enter={{ "forge-down": "forge-in-up", "forge-up": "forge-in-down", default: "none" }}
          exit={{ "forge-down": "forge-out-up", "forge-up": "forge-out-down", default: "none" }}
          default="none"
        >
          <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col">
            {/* Der Sternenhimmel (SkyBackdrop) liefert jetzt das Umgebungsglühen —
                kein zweiter lokaler Gold-Schein hier (One-Candle-Rule). */}
            <div className="relative z-10 flex flex-1 flex-col gap-6 px-4 py-6">
              {!hasSterne ? (
                // ── Leer-Zustand: Sternsuche ODER direkt in die Schmiede ──
                <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
                  <Mascot expression="curious" size="lg" />
                  <div className="space-y-2">
                    <h2 className="font-heading text-xl font-semibold text-foreground">
                      Noch keine Sterne entdeckt
                    </h2>
                    <p className="text-base leading-relaxed text-muted-foreground">
                      Finde mit der Sternensuche heraus, was dich zum Leuchten
                      bringt, was dir echte Freude bringt und dir dieses Gefühl
                      von tiefer Zufriedenheit entlockt.
                    </p>
                  </div>
                  <Button className="w-full gap-2" size="lg" render={<Link href="/me/wants/journey" />}>
                    <Star className="size-4" /> Sternensuche starten
                  </Button>
                  {forgeBridge(false)}
                </div>
              ) : (
                <>
                  <Reveal delay={0}>
                    <div className="flex flex-col items-center gap-3 pb-2 text-center">
                      <StarArt animate={!reduced} className="size-16" />
                      <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                        {PAGE_TITLES.meWantsHero}
                      </h2>
                      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                        Die Sterne, nach denen du greifst — was dich lebendig macht.
                      </p>
                    </div>
                  </Reveal>

                  <FormError message={saveError} />

                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Star className="size-5 text-primary" />
                      <h2 className="font-heading text-lg font-semibold text-foreground">
                        Meine Sterne
                      </h2>
                    </div>

                    <div className="flex flex-col gap-3">
                      {activeWants.map((want) => (
                        <Card key={want.id} className="w-full">
                          <CardContent className="space-y-2 pt-(--card-spacing)">
                            <div className="flex items-start gap-2.5">
                              <Star className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                              <p className="flex-1 text-base leading-relaxed text-foreground">
                                {want.text}
                              </p>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-muted-foreground"
                                onClick={() => startEdit(want)}
                                aria-label="Want bearbeiten"
                              >
                                <Pencil className="size-4" />
                              </Button>
                            </div>
                            {want.valueId && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                <Sparkles className="size-3" />
                                nährt deinen Wert: {getValueLabel(want.valueId)}
                              </span>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="flex items-start gap-2">
                      <Textarea
                        value={newWant}
                        onChange={(e) => setNewWant(e.target.value)}
                        placeholder="Was zieht dich an? Z. B. „Mir macht … Spaß“ oder „Ich will …“"
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

                  {/* Sternsuche erneut — steht ÜBER der Brücke */}
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    render={<Link href="/me/wants/journey" />}
                  >
                    <RefreshCw className="size-4" /> Sternensuche nochmal machen
                  </Button>

                  {/* Brücke in die Sternschmiede */}
                  {forgeBridge(true)}
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
                    <DialogClose render={<Button variant="outline" />}>Abbrechen</DialogClose>
                    <Button onClick={saveEdit} disabled={!editText.trim()}>
                      Speichern
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </ViewTransition>
      </RecipeIntroGate>
    </div>
  );
}
