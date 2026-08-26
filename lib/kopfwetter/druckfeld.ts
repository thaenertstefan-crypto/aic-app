/**
 * Das Druckfeld der Kopfwetter-Bühne — die Isobaren der synoptischen Karte
 * (KAN-54). Wo die Zeilen sitzen, steht nebenan in `buehne.ts`.
 *
 * Der Unterschied zu den früheren fünf Ringsätzen ist keine Stilfrage: Isobaren
 * gehören auf einer echten Karte **keinem Objekt**. Sie laufen über das ganze
 * Blatt, biegen sich um alle fünf Zentren zugleich und laufen aus dem Bild
 * heraus. Fünf getrennte Ringsätze sind fünf Planeten; ein durchgehendes Feld
 * ist eine Karte.
 *
 * Getragen wird das vom **Grundgradienten** in `druckAn`. Ohne ihn schließen
 * sich die Konturen wieder um jedes Zentrum und man hat erneut fünf Objekte.
 *
 * `ISOBAREN` wird **einmal beim Laden des Moduls** gerechnet, nie pro Render:
 * das Feld ist deterministisch aus den Konstanten hier und in `buehne.ts`
 * ableitbar. Wer das Feld nicht braucht, importiert `buehne.ts` — dieses Modul
 * zu laden kostet die ganze Rechnung.
 */

import {
  AUGE_CX,
  BUEHNE_BREITE,
  FELD_H,
  FELD_KOPF,
  ZEILEN_Y,
  zeilenSeite,
} from "./buehne.ts";

type Zentrum = {
  x: number;
  y: number;
  amp: number;
  /** Lange Halbachse der Senke. */
  lang: number;
  /** Kurze Halbachse. Die beiden zusammen machen aus dem Kreis eine Ellipse —
   *  ein rundes Tief liest als Zielscheibe, ein verzogenes als Wetter. */
  quer: number;
  /** Drehung der langen Achse, im Bogenmaß. */
  dreh: number;
};

const AMP = [1.0, 0.92, 0.96, 0.88, 1.02];

/** Radius der Senken. Leicht verschieden, damit das Feld nicht wie ein Muster
 *  aus fünf Stempeln liest. */
const SIGMA = [88, 81, 84, 79, 90];

/**
 * Wie stark die Senke aus dem Kreis gezogen wird: lange Halbachse mal, kurze
 * geteilt. Die Fläche bleibt dieselbe, nur die Form ändert sich.
 *
 * Der Wert ist nach oben **durch das Auge begrenzt, nicht durch die Rechnung**.
 * Ab etwa dem Anderthalbfachen liegen fünf deutlich verzogene Formen in fünf
 * verschiedenen Winkeln auf dem Blatt, und das liest unruhig — die Karte hat
 * dann keine Ruherichtung mehr. Hier reicht die lange Achse knapp das Doppelte
 * der kurzen: sichtbar oval, aber kein eigener Blickfang.
 */
const STRECKUNG = 1.35;

/**
 * Wohin die langen Achsen zeigen, in Grad.
 *
 * Nicht beliebig gewählt: die Zeilen zickzacken im Winkel von rund 29° über die
 * Bühne, jedes Tief hat seinen nächsten Nachbarn also in dieser Richtung.
 * **Quer** dazu gestreckt (~119°) hält die Senken auseinander — jedes Motiv
 * behält sein eigenes, geschlossenes Tief. Längs gestreckt liefen sie
 * ineinander und zwei der fünf Booster säßen auf einem gemeinsamen Trog statt
 * auf eigenem Wetter. Die Streuung um 119° herum nimmt dem Feld die
 * Gleichförmigkeit.
 */
const DREHUNG = [105, 119, 133, 112, 126];

