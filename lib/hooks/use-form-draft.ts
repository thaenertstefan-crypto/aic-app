"use client";

import { useCallback, useEffect, useState } from "react";

const DRAFT_PREFIX = "aic:draft:";

type StoredDraft<T> = {
  data: T;
  savedAt: number;
};

/**
 * Lightweight localStorage-backed draft for a single form.
 *
 * Intended as a safety net for "connection drops mid-write": when a save
 * request fails the caller persists the in-progress values with `saveDraft`,
 * and on the next page load `pendingDraft` exposes them so the user can
 * restore instead of losing their entry. A confirmed save calls `clearDraft`.
 *
 * All storage access is wrapped in try/catch so private-mode or quota errors
 * never break the form.
 */
export function useFormDraft<T>(key: string) {
  const storageKey = `${DRAFT_PREFIX}${key}`;

  // A draft discovered in storage at mount, offered for restoration.
  const [pendingDraft, setPendingDraft] = useState<T | null>(null);

  // Read on mount only (not during render) so the server and first client
  // paint agree — localStorage isn't available during SSR.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredDraft<T>;
        if (parsed && parsed.data != null) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage requires a post-mount setState
          setPendingDraft(parsed.data);
        }
      }
    } catch {
      // Corrupt or unavailable storage — nothing to restore.
    }
  }, [storageKey]);

  const saveDraft = useCallback(
    (data: T) => {
      try {
        const payload: StoredDraft<T> = { data, savedAt: Date.now() };
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {
        // Storage full or unavailable — best effort only.
      }
    },
    [storageKey],
  );

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setPendingDraft(null);
  }, [storageKey]);

  // Hide the restore prompt without deleting the stored draft. Used right
  // after the user restores values into the form — the draft stays until the
  // next successful submit clears it, so it survives another failed attempt.
  const dismissPendingDraft = useCallback(() => {
    setPendingDraft(null);
  }, []);

  return { pendingDraft, saveDraft, clearDraft, dismissPendingDraft };
}
