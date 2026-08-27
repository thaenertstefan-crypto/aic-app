import { cn } from "@/lib/utils";

/**
 * Das aufgeschlagene Logbuch — Motiv der Journal-Fläche (KAN-55 · KAN-63).
 *
 * Das Journal bekommt seinen Namen aus der Bildwelt: das Buch, das man auf der
 * Passage führt, während Kompass und Bill of Rights den Weg weisen. Der Name
 * steht nur im Bild — die Seite heißt weiter „Journal".
 *
 * Zwei Entscheidungen stecken in der Form:
 *
 * - **Das Buch, nicht die Seite.** Die drei anderen Motive zeigen die *Einheit*,
 *   mit der sich ihre Fläche füllt (Stern, Funke, Recht). Die hat das Journal
 *   nicht — ein einzelnes Blatt sagt nichts, was der Seitentitel nicht schon
 *   sagt. Also greift die **Sammlung**: der gebundene Band, in dem alles
 *   nachlesbar bleibt.
 * - **Kein Stern darüber.** Er läge nahe (Nachthimmel, Navigation) und ist
 *   trotzdem versperrt: die Sternglyphe gehört seit KAN-32 der
 *   Sternenhimmel-Fläche. Zwei Flächen mit demselben Motiv wären keine
 *   Motive mehr.
 *
 * Die Liniatur ist **gleich lang und gleich weit** — sie liest als das Lineament
 * eines leeren Buchs, nicht als Geschriebenes. Unterschiedlich lange Striche
 * wären Einträge, und dann widerspräche das Bild dem Satz darunter.
 *
 * Bewusst ohne Bewegung: ein Logbuch liegt still. Das Funkeln gehört dem Stern,
 * und „Leben statt Fortschritt" gehört dem Wartescreen (KAN-52).
 */
export function LogbookArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("size-16 shrink-0", className)}
      // Engerer Schein als beim Stern: der glüht aus einer Spitze heraus, hier
      // liegt eine fast rechteckige Fläche darunter — ein weiter Radius bliebe
      // als heller Kasten stehen und läse sich als Karte hinter der Glyphe.
      style={{
        filter:
          "drop-shadow(0 0 7px color-mix(in srgb, var(--primary) 24%, transparent))",
      }}
    >
      {/* Die beiden Seiten. Der Rücken sitzt am Kopf tiefer und am Fuß tiefer
          als die Außenkanten — daher wölbt sich das Buch dem Blick entgegen. */}
      <path
        d="M32 24 C 28 20, 20 19, 9 20 L 9 43 C 20 42, 28 43, 32 47 Z"
        fill="var(--primary)"
        fillOpacity="0.07"
        stroke="var(--primary)"
        strokeOpacity="0.55"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M32 24 C 36 20, 44 19, 55 20 L 55 43 C 44 42, 36 43, 32 47 Z"
        fill="var(--primary)"
        fillOpacity="0.07"
        stroke="var(--primary)"
        strokeOpacity="0.55"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Der Rücken */}
      <path
        d="M32 24 L 32 47"
        stroke="var(--primary)"
        strokeOpacity="0.7"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Liniatur — drei Zeilen je Seite, der Neigung der Seite folgend */}
      <g
        stroke="var(--primary)"
        strokeOpacity="0.24"
        strokeWidth="1"
        strokeLinecap="round"
      >
        <path d="M14 27.5 L 28 30" />
        <path d="M14 32.5 L 28 35" />
        <path d="M14 37.5 L 28 40" />
        <path d="M36 30 L 50 27.5" />
        <path d="M36 35 L 50 32.5" />
        <path d="M36 40 L 50 37.5" />
      </g>
    </svg>
  );
}
