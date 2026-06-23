"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Pencil, PenLine, Sparkles, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { RecipeIntro } from "@/components/recipes/recipe-intro";
import { getRecipeIntro } from "@/lib/utils/recipe-intros";
import { markRecipeIntroSeenAction } from "@/app/(app)/recipes/actions";
import { saveRightsAction } from "@/app/(app)/recipes/bill-of-rights/actions";

type Right = { id: string; text: string; active: boolean };

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

export function BillOfRightsMe({
  initialRights,
  introSeen,
}: {
  initialRights: Right[];
  introSeen: boolean;
}) {
  const [rights, setRights] = useState<Right[]>(initialRights);
  const [introDismissed, setIntroDismissed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  async function persist(updated: Right[]) {
    setRights(updated);
    const fd = new FormData();
    fd.set("rights", JSON.stringify(updated));
    await saveRightsAction({ error: null, success: false }, fd);
  }

  // Intro-Sequenz beim ersten Besuch.
  if (!introSeen && !introDismissed && INTRO_CARDS.length > 0) {
    const dismiss = () => {
      setIntroDismissed(true);
      void markRecipeIntroSeenAction("bill-of-rights");
    };
    return (
      <div className="flex min-h-svh flex-col">
        <SubPageHeader backHref="/me" title="Meine Bill of Rights" />
        <div className="flex flex-1 flex-col justify-center">
          <RecipeIntro cards={INTRO_CARDS} onComplete={dismiss} onSkip={dismiss} />
        </div>
      </div>
    );
  }

  const activeRights = rights.filter((r) => r.active);

  function startEdit(r: Right) {
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
      <SubPageHeader backHref="/me" title="Meine Bill of Rights" />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        {activeRights.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Du hast noch keine Rechte definiert.
            </p>
            <Button render={<Link href="/me/bill-of-rights/add" />}>
              Dein erstes Recht hinzufügen
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeRights.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex items-start gap-2">
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
                      <p className="flex-1 text-sm leading-relaxed text-foreground">
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Immer sichtbar: zwei Wege, ein Recht hinzuzufügen */}
        <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
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
      </div>
    </div>
  );
}