export const ZENTREN: readonly Zentrum[] = ZEILEN_Y.map((y, i) => ({
  x: zeilenSeite(i) === "left" ? AUGE_CX : BUEHNE_BREITE - AUGE_CX,
  y: FELD_KOPF + y,
  amp: AMP[i],
  lang: SIGMA[i] * STRECKUNG,
  quer: SIGMA[i] / STRECKUNG,
  dreh: (DREHUNG[i] * Math.PI) / 180,
}));

/** Amplitude und Wellenzahlen der Grundwelle. Sehr langwellig — sie soll das
 *  Blatt wölben, nicht mustern. */
const WELLE = 0.1;
const WELLE_X = 2.4;
const WELLE_Y = 5.2;

/**
 * Das Blatt ohne die Tiefs: ein Gefälle nach unten und nach rechts, dem eine
 * sehr langwellige Welle die Ebenheit nimmt.
 *
 * Eigene Funktion, weil sich nur so prüfen lässt, dass die Welle überhaupt
 * wirkt — in `druckAn` überlagern die fünf Senken sie überall.
 */
export function grundlageAn(x: number, y: number): number {
  return (
    0.55 * (y / FELD_H) +
    0.3 * (x / BUEHNE_BREITE) +
    WELLE * Math.sin((x / BUEHNE_BREITE) * WELLE_X + (y / FELD_H) * WELLE_Y)
  );
}

/**
 * Der Druck an einem Punkt: eine sanft gewellte Grundlage minus fünf
 * Gauß-Senken.
 *
 * Der Gradient ist der tragende Teil — er kippt das ganze Blatt, sodass die
 * Konturen quer darüber laufen und aus dem Bild herausführen, statt sich um
 * jedes Zentrum zu schließen. Die Welle darauf nimmt ihm die Ebenheit: ohne sie
 * laufen die Linien zwischen den Tiefs schnurgerade, und gerade Isobaren gibt
 * es auf keiner Wetterkarte.
 */
export function druckAn(x: number, y: number): number {
  let p = grundlageAn(x, y);

  for (const z of ZENTREN) {
    const dx = x - z.x;
    const dy = y - z.y;
    // In das gedrehte Achsenkreuz der Ellipse hinein …
    const u = dx * Math.cos(z.dreh) + dy * Math.sin(z.dreh);
    const v = -dx * Math.sin(z.dreh) + dy * Math.cos(z.dreh);
    p -=
      z.amp *
      Math.exp(-((u * u) / (2 * z.lang * z.lang) + (v * v) / (2 * z.quer * z.quer)));
  }
  return p;
}

type Punkt = readonly [number, number];
type Segment = readonly [Punkt, Punkt];
type Gitter = { werte: number[][]; spalten: number; zeilen: number };

/** Gitterschritt der Konturberechnung. Feiner kostet nur Pfadlänge, gröber
 *  macht aus den Isobaren ein Polygon. */
const SCHRITT = 5;

/** Das Druckgitter — einmal für alle Level, nicht je Level neu. */
function druckGitter(): Gitter {
  const spalten = Math.ceil(BUEHNE_BREITE / SCHRITT);
  const zeilen = Math.ceil(FELD_H / SCHRITT);
  const werte: number[][] = [];
  for (let j = 0; j <= zeilen; j++) {
    const reihe: number[] = [];
    for (let i = 0; i <= spalten; i++) {
      reihe.push(druckAn(i * SCHRITT, j * SCHRITT));
    }
    werte.push(reihe);
  }
  return { werte, spalten, zeilen };
}

/**
 * Marching Squares: liefert die rohen Segmente einer Höhenlinie, Zelle für
 * Zelle. Verkettet werden sie erst in `verketten` — einzeln gezeichnet bekäme
 * die Linie an jeder Zellgrenze eine eigene Kappe.
 */
