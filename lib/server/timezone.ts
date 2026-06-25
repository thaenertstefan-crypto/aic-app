import "server-only";

import { cookies } from "next/headers";

import { DEFAULT_TIME_ZONE, TZ_COOKIE, localDateKeyInTz } from "@/lib/utils/date";

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Liest die per Cookie transportierte Browser-Zeitzone des Users. Fällt auf
 * DEFAULT_TIME_ZONE zurück, wenn das Cookie fehlt oder ungültig ist (z. B. beim
 * allerersten Render, bevor TimezoneSync das Cookie gesetzt hat).
 */
export async function getUserTimeZone(): Promise<string> {
  const value = (await cookies()).get(TZ_COOKIE)?.value;
  return value && isValidTimeZone(value) ? value : DEFAULT_TIME_ZONE;
}

/**
 * Heutiger Kalendertag-Key "YYYY-MM-DD" in der User-Zeitzone. Zentrale
 * "heute"-Funktion für alle Server-Actions/-Pages mit Tagesgrenzen.
 */
export async function serverTodayKey(date: Date = new Date()): Promise<string> {
  return localDateKeyInTz(date, await getUserTimeZone());
}
