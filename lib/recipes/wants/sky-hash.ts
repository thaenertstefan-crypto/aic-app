/**
 * Der Streuwert, der aus einer Liste einen **Himmel** macht — als reines
 * Modul, damit er unter `node --test` fällt.
 *
 * Zwei Flächen der Wants-Übung setzen ihre Punkte auf dieselbe Slot-Leiter
 * (links/rechts versetzt von oben nach unten) und holen sich den Versatz im
 * Slot aus der ID: die Sternenkarte (`app/(app)/me/wants/star-map.tsx`) und
 * die Funken-Konstellation (`components/wants/funken-sky.tsx`). Ohne diesen
 * Versatz stehen beide als Zweispalten-Raster da.
 *
 * Die **Geometrie** der beiden Himmel bleibt bewusst getrennt: Werte wie
 * `COL_X_INNER` oder `X_JITTER` sind dort zwar wertgleich, bedeuten aber
 * Verschiedenes (auf der Karte kaufen sie dem Namen Platz, in der
 * Konstellation sind sie reine Optik). Nur der Hash ist wirklich derselbe.
 */

/**
 * Stabiler Hash 0..1 aus einem String — gleicher Himmel bei jedem Besuch.
 *
 * FNV-1a mit Nachmischen (fmix32). Das Nachmischen ist nicht Zierde: die
 * Vorgänger-Fassung (`h * 31 + c`, dann `h % 1000`) ließ benachbarte IDs auf
 * fast denselben Wert fallen — bei den tatsächlichen IDs, die sich nur im
 * letzten Zeichen unterscheiden, lagen alle Werte innerhalb von 0,001. Der
 * Versatz war damit rechnerisch da und sichtbar tot.
 *
 * Die Positionen werden nirgends gespeichert, sie werden bei jedem Rendern neu
 * gerechnet — deshalb muss derselbe Seed für immer denselben Wert geben.
 */
export function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
