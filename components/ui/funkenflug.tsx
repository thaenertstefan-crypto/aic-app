"use client";

import { useEffect, useReducer, useRef } from "react";
import { usePathname } from "next/navigation";

import {
  advanceWarten,
  AUSBLENDEN_MS,
  type Flugstand,
  flugstand,
  initialWarten,
  MINDESTSTANDZEIT_MS,
  SCHWELLE_MS,
} from "@/lib/motion/warten";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { zoneOf } from "@/lib/utils/zone";
import { cn } from "@/lib/utils";

/**
 * **Der Funkenflug** — der eine Wartescreen der App (KAN-52/KAN-61).
 *
 * Ein Strom kleiner Teilchen, die aufsteigen und vergehen. Er greift genau
 * dort, wo es keine Seite gibt und wir an einem Dritten hängen (KI oder Netz)
 * — er ist ausdrücklich **nicht das Gerüst** (`loading.tsx`, KAN-53), das die
 * Seite in ihrem ersten Frame zeigt.
 *
 * ## Der Maßstab ist die wartende Fläche
 *
 * Der Motiv-Raum hat keine feste Größe: er ist die Fläche, auf die gewartet
 * wird. Das ist der Teil, der „genau einer" über drei sehr verschiedene
 * Stellen trägt — beim Screen ist es die Bühne, bei der Region die Card, bei
 * der Zeile die wartende Karte selbst. **Es gibt keine Ersatzform für kleine
 * Flächen.** Ein auf ein 22-px-Kästchen geschrumpfter Flug wäre der
 * Ladeindikator, den KAN-30 verboten hat; stattdessen wird die Karte die
 * Bühne, und die Funken steigen über ihre volle Höhe auf.
 *
 * ## Die Zone liefert die Quelle
 *
 * Nicht nur die Farbe, sondern auch das Tempo — im Nachthimmel steigen
 * Lichtpunkte langsam in die Nacht, in der Schmiede sprühen Funken schnell aus
 * dem Feuer. Der Aufrufer wählt das nicht: es kommt aus der Route
 * (`zoneOf`), damit ein Screen nicht in der Schmiede stehen und trotzdem im
 * Nachthimmel warten kann. **Nie Gold** — die One-Candle-Rule gehört dem CTA,
 * und ein Wartescreen hat keinen.
 *
 * ## Gebrauch
 *
 * Die Zeitlogik steckt in `useFunkenflug`, nicht in fünf Wizards:
 *
 * ```tsx
 * const flug = useFunkenflug(pending);
 * …
 * <Funkenflug flug={flug} massstab="region" satz="Ich denke nach …" />
 * ```
 *
 * `flug === "aus"` rendert nichts; die Komponente prüft das selbst. Wer eine
 * **ganze Bühne** gegen den Flug tauscht (Maßstab `screen`), fragt zusätzlich
 * `flug !== "aus"` ab und hält seine Zielbühne so lange zurück — sonst reißt
 * die Antwort dem Flug die Mindeststandzeit und die Blende weg.
 */

/** Wie groß die Fläche ist, auf die gewartet wird. */
export type Massstab = "screen" | "region" | "zeile";

/**
 * Die Zeit des Flugs: Schwelle, Mindeststandzeit und Blende an einer Stelle.
 * Nimmt „wartet ja/nein" und sagt, was zu rendern ist.
 */
export function useFunkenflug(wartet: boolean): Flugstand {
  const [zustand, dispatch] = useReducer(advanceWarten, initialWarten);
  /**
   * Wann die Mindeststandzeit ausläuft. Als Ref und nicht im Zustand, weil sie
   * eine Uhrzeit ist: `advanceWarten` bleibt so ein reines Modul ohne Clock.
   * `0` heißt „keine laufende Standzeit".
   */
  const frist = useRef(0);

  useEffect(() => {
    dispatch({ type: wartet ? "warteBegonnen" : "warteBeendet" });
  }, [wartet]);

  useEffect(() => {
    switch (zustand.kind) {
      case "ruhe":
      case "haelt":
        // Beide Enden der Standzeit: die nächste beginnt wieder bei null.
        frist.current = 0;
        return;

      case "schwelle": {
        const t = setTimeout(
          () => dispatch({ type: "schwelleErreicht" }),
          SCHWELLE_MS,
        );
        return () => clearTimeout(t);
      }

      case "steht":
      case "nachlauf": {
        // EINE durchgehende Standzeit über beide Zustände hinweg: `nachlauf`
        // erbt die Frist von `steht`, sonst würde die Antwort die Uhr
        // zurückdrehen und der Flug stünde bis zu 800 ms.
        if (frist.current === 0) {
          frist.current = performance.now() + MINDESTSTANDZEIT_MS;
        }
        const t = setTimeout(
          () => dispatch({ type: "standzeitAbgelaufen" }),
          Math.max(0, frist.current - performance.now()),
        );
        return () => clearTimeout(t);
      }

      case "geht": {
        frist.current = 0;
        const t = setTimeout(
          () => dispatch({ type: "ausgeblendet" }),
          AUSBLENDEN_MS,
        );
        return () => clearTimeout(t);
      }
    }
  }, [zustand]);

  return flugstand(zustand);
}

