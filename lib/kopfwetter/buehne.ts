/**
 * Die Koordinaten der Kopfwetter-Bühne — wo die fünf Systeme sitzen (KAN-54).
 *
 * Bewusst getrennt vom Druckfeld: hier stehen nur Zahlen und eine Formel, das
 * Modul kostet beim Laden nichts. `druckfeld.ts` rechnet daneben ein ganzes
 * Isobaren-Feld aus — wer nur wissen will, wo eine Zeile hängt (das Gerüst in
 * `loading.tsx`), soll diesen Preis nicht bezahlen.
 *
 * Beide Seiten der Bühne beziehen sich auf dieselben Zahlen: `druckfeld.ts`
 * setzt seine Tiefs auf `ZEILEN_Y`, die Zeilen hängen an `zeilenAnker`. Deshalb
 * sitzen die Augen der Tiefs exakt auf den Motiv-Mitten — im ersten Anlauf des
 * Entwurfs lagen sie auseinander, weil es zwei Zahlenreihen gab.
 */

/** Entwurfsbreite der Bühne. Die Feld-SVG skaliert waagerecht mit
 *  (`preserveAspectRatio="none"`), die Zeilen hängen an `AUGE_X_PROZENT` —
 *  dadurch bleiben Auge und Tief bei jeder Breite deckungsgleich. */
export const BUEHNE_BREITE = 375;

/** Wie weit das Feld über die Zellen-Bühne hinaus nach oben reicht — hinter den
 *  Seitenkopf. Ohne diesen Vorlauf begänne die Karte erst unter der Frage und
 *  hätte eine sichtbare Oberkante.
 *
 *  Der Wert reicht bei 375 px bis knapp über den Titel: die Karte setzt oberhalb
 *  des Textes an und ist über die Maske (`.kw-karten-grund`) auf Höhe der Frage
 *  voll da — der Übergang in den Nachthimmel liegt über dem Text, nicht mitten
 *  in der Seite.
 *
 *  Nach oben ist der Wert **begrenzt**, nicht beliebig: `main` trägt selbst
 *  `overflow-x-clip`. Ragt das Feld über dessen Oberkante hinaus, steht die
 *  Kante nur woanders — direkt unter der Statusleiste statt in der Seitenmitte.
 *  Der Kopf ist rund 200 px hoch; mehr Vorlauf als das kauft nichts. */
export const FELD_KOPF = 200;

/** Kantenlänge des Motivs im Auge (= `size-16`). */
export const AUGE = 64;

/** Abstand des Link-Kastens vom Bühnenrand und sein eigenes Innenpolster
 *  (`px-3`). Zusammen mit `AUGE` ergibt das die Mitte des Motivs. */
export const ZEILEN_RAND = 12;
export const ZEILEN_POLSTER = 12;

/** Waagerechte Mitte des Auges in Bühnen-Koordinaten (linke Zeilen). */
export const AUGE_CX = ZEILEN_RAND + ZEILEN_POLSTER + AUGE / 2;

/** Dieselbe Mitte als Prozentwert der Bühnenbreite — so wandert sie mit, wenn
 *  die Bühne breiter oder schmaler als die Entwurfsbreite ist. */
export const AUGE_X_PROZENT = (AUGE_CX / BUEHNE_BREITE) * 100;

/** Höhe eines Zeilen-Kastens. Fest, damit die Zeile ohne Messung mittig auf
 *  ihrem Auge sitzt — der Text zentriert sich darin und wächst symmetrisch. */
export const ZEILEN_H = 104;

/** Senkrechter Abstand zweier Augen. */
const ZEILEN_ABSTAND = 148;
/** Luft über der ersten und unter der letzten Zeile. */
const ZEILEN_LUFT = 92;

/** Augenhöhen in Koordinaten der **Zellen-Bühne** (ohne `FELD_KOPF`). */
export const ZEILEN_Y = [0, 1, 2, 3, 4].map(
  (i) => ZEILEN_LUFT + i * ZEILEN_ABSTAND,
);

/** Höhe der Zellen-Bühne. */
export const ZELLEN_H = ZEILEN_LUFT * 2 + ZEILEN_ABSTAND * 4;

/** Höhe des Feldes = Vorlauf hinter dem Kopf + Zellen-Bühne. */
export const FELD_H = FELD_KOPF + ZELLEN_H;

/** Die Kante, an der eine Zeile hängt — der mäandernde Weg über die Karte.
 *  Englisch, weil es zugleich der Name der CSS-Eigenschaft ist. */
export function zeilenSeite(i: number): "left" | "right" {
  return i % 2 === 0 ? "left" : "right";
}

/**
 * Wo eine Zeile auf der Bühne sitzt, fertig als CSS-Kanten.
 *
 * Waagerecht in **Prozent der Bühnenbreite** (dann um halbes Auge plus
 * Innenpolster zurück auf die Kante des Link-Kastens): so trifft die Motiv-Mitte
 * das Auge des Tiefs auch dort, wo die Bühne nicht 375 px breit ist — die
 * Feld-SVG wird ja mitgedehnt. Die Formel steht genau hier, nicht an jeder
 * Aufrufstelle: eine Konstante zu ändern, ohne die verbrauchende Rechnung
 * mitzuziehen, ist der Weg, auf dem Feld und Motiv auseinanderlaufen.
 */
export function zeilenAnker(i: number): {
  top: number;
  left?: string;
  right?: string;
} {
  return {
    top: ZEILEN_Y[i] - ZEILEN_H / 2,
    [zeilenSeite(i)]: `calc(${AUGE_X_PROZENT}% - ${AUGE / 2 + ZEILEN_POLSTER}px)`,
  };
}
