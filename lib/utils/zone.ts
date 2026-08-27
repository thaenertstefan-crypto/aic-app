/**
 * Die Farbzonen der App — welcher Boden unter einer Route liegt.
 *
 * Der Nachthimmel ist die Bildwelt und damit der Normalfall; die Schmiede ist
 * die eine Subpage, die ihre eigene Wärme mitbringt (Rosé statt Gold, heiße
 * Esse statt Nacht).
 *
 * Warum das als eigenes Modul und nicht als `if` in `ZoneTheme`: seit dem
 * Funkenflug (KAN-61) fragt eine zweite Stelle dieselbe Frage, und beide
 * müssen dieselbe Antwort bekommen. Der Wartescreen nimmt seine Farbe **und
 * sein Tempo** aus der Zone — stünde die Regel zweimal da, könnte ein neuer
 * Screen in der Schmiede stehen und trotzdem im Nachthimmel warten.
 */

export type Zone = "nachthimmel" | "schmiede";

/** Der Pfad-Präfix, unter dem die Schmiede-Zone gilt. */
const SCHMIEDE = "/me/wants/schmiede";

export function zoneOf(pathname: string): Zone {
  return pathname.startsWith(SCHMIEDE) ? "schmiede" : "nachthimmel";
}