function segmenteAuf(gitter: Gitter, level: number): Segment[] {
  const { werte, spalten, zeilen } = gitter;
  const segmente: Segment[] = [];

  for (let j = 0; j < zeilen; j++) {
    for (let i = 0; i < spalten; i++) {
      const x0 = i * SCHRITT;
      const y0 = j * SCHRITT;
      const x1 = x0 + SCHRITT;
      const y1 = y0 + SCHRITT;
      const a = werte[j][i];
      const b = werte[j][i + 1];
      const c = werte[j + 1][i + 1];
      const d = werte[j + 1][i];

      // Bitmaske der vier Ecken über dem Level — sie bestimmt, welche Kanten
      // der Zelle die Höhenlinie schneidet.
      let muster = 0;
      if (a > level) muster |= 8;
      if (b > level) muster |= 4;
      if (c > level) muster |= 2;
      if (d > level) muster |= 1;
      if (muster === 0 || muster === 15) continue;

      // Lineare Interpolation auf der jeweiligen Zellkante.
      const oben = (): Punkt => [x0 + (SCHRITT * (level - a)) / (b - a), y0];
      const rechts = (): Punkt => [x1, y0 + (SCHRITT * (level - b)) / (c - b)];
      const unten = (): Punkt => [x0 + (SCHRITT * (level - d)) / (c - d), y1];
      const links = (): Punkt => [x0, y0 + (SCHRITT * (level - a)) / (d - a)];

      switch (muster) {
        case 1:
        case 14:
          segmente.push([links(), unten()]);
          break;
        case 2:
        case 13:
          segmente.push([unten(), rechts()]);
          break;
        case 3:
        case 12:
          segmente.push([links(), rechts()]);
          break;
        case 4:
        case 11:
          segmente.push([oben(), rechts()]);
          break;
        case 6:
        case 9:
          segmente.push([oben(), unten()]);
          break;
        case 7:
        case 8:
          segmente.push([links(), oben()]);
          break;
        case 5:
          segmente.push([links(), oben()], [unten(), rechts()]);
          break;
        case 10:
          segmente.push([links(), unten()], [oben(), rechts()]);
          break;
      }
    }
  }

  return segmente;
}

const schluessel = (p: Punkt) =>
  `${Math.round(p[0] * 100)}|${Math.round(p[1] * 100)}`;

/**
 * Verkettet die Segmente einer Höhenlinie zu durchgehenden Linienzügen. Jedes
 * Segment endet auf einer Zellkante, auf der genau ein weiteres beginnt — daher
 * genügt eine Nachbarschaftstabelle über die Endpunkte.
 *
 * Gelaufen wird von einem beliebigen Startsegment aus in **beide** Richtungen:
 * bei offenen Linien (die aus dem Bild laufen) ist der Start sonst irgendwo in
 * der Mitte und die halbe Linie fiele weg. Geschlossene Ringe enden von selbst,
 * weil der nächste Kandidat dann schon verbraucht ist.
 */
function verketten(segmente: Segment[]): Punkt[][] {
  const anPunkt = new Map<string, number[]>();
  segmente.forEach((s, i) => {
    for (const p of s) {
      const k = schluessel(p);
      const liste = anPunkt.get(k);
      if (liste) liste.push(i);
      else anPunkt.set(k, [i]);
    }
  });

  const verbraucht = new Array<boolean>(segmente.length).fill(false);
  const zuege: Punkt[][] = [];

  const laufe = (zug: Punkt[], vorwaerts: boolean) => {
    for (;;) {
      const p = vorwaerts ? zug[zug.length - 1] : zug[0];
      const k = schluessel(p);
      const naechstes = (anPunkt.get(k) ?? []).find((i) => !verbraucht[i]);
      if (naechstes === undefined) return;
      verbraucht[naechstes] = true;
      const s = segmente[naechstes];
      const weiter = schluessel(s[0]) === k ? s[1] : s[0];
      if (vorwaerts) zug.push(weiter);
      else zug.unshift(weiter);
    }
  };

  for (let i = 0; i < segmente.length; i++) {
    if (verbraucht[i]) continue;
    verbraucht[i] = true;
    const zug: Punkt[] = [segmente[i][0], segmente[i][1]];
    laufe(zug, true);
    laufe(zug, false);
    zuege.push(zug);
  }

  return zuege;
}

