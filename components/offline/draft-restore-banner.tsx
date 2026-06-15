"use client";

import { Button } from "@/components/ui/button";

/**
 * Prompt offered on page load when an unsaved draft was found in localStorage
 * (e.g. a save that failed because the connection dropped). Lets the user pull
 * the values back into the form or discard them.
 */
export function DraftRestoreBanner({
  onRestore,
  onDiscard,
}: {
  onRestore: () => void;
  onDiscard: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/30"
    >
      <p className="text-sm text-amber-900 dark:text-amber-100">
        Du hattest einen ungespeicherten Eintrag – möchtest du ihn wiederherstellen?
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onRestore}>
          Wiederherstellen
        </Button>
        <Button size="sm" variant="ghost" onClick={onDiscard}>
          Verwerfen
        </Button>
      </div>
    </div>
  );
}
