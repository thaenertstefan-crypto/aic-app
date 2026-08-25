"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pencil, PenLine, Waypoints } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { EmptyState } from "@/components/ui/empty-state";
import { FormError } from "@/components/ui/form-error";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { RecipeIntroGate } from "@/components/recipes/recipe-intro-gate";
import { BillOfRightsSeal } from "@/components/recipes/bill-of-rights-seal";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { BillOfRightsSky } from "./bill-of-rights-sky";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { saveRightsAction } from "@/lib/recipes/bill-of-rights/actions";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import type { RightItem } from "@/lib/types/db-json";

const INTRO_CARDS = getRecipeIntro("bill-of-rights") ?? [];

/** In dieser Browser-Session bereits gesehene Rechte-IDs — überlebt die
 *  Navigation zu /add bzw. /generate, damit ein dort hinzugefügtes Recht beim
 *  Zurückkommen seinen Stempel-Moment bekommt. */
const SEEN_IDS_KEY = "bor-seen-right-ids";

/** Zierlinie des Urkundenkopfs: Goldlinie — Raute — Goldlinie. */
function Flourish() {
  return (
    <svg
      viewBox="0 0 120 8"
      className="mx-auto h-2 w-28 text-primary"
      aria-hidden="true"
    >
      <line x1="0" y1="4" x2="50" y2="4" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
      <path d="M60 0.5 L63.5 4 L60 7.5 L56.5 4 Z" fill="currentColor" opacity="0.8" />
      <line x1="70" y1="4" x2="120" y2="4" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
    </svg>
  );
}

/**
 * Die zwei Wege zu einem Recht: Generieren ist die eine Gold-Kerze der Aktion,
 * Selbst schreiben der ruhige Weg. Eine Reihe, zwei Zustände — im leeren am Fuß
 * der Spalte (KAN-48), im vollen per `mt-auto` unter der Urkunde und über der
 * Verzahnungskarte. Dieselbe Reihe an beiden Stellen, damit der Übergang
 * leer → voll ihr Aussehen nicht ändert.
 */
function AddRightActions({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-3", className)}>
      <Button
        className="flex-1 gap-2"
        render={<Link href="/me/bill-of-rights/generate" />}
      >
        <Waypoints className="size-4" /> Recht generieren
      </Button>
      <Button
        variant="outline"
        className="flex-1 gap-2"
        render={<Link href="/me/bill-of-rights/add" />}
      >
        <PenLine className="size-4" /> Selbst schreiben
      </Button>
    </div>
  );
}

/** Ensure a right reads as a full affirmation sentence. */
function asAffirmation(text: string): string {
  return text.startsWith("Ich habe das Recht")
    ? text
    : `Ich habe das Recht, ${text}`;
}