/** Die Zone liefert Farbe UND Tempo. Nie Gold. */
const ZONEN = {
  nachthimmel: { farbe: "var(--foreground)", dauer: "2.9s" },
  schmiede: { farbe: "var(--celebrate)", dauer: "1.8s" },
} as const;

/**
 * Die Bühne je Maßstab. `hoehe` ist der Motiv-Raum, `hub` die Steighöhe der
 * Funken — beim Maßstab `zeile` fast die volle Bühnenhöhe, damit die wartende
 * Karte wirklich von unten bis oben durchflogen wird.
 */
const BUEHNE = {
  screen: { hoehe: "10rem", hub: "4rem" },
  region: { hoehe: "6rem", hub: "2.75rem" },
  zeile: { hoehe: "6.5rem", hub: "5.5rem" },
} as const;

/**
 * Die Funken: feste Anzahl, feste Positionen, gleichmäßig über die Dauer
 * gestreute Delays. `verzug` ist ein **Bruchteil der Dauer**, kein Wert in
 * Sekunden — so bleibt die Streuung gleichmäßig, wenn die Zone das Tempo
 * wechselt, und dieselbe Zahl liefert bei `prefers-reduced-motion` die
 * Standposition (wie weit der Funke gekommen wäre).
 *
 * Deterministisch statt `Math.random()`, sonst gäbe es einen
 * Hydration-Mismatch.
 */
const FUNKEN = [
  { links: 30, groesse: 8, verzug: 0.0 },
  { links: 60, groesse: 6, verzug: 0.17 },
  { links: 46, groesse: 9, verzug: 0.33 },
  { links: 74, groesse: 5, verzug: 0.5 },
  { links: 22, groesse: 6, verzug: 0.67 },
  { links: 54, groesse: 7, verzug: 0.83 },
] as const;

export function Funkenflug({
  flug,
  massstab,
  satz,
  className,
}: {
  flug: Flugstand;
  massstab: Massstab;
  /** Ein FESTER Satz je Einsatzstelle — kein wechselnder, keine Rotation. */
  satz: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const zone = ZONEN[zoneOf(usePathname())];
  const buehne = BUEHNE[massstab];

  if (flug === "aus") return null;

  const funken = (
    <>
      {FUNKEN.map((f, i) => (
        <span
          key={i}
          className="funkenflug-funke"
          style={{
            left: `${f.links}%`,
            width: `${f.groesse}px`,
            height: `${f.groesse}px`,
            ...(reduced
              ? {
                  // Die stehende Szene: dieselben Funken, eingefroren dort, wo
                  // sie gerade wären. Er ist Information, keine Zierde.
                  animation: "none",
                  opacity: 0.55,
                  bottom: `calc(${f.verzug} * ${buehne.hub})`,
                }
              : { animationDelay: `calc(${f.verzug} * ${zone.dauer})` }),
          }}
        />
      ))}
    </>
  );

  const stil = {
    "--funkenflug-farbe": zone.farbe,
    "--funkenflug-dauer": zone.dauer,
    "--funkenflug-hub": buehne.hub,
    // Die Blende wird von hier gesetzt, damit die Dauer der Animation und die
    // Dauer des Zustands `geht` DIESELBE Zahl sind (siehe globals.css).
    "--funkenflug-blende": `${AUSBLENDEN_MS}ms`,
  } as React.CSSProperties;

  // Ein- und Ausblenden: ~200 ms Opacity, kein Slide (KAN-30).
  const blende = flug === "geht" ? "funkenflug-aus" : "einblenden";

  if (massstab === "zeile") {
    // Die wartende Karte WIRD die Bühne: die Funken liegen als Schicht über
    // ihrer vollen Höhe, der Satz steht daneben — hinter und neben dem Text.
    return (
      <div
        data-e2e="funkenflug"
        aria-busy="true"
        className={cn(
          "relative flex items-center overflow-hidden",
          blende,
          className,
        )}
        style={{ ...stil, minHeight: buehne.hoehe }}
      >
        <span aria-hidden className="pointer-events-none absolute inset-0">
          {funken}
        </span>
        <p className="relative font-heading text-sm leading-relaxed text-muted-foreground">
          {satz}
        </p>
      </div>
    );
  }

  return (
    <div
      data-e2e="funkenflug"
      aria-busy="true"
      className={cn(
        "flex w-full flex-col items-center gap-4",
        blende,
        className,
      )}
      style={stil}
    >
      <span
        aria-hidden
        className="relative w-full max-w-xs"
        style={{ height: buehne.hoehe }}
      >
        {funken}
      </span>
      <p
        className={cn(
          "text-center font-heading leading-relaxed text-muted-foreground",
          massstab === "screen" ? "text-base" : "text-sm",
        )}
      >
        {satz}
      </p>
    </div>
  );
}
