/**
 * Count consecutive days (including the anchor day) that exist in `dates`,
 * walking backwards one day at a time.
 */
export function computeStreak(dates: Set<string>, doneToday: boolean): number {
  const cursor = new Date();
  // If today isn't done yet, the running streak is anchored at yesterday.
  if (!doneToday) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let streak = 0;
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
