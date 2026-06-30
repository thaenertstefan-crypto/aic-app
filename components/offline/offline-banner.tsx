"use client";

import { WifiOff } from "lucide-react";

import { useOnlineStatus } from "@/lib/hooks/use-online-status";

/**
 * App-wide indicator shown only while the browser reports being offline.
 * Reassures the user that journal entries are kept locally as drafts.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-primary/15 px-4 py-1.5 text-center text-sm font-medium text-primary"
    >
      <WifiOff className="size-3.5 shrink-0" />
      <span>Offline – deine Einträge werden lokal als Entwurf gesichert.</span>
    </div>
  );
}
