"use client";

import { useEffect } from "react";

import { TZ_COOKIE } from "@/lib/utils/date";

/**
 * Transportiert die echte Browser-IANA-Zeitzone als Cookie zum Server, damit
 * serverseitige Tagesgrenzen (Gating, entry_date, Streaks) in der lokalen Zeit
 * des Users berechnet werden — unabhängig von der Server-TZ (Vercel = UTC).
 *
 * Setzt das Cookie nur, wenn es fehlt oder sich geändert hat (deckt Bestands-
 * nutzer sowie Reisen ab). Rein clientseitig via document.cookie — Server
 * Components können keine Cookies setzen. Rendert nichts.
 */
export function TimezoneSync() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz) return;

      const current = document.cookie
        .split("; ")
        .find((c) => c.startsWith(`${TZ_COOKIE}=`))
        ?.slice(TZ_COOKIE.length + 1);

      if (current !== tz) {
        document.cookie = `${TZ_COOKIE}=${tz}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {
      // Intl nicht verfügbar — Server nutzt dann den Fallback.
    }
  }, []);

  return null;
}
