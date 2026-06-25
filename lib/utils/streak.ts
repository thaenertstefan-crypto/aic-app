import { utcDateKey } from "./date";

/** Vorheriger Kalendertag-Key zu "YYYY-MM-DD" — reine Key-Arithmetik (Key als
 *  UTC-Mitternacht parsen, −1 Tag). Kalendarisch korrekt und TZ-unabhängig. */
function prevDayKey(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return utcDateKey(d);
}

/**
 * Count consecutive days (including today) present in `dates`, walking backwards
 * one calendar day at a time, anchored at `todayKey`.
 *
 * `todayKey` ist der heutige Tages-Key in der **User-Zeitzone** (vom Aufrufer
 * via serverTodayKey() bestimmt). Ist heute noch nicht erledigt, beginnt die
 * Zählung bei gestern. Rein string-basiert → unabhängig von der Server-TZ.
 */
export function computeStreak(dates: Set<string>, todayKey: string): number {
  let cursor = dates.has(todayKey) ? todayKey : prevDayKey(todayKey);

  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = prevDayKey(cursor);
  }
  return streak;
}
