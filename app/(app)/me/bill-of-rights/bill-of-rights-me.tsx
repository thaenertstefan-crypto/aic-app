"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Pencil, PenLine, Sparkles, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { RecipeIntroGate } from "@/components/recipes/recipe-intro-gate";
import { IntroInfoButton } from "@/components/intro/intro-info-button";
import { MascotJudge } from "@/components/brand/mascot-judge";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { saveRightsAction } from "@/app/(app)/recipes/bill-of-rights/actions";
import type { RightItem } from "@/lib/types/db-json";

const INTRO_CARDS = getRecipeIntro("bill-of-rights") ?? [];

/** Ensure a right reads as a full affirmation sentence. */
function asAffirmation(text: string): string {
  return text.startsWith("Ich habe das Recht")
    ? text
    : `Ich habe das Recht, ${text}`;
}

function ActionTile({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof PenLine;
  label: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full transition-colors hover:bg-muted/40">
        <CardContent className="flex h-full flex-col items-center gap-2 text-center">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Icon className="size-4" />
          </div>
          <p className="text-sm font-medium text-foreground">{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function ActionTiles({ className }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className ?? ""}`}>
      <ActionTile
        href="/me/bill-of-rights/add"
        icon={PenLine}
        label="Manuell hinzufügen"
      />
      <ActionTile
        href="/me/bill-of-rights/generate"
        icon={Sparkles}
        label="Vorschlag generieren"
      />
    </div>
  );
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
  // Folgt dem Gate-Zustand (nicht nur der server-gelieferten Prop), damit das
  // Richter-Maskottchen schon beim ersten Durchklicken der Intro erscheint und
  // nicht erst beim erneuten Öffnen der Seite.
  const [introDone, setIntroDone] = useState(introSeen);

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
    const result = await saveRightsAction({ error: null, success: false }, fd);
    if (result.error) {
      setRights(previous);
      setSaveError(result.error);
    } else if (result.rights) {
      // Mit dem gemergten Server-Stand synchronisieren (inkl. evtl. parallel
      // hinzugefügter Rechte), statt rein optimistisch zu bleiben.
      setRights(result.rights);
    }
  }

  const activeRights = rights.filter((r) => r.active);

  function startEdit(r: RightItem) {
    setEditingId(r.id);
    setEditText(r.text);
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
    <div className="flex min-h-svh flex-col">
      <SubPageHeader
        backHref="/me"
        title="Meine Bill of Rights"
        action={
          INTRO_CARDS.length > 0 ? (
            <IntroInfoButton cards={INTRO_CARDS} />
          ) : undefined
        }
      />

      {/* Maskottchen als Richter — nur sobald die Intro-Sequenz vorbei ist. */}
      {introDone && (
        <div className="flex justify-center px-4 pt-6">
          <MascotJudge />
        </div>
      )}

      <RecipeIntroGate
        slug="bill-of-rights"
        cards={INTRO_CARDS}
        introSeen={introSeen}
        onSeen={() => setIntroDone(true)}
      >
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
          <p className="text-center text-base leading-relaxed text-muted-foreground">
            Diese Regeln hast du dir selbst gegeben – sie sind deine
            persönlichen Rechte. Komm hierher zurück, wann immer du eine
            Erinnerung brauchst, was du dir erlauben darfst.
          </p>
          <FormError message={saveError} />
          {activeRights.length === 0 ? (
            <div className="flex flex-col gap-4">
              <p className="text-center text-base text-muted-foreground">
                Du hast noch keine Rechte definiert.
                <br />
                Füge dein erstes Recht hinzu.
              </p>
              <ActionTiles />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {activeRights.map((r, i) => (
                  <Card key={r.id}>
                    <CardContent className="flex items-start gap-3">
                      <span className="w-10 shrink-0 self-center text-center font-heading text-xl font-semibold text-primary">
                        § {i + 1}
                      </span>
                      <div className="flex flex-1 items-start gap-2">
                        {editingId === r.id ? (
                          <>
                            <Input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="flex-1"
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={saveEdit}
                              aria-label="Speichern"
                            >
                              <Check className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                              aria-label="Abbrechen"
                            >
                              <X className="size-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="flex-1 text-base leading-relaxed text-foreground">
                              {asAffirmation(r.text)}
                            </p>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => startEdit(r)}
                              aria-label="Bearbeiten"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteRight(r.id)}
                              aria-label="Löschen"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Immer sichtbar: zwei Wege, ein Recht hinzuzufügen */}
              <ActionTiles className="mt-auto pt-4" />
            </>
          )}
        </div>
      </RecipeIntroGate>
    </div>
  );
}
