import { BUEHNE_BREITE, FELD_H, FELD_KOPF } from "@/lib/kopfwetter/buehne";
import { ISOBAREN } from "@/lib/kopfwetter/druckfeld";

/**
 * Die Karte, auf der das Kopfwetter liegt: ein Kartengrund und ein
 * durchgehendes Isobaren-Feld (KAN-54). Reine Dekoration, deshalb `aria-hidden`
 * und ohne Zeigerereignisse.
 *
 * Drei Entscheidungen, die das Bild tragen:
 *
 * 1. **Ein Feld, keine fünf Ringsätze.** Die Linien gehören keiner Zelle, sie
 *    biegen sich um alle fünf Zentren zugleich und laufen aus dem Bild. Die
 *    Geometrie steht in `lib/kopfwetter/druckfeld.ts` und wird dort einmal beim
 *    Modul-Laden gerechnet — hier wird nur noch gezeichnet.
 * 2. **Eine Fläche, aber keine Karte-als-Box.** Der Grund löst sich oben und
 *    unten per `mask-image` in den Nachthimmel auf; er ist halbdurchlässig,
 *    damit die Sterne durchscheinen. Eine Karte mit sichtbarer Kante wäre wieder
 *    ein Objekt auf dem Schirm statt der Fläche, auf der alles liegt.
 * 3. **Der Kopf liegt schon auf der Karte.** Das Feld reicht `FELD_KOPF` über
 *    seinen Kasten hinaus nach oben hinter Titel und Frage — sonst begänne die
 *    Karte erst unter dem Text und hätte eine Oberkante. Der Kasten darüber darf
 *    deshalb **nicht** clippen (siehe `page.tsx`).
 *
 * `preserveAspectRatio="none"`: die viewBox ist die Entwurfsbreite (375). Auf
 * breiteren Schirmen dehnt sich das Feld waagerecht — und die Augen wandern über
 * `AUGE_X_PROZENT` exakt mit. `vector-effect="non-scaling-stroke"` hält die
 * Haarlinien dabei gleich dünn (vererbt nicht, gehört auf jedes Element).
 */
export function Druckfeld() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
      style={{ top: -FELD_KOPF }}
    >
      <div className="kw-karten-grund absolute inset-0" />

      <svg
        viewBox={`0 0 ${BUEHNE_BREITE} ${FELD_H}`}
        preserveAspectRatio="none"
        className="kw-isobaren absolute inset-0 size-full"
      >
        {ISOBAREN.map((iso) => (
          <path
            key={iso.level}
            d={iso.d}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={iso.breite}
            strokeOpacity={iso.deckung}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
}
