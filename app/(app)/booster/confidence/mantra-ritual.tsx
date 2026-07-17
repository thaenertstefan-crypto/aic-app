"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/section-label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  addCardAction,
  deleteCardAction,
  logCleanserCheckinAction,
  saveMantraAction,
  seedDefaultCardsAction,
  updateCardAction,
  type CleanserCheckinState,
  type MantraCardData,
} from "./actions";

const INITIAL_STATE: CleanserCheckinState = { error: null, success: false };

const MANTRA_MAX = 120;
const CARD_MAX = 200;

// ---------------------------------------------------------------------------
// Mantra (inline editierbar)
// ---------------------------------------------------------------------------

function MantraBlock({ mantra }: { mantra: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(mantra);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function open() {
    setValue(mantra);
    setError(null);
    setEditing(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveMantraAction(value);
      if (res.success) {
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Card className="w-full border-primary/30 bg-card">
      <CardContent className="flex min-h-[32svh] flex-col items-center justify-center gap-4 py-6 text-center">
        <SectionLabel>Dein Mantra</SectionLabel>

        {editing ? (
          <div className="flex w-full flex-col items-stretch gap-3">
            <Input
              value={value}
              maxLength={MANTRA_MAX}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              aria-label="Mantra"
              className="h-auto py-2 text-center text-lg"
            />
            <FormError message={error} />
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Abbrechen
              </Button>
              <Button size="sm" onClick={save} disabled={isPending}>
                {isPending ? "Speichern…" : "Speichern"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="font-affirmation text-3xl leading-tight font-medium tracking-tight text-foreground sm:text-4xl">
              {mantra}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={open}
              className="gap-1.5 text-muted-foreground"
              aria-label="Mantra bearbeiten"
            >
              <Pencil className="size-3.5" />
              Bearbeiten
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Reframe-Karten
// ---------------------------------------------------------------------------

/** Geteiltes Formular für „bearbeiten" und „hinzufügen". */
function CardForm({
  initialThought,
  initialReframe,
  pending,
  error,
  onSubmit,
}: {
  initialThought: string;
  initialReframe: string;
  pending: boolean;
  error: string | null;
  onSubmit: (thought: string, reframe: string) => void;
}) {
  const [thought, setThought] = useState(initialThought);
  const [reframe, setReframe] = useState(initialReframe);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="card-thought">Der Gedanke</Label>
        <Textarea
          id="card-thought"
          value={thought}
          maxLength={CARD_MAX}
          onChange={(e) => setThought(e.target.value)}
          placeholder="Was geht dir durch den Kopf?"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="card-reframe">Der Reframe</Label>
        <Textarea
          id="card-reframe"
          value={reframe}
          maxLength={CARD_MAX}
          onChange={(e) => setReframe(e.target.value)}
          placeholder="Wie kannst du es liebevoller sehen?"
        />
      </div>
      <FormError message={error} />
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Abbrechen</DialogClose>
        <Button onClick={() => onSubmit(thought, reframe)} disabled={pending}>
          {pending ? "Speichern…" : "Speichern"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function EditCardDialog({
  card,
  onSave,
}: {
  card: MantraCardData;
  onSave: (thought: string, reframe: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(thought: string, reframe: string) {
    setError(null);
    startTransition(async () => {
      const ok = await onSave(thought, reframe);
      if (ok) setOpen(false);
      else setError("Bitte fülle beide Felder aus (max. 200 Zeichen).");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label="Karte bearbeiten"
          />
        }
      >
        <Pencil className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Karte bearbeiten</DialogTitle>
          <DialogDescription>
            Passe Gedanke und Reframe an deine eigene Situation an.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <CardForm
            initialThought={card.thought}
            initialReframe={card.reframe}
            pending={isPending}
            error={error}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeleteCardDialog({ onDelete }: { onDelete: () => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const ok = await onDelete();
      if (ok) setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label="Karte löschen"
          />
        }
      >
        <Trash2 className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Karte löschen?</DialogTitle>
          <DialogDescription>
            Diese Reframe-Karte wird dauerhaft entfernt.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Abbrechen</DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Einen Moment…" : "Löschen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddCardDialog({
  onAdd,
}: {
  onAdd: (thought: string, reframe: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(thought: string, reframe: string) {
    setError(null);
    startTransition(async () => {
      const ok = await onAdd(thought, reframe);
      if (ok) setOpen(false);
      else setError("Bitte fülle beide Felder aus (max. 200 Zeichen).");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="gap-2">
            <Plus className="size-4" />
            Karte hinzufügen
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neue Reframe-Karte</DialogTitle>
          <DialogDescription>
            Halte einen typischen Gedanken fest und wie du ihn umdeuten möchtest.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <CardForm
            initialThought=""
            initialReframe=""
            pending={isPending}
            error={error}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SituationCarousel({ situations }: { situations: MantraCardData[] }) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // +1 für den „Karte hinzufügen"-Tile am Ende.
  const slideCount = situations.length + 1;
  const usingDefaults = situations.length === 0 || situations[0].id == null;

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActive(index);
  };

  const scrollTo = (index: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(index, slideCount - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  };

  /**
   * Liefert die echte DB-id einer Karte. Sitzt der User noch auf den
   * Default-Beispielen, werden diese zuerst materialisiert und die id per
   * Index aufgelöst (gleiche Reihenfolge).
   */
  async function resolveId(index: number): Promise<string | null> {
    const card = situations[index];
    if (card?.id) return card.id;
    const res = await seedDefaultCardsAction();
    if (res.error) return null;
    return res.cards[index]?.id ?? null;
  }

  async function handleUpdate(
    index: number,
    thought: string,
    reframe: string,
  ): Promise<boolean> {
    const id = await resolveId(index);
    if (!id) return false;
    const res = await updateCardAction(id, thought, reframe);
    if (res.success) {
      router.refresh();
      return true;
    }
    return false;
  }

  async function handleDelete(index: number): Promise<boolean> {
    const id = await resolveId(index);
    if (!id) return false;
    const res = await deleteCardAction(id);
    if (res.success) {
      router.refresh();
      return true;
    }
    return false;
  }

  async function handleAdd(thought: string, reframe: string): Promise<boolean> {
    // Auf Defaults zuerst materialisieren, damit die Beispiele erhalten bleiben.
    if (usingDefaults) {
      const seed = await seedDefaultCardsAction();
      if (seed.error) return false;
    }
    const res = await addCardAction(thought, reframe);
    if (res.success) {
      router.refresh();
      return true;
    }
    return false;
  }

  return (
    <div className="w-full">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {situations.map((s, i) => (
          <div key={s.id ?? `default-${i}`} className="w-full shrink-0 snap-center px-1">
            <Card className="h-full bg-card/60">
              <CardContent className="space-y-4 py-2">
                <div className="flex items-start justify-end gap-1">
                  {/* Immer sichtbar (kein hover-only) — Touch-tauglich. */}
                  <EditCardDialog
                    card={s}
                    onSave={(t, r) => handleUpdate(i, t, r)}
                  />
                  <DeleteCardDialog onDelete={() => handleDelete(i)} />
                </div>
                <div className="space-y-1">
                  <SectionLabel>Der Gedanke</SectionLabel>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    „{s.thought}“
                  </p>
                </div>
                <div className="space-y-1">
                  <SectionLabel>Der Reframe</SectionLabel>
                  <p className="text-base leading-relaxed text-foreground">
                    {s.reframe}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}

        {/* „Karte hinzufügen"-Tile */}
        <div className="w-full shrink-0 snap-center px-1">
          <Card className="h-full border-dashed bg-card/30">
            <CardContent className="flex h-full min-h-[8rem] flex-col items-center justify-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Eine eigene Situation festhalten?
              </p>
              <AddCardDialog onAdd={handleAdd} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Vorherige Situation"
          disabled={active === 0}
          onClick={() => scrollTo(active - 1)}
        >
          <ChevronLeft />
        </Button>

        <div className="flex items-center gap-2" role="group" aria-label="Situationen">
          {Array.from({ length: slideCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={i === slideCount - 1 ? "Karte hinzufügen" : `Situation ${i + 1}`}
              aria-current={i === active}
              onClick={() => scrollTo(i)}
              className={`size-2 rounded-full transition-colors ${
                i === active ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Nächste Situation"
          disabled={active === slideCount - 1}
          onClick={() => scrollTo(active + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section-Komponente (Seiten-Chrome liefert confidence-booster.tsx)
// ---------------------------------------------------------------------------

export function MantraRitual({
  doneToday,
  streak,
  mantra,
  cards,
}: {
  doneToday: boolean;
  streak: number;
  mantra: string;
  cards: MantraCardData[];
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    logCleanserCheckinAction,
    INITIAL_STATE,
  );

  // Optimistic done-state: either it was already done, or this session just logged it.
  const done = doneToday || state.success;
  const displayStreak = doneToday ? streak : state.success ? streak + 1 : streak;

  // Re-sync server data once the check-in succeeds for the first time.
  useEffect(() => {
    if (state.success && !doneToday) {
      router.refresh();
    }
  }, [state.success, doneToday, router]);

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <p className="text-center text-sm text-muted-foreground/80">
        Mach dieses Ritual zu deinem — Mantra und Karten kannst du anpassen.
      </p>

      {/* Mantra */}
      <MantraBlock mantra={mantra} />

      {/* Reframe-Karten */}
      <SituationCarousel situations={cards} />

      {/* Check-in */}
      <div className="flex w-full flex-col items-center gap-3">
        {done ? (
          <Button
            size="lg"
            variant="outline"
            className="w-full gap-2"
            disabled
          >
            <Check className="text-primary" />
            Schon erledigt heute
          </Button>
        ) : (
          <form action={formAction} className="w-full">
            <Button type="submit" size="lg" className="w-full" disabled={isPending}>
              {isPending ? "Einen Moment…" : "Heute reflektiert"}
            </Button>
          </form>
        )}

        {displayStreak > 0 ? (
          <p className="text-sm text-muted-foreground">
            🔥 {displayStreak} {displayStreak === 1 ? "Tag" : "Tage"} in Folge
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Heute startest du.</p>
        )}

        <FormError message={state.error} />
      </div>
    </div>
  );
}
