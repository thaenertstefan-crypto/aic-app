/**
 * Zentrale Datums-Helfer (rein, client-safe — KEIN next/headers-Import).
 * Den serverseitigen Zugriff auf die User-Zeitzone kapselt lib/server/timezone.ts.
 */

/** Standard-Zeitzone, wenn keine User-TZ bekannt/gültig ist. */
export const DEFAULT_TIME_ZONE = "Europe/Berlin";

/** Cookie-Name, unter dem die Browser-IANA-Zeitzone transportiert wird. */
export const TZ_COOKIE = "tz";

/**
 * Kalendertag-Key "YYYY-MM-DD" für `date` in der angegebenen IANA-Zeitzone.
 * Unabhängig von der Server-eigenen Zeitzone. Bei ungültiger `timeZone` wird
 * auf DEFAULT_TIME_ZONE zurückgefallen.
 */
export function localDateKeyInTz(date: Date, timeZone: string): string {
  try {
    // en-CA liefert das ISO-nahe Format YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: DEFAULT_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}

/**
 * Kalendertag-Key "YYYY-MM-DD" in **UTC** (bisheriges Standard-Muster
 * `new Date().toISOString().slice(0,10)`). Auf Vercel (Server-TZ = UTC) ist das
 * der UTC-Kalendertag — 13.11 ersetzt das, wo User-Lokalzeit nötig ist.
 */
export function utcDateKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Kalendertag-Key "YYYY-MM-DD" in der **lokalen** Zeit der ausführenden
 * Umgebung (Client-Browser bzw. Server-TZ). Spiegelt das bisherige
 * getFullYear/getMonth/getDate-Muster.
 */
export function localDateKey(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formatiert einen reinen Kalendertag-Key "YYYY-MM-DD" zu "DD.MM.YYYY".
 *
 * Bewusst rein string-basiert (split) statt über `new Date(...)`/
 * `toLocaleDateString`: Letzteres parst "YYYY-MM-DD" als UTC-Mitternacht und
 * kann den Tag in Nicht-UTC-Zonen verschieben. Erwartet einen reinen Tages-Key
 * (z. B. eine `date`-Spalte / `entry_date`), keinen vollen ISO-Timestamp.
 */
export function formatDateDE(key: string): string {
  const parts = key.split("-");
  if (parts.length !== 3) return key;
  const [year, month, day] = parts;
  return `${day}.${month}.${year}`;
}
