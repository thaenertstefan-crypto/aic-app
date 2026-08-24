import type { RightItem } from "@/lib/types/db-json";

/**
 * Das Recht des Tages — dieselbe Wahl auf jeder Fläche.
 *
 * Zwei Stellen zeigen „ein Recht für heute": das Dashboard („Heutiges Recht")
 * und der Confidence-Boost (die Power-Erinnerung vor dem Auftritt). Sie müssen
 * am selben Tag dasselbe Recht meinen — sonst widerspricht die App sich selbst
 * innerhalb einer Sitzung. Deshalb liegt die Rotation hier und nicht zweimal
 * in einer Seite.
 */

/**
 * Tag im Jahr (1–366) für einen Kalendertag-Key `"YYYY-MM-DD"`.
 *
 * Der Key kommt aus `serverTodayKey()` und trägt bereits die **Zeitzone des
 * Nutzers** — deshalb wechselt das Recht um die lokale Mitternacht und nicht
 * um die UTC-Mitternacht. Die Zerlegung rechnet danach bewusst in UTC: der Key
 * ist dann nur noch ein Datum ohne Zeitzone.
 */
export function dayOfYear(dateKey: string): number {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const now = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  return Math.floor((now - start) / 86_400_000);
}

/**
 * Wählt aus einer Bill of Rights das Recht des heutigen Tages.
 *
 * Nimmt die **ganze** Liste entgegen und filtert selbst auf `active` — dass
 * abgewählte Rechte nicht rotieren, ist Teil der Regel und soll nicht an jeder
 * Aufrufstelle neu getroffen werden. Rotiert deterministisch über den
 * Kalendertag (`Math.random` wäre im Render unrein) und gibt `null` zurück,
 * wenn kein aktives Recht da ist.
 */
export function rightOfTheDay(
  rights: RightItem[],
  todayKey: string,
): RightItem | null {
  const active = rights.filter((r) => r.active);
  if (active.length === 0) return null;
  return active[dayOfYear(todayKey) % active.length];
}
