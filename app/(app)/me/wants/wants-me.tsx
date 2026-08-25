"use client";

import { useEffect, useState } from "react";
import { ViewTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Binoculars, Flame, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { EmptyState } from "@/components/ui/empty-state";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { RecipeIntroGate } from "@/components/recipes/recipe-intro-gate";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { StarArt } from "@/components/brand/star-art";
import { SkyBackdrop } from "@/components/backdrops/sky-backdrop";
import { useWarp, warpPageClass } from "@/components/wants/warp-transition";
import { cn } from "@/lib/utils";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { PAGE_TITLES } from "@/lib/content/labels";
import {
  addMomentAction,
  deleteMomentAction,
  saveWantsAction,
  updateMomentAction,
} from "@/lib/recipes/wants/actions";
import type { MomentsByStar, StarMoment } from "@/lib/recipes/wants/moments";
import { StarMap } from "./star-map";
import type { WantItem } from "@/lib/types/db-json";

const INTRO_CARDS = getRecipeIntro("wants") ?? [];
const FORGE_HREF = "/me/wants/schmiede";

/** Alle Listen eines Momente-Verzeichnisses durch dieselbe Abbildung schicken. */
function mapMomentsByStar(
  byStar: MomentsByStar,
  fn: (moments: StarMoment[]) => StarMoment[],
): MomentsByStar {
  return Object.fromEntries(
    Object.entries(byStar).map(([starId, list]) => [starId, fn(list)]),
  );
}

export function WantsMe({
  initialWants,
  initialMoments,
  introSeen,
}: {
  initialWants: WantItem[];
  initialMoments: MomentsByStar;
  introSeen: boolean;
}) {
  const [wants, setWants] = useState<WantItem[]>(initialWants);
  const [moments, setMoments] = useState<MomentsByStar>(initialMoments);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addText, setAddText] = useState("");
  const [introDone, setIntroDone] = useState(introSeen);

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

  const hasSterne = wants.length > 0;

  // Der leere Himmel rechnet seine Höhe selbst (`EmptyState` misst bis zur
  // Bottom-Nav). Eine erzwungene `min-h-lvh` käme oben drauf und die Seite
  // scrollte um die Höhe der Leiste — genau das, was „ein leerer Zustand
  // scrollt nie“ ausschließt (KAN-49). Solange die Intro-Sequenz läuft,
  // verdeckt sie den leeren Zustand und ihre Bühne braucht die volle Höhe
  // weiterhin.
  const emptyStage = introDone && !hasSterne;

  async function persistWants(updated: WantItem[]): Promise<string | null> {
    const previous = wants;
    setWants(updated);
    setSaveError(null);
    const fd = new FormData();
    fd.set("wants", JSON.stringify(updated));
    fd.set("previousIds", JSON.stringify(previous.map((w) => w.id)));
    const res = await saveWantsAction(fd);
    if (res.error !== null) {
      setWants(previous);
      setSaveError(res.error);
    } else {
      setWants(res.data);
    }
    return res.error;
  }

  // Speichern aus dem Fokus: den Fehler zurückgeben, damit die (das seitliche
  // FormError-Banner verdeckende) Fokus-Ebene ihn inline zeigen kann.
  // Die Weite steht nicht im Patch: sie sagt, WOHER der Text kommt (aus einem
  // Antwortfeld der Tagtraum-Frage oder nicht), und das ändert sich durch
  // Bearbeiten nicht. Siehe CONTEXT.md (Stern).
  function saveWantEdit(
    id: string,
    patch: { title: string | null; text: string },
  ): Promise<string | null> {
    return persistWants(
      wants.map((w) =>
        w.id === id ? { ...w, title: patch.title, text: patch.text } : w,
      ),
    );
  }

  function addOwnStar() {
    const text = addText.trim();
    if (!text) return;
    void persistWants([
      ...wants,
      {
        id: crypto.randomUUID(),
        text,
        title: addTitle.trim() ? addTitle.trim() : null,
        active: true,
        distance: "nah",
        valueId: null,
        source: "own",
      },
    ]);
    setAddOpen(false);
    setAddTitle("");
    setAddText("");
  }

  function deleteWant(id: string) {
    void persistWants(wants.filter((w) => w.id !== id));
  }

  // ── Momente ──────────────────────────────────────────────────────────
  // Alle drei laufen optimistisch: die Fokus-Ebene liegt über der Seite, und
  // ein Beleg, der erst nach dem Server-Rundlauf erscheint, macht aus einer
  // ruhigen Wand ein wartendes Formular. Schlägt der Schreibvorgang fehl, geht
  // die Wand auf den vorigen Stand zurück und die Meldung wandert als
  // Rückgabewert nach unten — inline neben dem Feld, weil das seitliche
  // FormError-Banner unter dem Overlay liegt (wie bei `saveWantEdit`).

  async function addMoment(
    starId: string,
    text: string,
  ): Promise<string | null> {
    // Die id kommt vom Client: daran hängt die Idempotenz des Anlegens
    // (s. `addMomentAction`).
    const id = crypto.randomUUID();
    const optimistic: StarMoment = {
      id,
      star_id: starId,
      text,
      origin: "own",
      created_at: new Date().toISOString(),
    };
    setMoments((prev) => ({
      ...prev,
      [starId]: [...(prev[starId] ?? []), optimistic],
    }));

    const res = await addMomentAction({ id, starId, text, origin: "own" });
    if (res.error !== null) {
      setMoments((prev) =>
        mapMomentsByStar(prev, (list) => list.filter((m) => m.id !== id)),
      );
      return res.error;
    }
    // Den geschriebenen Moment übernehmen — `created_at` kommt vom Server,
    // statt dass die Wand es weiter rät.
    setMoments((prev) =>
      mapMomentsByStar(prev, (list) =>
        list.map((m) => (m.id === id ? res.data : m)),
      ),
    );
    return null;
  }

  async function updateMoment(id: string, text: string): Promise<string | null> {
    const previous = moments;
    setMoments((prev) =>
      mapMomentsByStar(prev, (list) =>
        list.map((m) => (m.id === id ? { ...m, text } : m)),
      ),
    );

    const res = await updateMomentAction(id, text);
    if (res.error !== null) setMoments(previous);
    return res.error;
  }

  async function deleteMoment(id: string): Promise<string | null> {
    const previous = moments;
    setMoments((prev) =>
      mapMomentsByStar(prev, (list) => list.filter((m) => m.id !== id)),
    );

    const res = await deleteMomentAction(id);
    if (res.error !== null) setMoments(previous);
    return res.error;
  }

  // „Der Sturz": das Warp-Overlay startet, stürzt durch die Sterne und navigiert
  // mitten in der Bewegung in die Schmiede (dive() übernimmt Timing + reduced
  // motion). Die Schmiede löst den Warp beim Mount per arrive() auf.
  function goToForge() {
    if (busy) return;
    dive(() => router.push(FORGE_HREF));
  }

  // Ruhiger Sekundär-Einstieg in die Sternschmiede. Das „Warum" der Schmiede
  // lebt jetzt im Info-Overlay (Intro-Karte 4) — hier genügt eine warme Zeile,
  // damit die eine Gold-Kerze eine Stern-Handlung bleibt, nicht der Weg weg.
  // goToForge behält den Warp-Sturz; busy sperrt den Doppel-Klick.
  function forgeLink() {
    return (
      <Button
        variant="ghost"
        className="w-full gap-2 text-muted-foreground"
        disabled={busy}
        onClick={goToForge}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Flame className="size-4" />
        )}
        Lust auf Neues? Zur Sternschmiede
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col",
        !emptyStage && "min-h-lvh",
        warpPageClass("wants", phase, direction),
      )}
    >
      <SkyBackdrop />
      <SubPageHeader
        backHref="/me"
        title={PAGE_TITLES.meWants}
        action={
          INTRO_CARDS.length > 0 ? <IntroInfoButton cards={INTRO_CARDS} /> : undefined
        }
      />

      <RecipeIntroGate
        slug="wants"
        introSeen={introSeen}
        onSeen={() => setIntroDone(true)}
      >
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
                /* Der Himmel, bevor der erste Stern entdeckt ist (KAN-49): die
                   Bänder der Leer-Grammatik statt eines eigenen Blocks. Oben
                   das Motiv der Fläche — der Goldstern, gedimmt wie ihn der
                   /me-Hub bei `wantsCount === 0` zeigt; nie mehr das
                   Maskottchen. Der Satz nennt den Himmel im Werden, nicht den
                   Mangel. Die Knöpfe stehen am Fuß der Spalte, dieselbe Stelle
                   wie im vollen Zustand, damit der Übergang leer → voll sie
                   nicht bewegt. Die Höhe („scrollt nie“) kommt aus
                   `EmptyState` — siehe `emptyStage` oben. */
                <EmptyState
                  motiv={<StarArt animate dim className="size-16" />}
                  satz="Hier wird dein Himmel."
                  nachsatz="Jeder Stern, den du entdeckst, bekommt hier seinen Platz. Fang mit einem an."
                  cta={
                    <>
                      <Button
                        className="w-full gap-2"
                        size="lg"
                        render={<Link href="/me/wants/journey" />}
                      >
                        <Binoculars className="size-4" /> Sternensuche starten
                      </Button>
                      {forgeLink()}
                    </>
                  }
                />
              ) : (
                <>
                  <Reveal delay={0}>
                    <div className="flex flex-col items-center gap-3 text-center">
                      <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                        {PAGE_TITLES.meWantsHero}
                      </h2>
                      <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
                        Meine Freudenquellen und Ziele, nach denen ich greife.
                      </p>
                    </div>
                  </Reveal>

                  <FormError message={saveError} />

                  <StarMap
                    key={wants.length}
                    wants={wants}
                    moments={moments}
                    onSaveEdit={saveWantEdit}
                    onDelete={deleteWant}
                    onAddMoment={addMoment}
                    onUpdateMoment={updateMoment}
                    onDeleteMoment={deleteMoment}
                  />

                  <div className="flex gap-3">
                    <Button
                      className="flex-1 gap-2"
                      render={<Link href="/me/wants/journey" />}
                    >
                      <Binoculars className="size-4" /> Sternensuche
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => setAddOpen(true)}
                    >
                      <Plus className="size-4" /> Eigener Stern
                    </Button>
                  </div>

                  {/* „Lust auf Neues?" sitzt mittig zwischen der Button-Reihe und
                      der Bottom-Nav — der flex-1-Spacer absorbiert den Rest der
                      Seitenhöhe (Karte und Buttons haben feste Höhen), pt-2 hält
                      einen Mindestabstand nach oben, damit der Link bei vielen
                      Sternen nicht an der Button-Reihe klebt. */}
                  <div className="flex flex-1 flex-col justify-center pt-2">
                    {forgeLink()}
                  </div>
                </>
              )}

              {/* Eigener Stern hinzufügen */}
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Eigener Stern</DialogTitle>
                  </DialogHeader>
                  <Input
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    maxLength={60}
                    placeholder="Name des Sterns (optional)"
                    aria-label="Name des Sterns"
                  />
                  <Textarea
                    value={addText}
                    onChange={(e) => setAddText(e.target.value)}
                    placeholder="Was zieht dich an? Z. B. „Mir macht … Spaß“ oder „Ich will …“"
                    maxLength={300}
                    rows={3}
                    autoFocus
                    className="resize-y"
                    aria-label="Beschreibung des Sterns"
                  />
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" />}>Abbrechen</DialogClose>
                    <Button onClick={addOwnStar} disabled={!addText.trim()}>
                      Stern anzünden
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