/** Auf eine Nachkommastelle — hält die Pfad-Strings kompakt, ohne dass die
 *  Linie sichtbar eckt. */
const rund = (n: number) => n.toFixed(1);

/** Die Höhenlinie eines Levels als ein einziges `d` (mehrere `M`-Teilzüge).
 *  Leer, wenn das Level außerhalb des Wertebereichs des Feldes liegt. */
function isobareAuf(gitter: Gitter, level: number): string {
  return verketten(segmenteAuf(gitter, level))
    .filter((zug) => zug.length > 2)
    .map((zug) => `M${zug.map((p) => `${rund(p[0])},${rund(p[1])}`).join("L")}`)
    .join("");
}

/**
 * Abstand zweier Höhenlinien — der Hebel für die Luft auf dem Blatt.
 *
 * Er wirkt gleichmäßig: er nimmt dem ganzen Feld Linien, statt sie nur woanders
 * hinzuschieben. Die naheliegende Alternative — die Senken breiter machen —
 * zieht die Ringe nur auf einer Achse auseinander und presst sie auf der
 * anderen zusammen; ab etwa dem Anderthalbfachen verschmelzen außerdem
 * benachbarte Tiefs, und ein Booster steht ohne eigenes Wetter da.
 */
const LEVEL_SCHRITT = 0.18;

/** Die Enden der Rampe: innen (am Zentrum, starker Druckgradient) kräftig,
 *  außen fast nur noch angedeutet. Wenige Linien vertragen mehr Gewicht als
 *  viele — klar gezeichnet liest als Karte, blass als Textur. */
const STRICH_INNEN = { breite: 1.5, deckung: 0.48 };
const STRICH_AUSSEN = { breite: 0.9, deckung: 0.16 };

export type Isobare = {
  /** Der Druckwert dieser Höhenlinie — zugleich ihr stabiler Schlüssel. */
  level: number;
  /** Das `d` der ganzen Höhenlinie. */
  d: string;
  breite: number;
  deckung: number;
};

/**
 * Die fertigen Höhenlinien, von innen nach außen. Nah am Zentrum kräftiger —
 * ein starker Druckgradient zeichnet sich dichter und dunkler.
 *
 * Die Level kommen aus dem tatsächlichen Wertebereich des Feldes, nicht aus
 * einer gesetzten Reihe: an den Parametern oben zu drehen verschiebt diesen
 * Bereich, und eine feste Reihe hätte dann Linien, die ins Leere fallen. Das
 * Raster hängt an der Null, damit die Werte rund bleiben.
 */
export const ISOBAREN: readonly Isobare[] = (() => {
  const gitter = druckGitter();

  let tiefster = Infinity;
  let hoechster = -Infinity;
  for (const reihe of gitter.werte) {
    for (const wert of reihe) {
      if (wert < tiefster) tiefster = wert;
      if (wert > hoechster) hoechster = wert;
    }
  }

  const gezeichnet: { level: number; d: string }[] = [];
  for (
    let k = Math.ceil(tiefster / LEVEL_SCHRITT);
    k * LEVEL_SCHRITT < hoechster;
    k++
  ) {
    const level = Number((k * LEVEL_SCHRITT).toFixed(3));
    const d = isobareAuf(gitter, level);
    if (d) gezeichnet.push({ level, d });
  }

  const letzte = gezeichnet.length - 1;
  return gezeichnet.map(({ level, d }, i) => {
    const naehe = letzte === 0 ? 1 : 1 - i / letzte;
    const misch = (innen: number, aussen: number) =>
      Number((aussen + (innen - aussen) * naehe).toFixed(3));
    return {
      level,
      d,
      breite: misch(STRICH_INNEN.breite, STRICH_AUSSEN.breite),
      deckung: misch(STRICH_INNEN.deckung, STRICH_AUSSEN.deckung),
    };
  });
})();
