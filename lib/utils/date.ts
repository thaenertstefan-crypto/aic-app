/**
 * Zentrale Datums-Helfer.
 *
 * In Phase 13.10 kommen hier die Key-Helfer (utcDateKey/localDateKey) dazu;
 * 13.11 migriert die Aufrufer auf zeitzonenbewusste Schlüssel.
 */

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