export function BillOfRightsMe({
  initialRights,
  introSeen,
}: {
  initialRights: RightItem[];
  introSeen: boolean;
}) {
  const [rights, setRights] = useState<RightItem[]>(initialRights);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Folgt dem Gate-Zustand (nicht nur der server-gelieferten Prop), damit das
  // Siegel schon beim ersten Durchklicken der Intro erscheint und nicht erst
  // beim erneuten Öffnen der Seite.
  const [introDone, setIntroDone] = useState(introSeen);
  const reduced = useReducedMotion();

  // Frisch hinzugekommene Rechte bekommen einen Stempel-Moment: beim Mount wird
  // gegen die in dieser Session bereits gesehenen IDs gedifft (sessionStorage,
  // deckt den Weg über /add bzw. /generate ab), danach gegen die zuletzt
  // bekannten IDs (deckt den Server-Merge in persist() ab). Ohne gespeicherten
  // Stand (erster Seitenaufruf der Session) wird nichts gestempelt.
  const [stampIds, setStampIds] = useState<ReadonlySet<string>>(new Set());
  const knownIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const ids = rights.filter((r) => r.active).map((r) => r.id);
    let fresh: string[] = [];
    if (knownIdsRef.current) {
      const known = knownIdsRef.current;
      fresh = ids.filter((id) => !known.has(id));
      ids.forEach((id) => known.add(id));
    } else {
      knownIdsRef.current = new Set(ids);
      try {
        const stored = sessionStorage.getItem(SEEN_IDS_KEY);
        if (stored) {
          const seen = new Set<string>(JSON.parse(stored) as string[]);
          fresh = ids.filter((id) => !seen.has(id));
        }
      } catch {
        // sessionStorage nicht verfügbar — dann eben ohne Stempel-Moment.
      }
    }
    if (fresh.length > 0) {
      setStampIds((prev) => new Set([...prev, ...fresh]));
    }
    try {
      sessionStorage.setItem(SEEN_IDS_KEY, JSON.stringify(ids));
    } catch {
      // s.o.
    }
  }, [rights]);

  async function persist(updated: RightItem[]) {
    // Optimistisch setzen, aber bei Fehler zurückrollen, damit der UI-Stand
    // nicht fälschlich "gespeichert" suggeriert.
    const previous = rights;
    setRights(updated);
    setSaveError(null);
    const fd = new FormData();
    fd.set("rights", JSON.stringify(updated));
    // Baseline-IDs mitschicken, damit der Server beabsichtigte Löschungen von
    // parallel (auf einem anderen Gerät) hinzugefügten Rechten unterscheiden kann.
    fd.set("previousIds", JSON.stringify(previous.map((r) => r.id)));
    const result = await saveRightsAction(fd);
    if (result.error !== null) {
      setRights(previous);
      setSaveError(result.error);
    } else {
      // Mit dem gemergten Server-Stand synchronisieren (inkl. evtl. parallel
      // hinzugefügter Rechte), statt rein optimistisch zu bleiben.
      setRights(result.data);
    }
  }

  const activeRights = rights.filter((r) => r.active);
  const isEmpty = activeRights.length === 0;

  // Dieselbe Leere, aber die Seitenhöhe hängt zusätzlich an der Intro: der leere
  // Zustand rechnet seine Höhe selbst (`EmptyState` misst bis zur Bottom-Nav),
  // eine erzwungene `min-h-svh` käme oben drauf und die Seite scrollte um die
  // Höhe der Leiste — genau das, was „ein leerer Zustand scrollt nie“
  // ausschließt. Solange die Intro-Sequenz läuft, verdeckt sie den leeren
  // Zustand und ihre Bühne braucht die volle Höhe weiterhin.
  const emptyStage = introDone && isEmpty;

  function startEdit(r: RightItem) {
    setEditingId(r.id);
    setEditText(r.text);
    setConfirmDelete(false);
  }

  function saveEdit() {
    const t = editText.trim();
    if (!t || !editingId) return;
    void persist(rights.map((r) => (r.id === editingId ? { ...r, text: t } : r)));
    setEditingId(null);
  }

  function deleteRight(id: string) {
    void persist(rights.filter((r) => r.id !== id));
  }

  return (
    <div className={cn("flex flex-col", !emptyStage && "min-h-svh")}>
      <BillOfRightsSky />
      <SubPageHeader
        backHref="/me"
        title="Meine Bill of Rights"
        action={
          INTRO_CARDS.length > 0 ? (
            <IntroInfoButton cards={INTRO_CARDS} />
          ) : undefined
        }
      />

      {/* Gold-Siegel als Seitenkopf — nur sobald die Intro-Sequenz vorbei ist.
          Thront frei über der Urkunde, ohne sie zu überlappen. */}
      {introDone && (
        <div className="flex justify-center px-4 pt-6">
          <BillOfRightsSeal />
        </div>
      )}

      <RecipeIntroGate
        slug="bill-of-rights"
        introSeen={introSeen}
        onSeen={() => setIntroDone(true)}
      >
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
          {isEmpty ? (
            /* Die Bill of Rights, bevor das erste Recht da ist (KAN-48): kein
               Urkundenrahmen um nichts herum und kein gestricheltes Linienpapier
               — das sprach dieselbe Sprache wie das Lade-Gerüst, und dann ist
               leer nicht mehr von lädt zu unterscheiden. Es bleiben die Bänder
               der Leer-Grammatik: das Gold-Siegel als Kopf (es hängt schon über
               der Spalte, deshalb kein eigenes `motiv`), der Satz in der Mitte,
               die Knöpfe am Fuß. Auch die Einleitung und der Hinweis auf Things
               Got Messy fallen weg — beide sprechen von Regeln, die es noch
               nicht gibt. */
            <EmptyState
              satz="Deine Bill of Rights wartet auf ihr erstes Recht."
              nachsatz="Was willst du dir erlauben?"
              cta={<AddRightActions />}
            />
          ) : (
            <>
              <p className="text-center text-base leading-relaxed text-foreground">
                Diese Regeln hast du dir selbst gegeben – sie helfen dir beim
                Navigieren durch deinen Alltag und beim Treffen von Entscheidungen.
                Komm hierher zurück, wann immer du eine Erinnerung brauchst, was du
                dir erlauben darfst.
              </p>

              {/* Die Urkunde: ein zusammenhängendes Dokument statt Einzelkarten,
                  das Siegel sitzt frei darüber. */}
              <GlassPanel
                className="rounded-2xl border-primary/25 px-5 pb-8 pt-8"
                contentClassName="flex flex-col"
              >
                {/* Dunkles Papier-Korn — über den Blobs, unter dem Inhalt */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-10"
                  style={{
                    background:
                      "repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0 1px, transparent 1px 3px)",
                  }}
                />

                <div className="space-y-2 text-center">
                  <Flourish />
                  <h2 className="font-heading text-2xl font-semibold tracking-wide text-primary">
                    Bill of Rights
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Verliehen an dich — von dir selbst.
                  </p>
                </div>
                <div className="mt-5 border-t border-primary/15" />

                <div className="flex flex-col">
                  {activeRights.map((r, i) => (
                    <div
                      key={r.id}
                      className={cn(
                        "flex items-start gap-3 rounded-md py-3",
                        i < activeRights.length - 1 &&
                          "border-b border-primary/10",
                        stampIds.has(r.id) && !reduced && "stamp-in",
                      )}
                    >
                      <span className="w-8 shrink-0 self-center text-center font-heading text-lg font-semibold text-primary">
                        § {i + 1}
                      </span>
                      <div className="flex flex-1 items-start gap-2">
                        <p className="font-affirmation flex-1 text-base leading-relaxed text-foreground">
                          {asAffirmation(r.text)}
                        </p>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => startEdit(r)}
                          aria-label="Bearbeiten"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassPanel>

              {/* Steht bewusst in diesem Zweig: `saveError` wird nur von
                  `persist()` gesetzt, und das rollt vorher `rights` auf den
                  Stand vor dem Speichern zurück — beim Löschen des letzten
                  Rechts ist die Liste im selben Render wieder gefüllt. Es gibt
                  also keinen Fehler, der im leeren Zustand zu zeigen wäre. */}
              <FormError message={saveError} />

              <AddRightActions className="mt-auto pt-4" />

              {/* Verzahnung: Things Got Messy für den akuten Moment. */}
              <Card className="border-dashed">
                <CardContent className="space-y-2 pt-(--card-spacing)">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Kommen beim Leben deiner Regeln Schuldgefühle auf?{" "}
                    <Link
                      href="/booster/things-got-messy"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Things Got Messy
                    </Link>{" "}
                    hilft dir herauszufinden, was sie dir sagen wollen.
                  </p>
                </CardContent>
              </Card>

              {/* Bearbeiten-Dialog: Recht umformulieren oder löschen */}
              <Dialog
                open={editingId !== null}
                onOpenChange={(open) => {
                  if (!open) {
                    setEditingId(null);
                    setConfirmDelete(false);
                  }
                }}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Recht bearbeiten</DialogTitle>
                  </DialogHeader>
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    autoFocus
                    className="resize-y"
                    aria-label="Text des Rechts"
                  />
                  <DialogFooter>
                    <Button
                      variant="destructive"
                      className="sm:mr-auto"
                      onClick={() => {
                        if (!confirmDelete) {
                          setConfirmDelete(true);
                          return;
                        }
                        if (editingId) deleteRight(editingId);
                        setEditingId(null);
                        setConfirmDelete(false);
                      }}
                    >
                      {confirmDelete ? "Wirklich löschen?" : "Recht löschen"}
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
            </>
          )}
        </div>
      </RecipeIntroGate>
    </div>
  );
}
