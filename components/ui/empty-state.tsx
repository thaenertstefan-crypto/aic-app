"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { fitEmptyStateHeight } from "@/lib/utils/empty-state-fit";
import { cn } from "@/lib/utils";

/**
 * Die Leer-Grammatik als Spalte (KAN-32 · KAN-55 · KAN-62).
 *
 * **Die Fläche zeigt ihr Motiv, sie malt keins dazu.** Drei Bänder von oben
 * nach unten — Motiv, Satz, CTA —, und ein Band fällt weg, wo die Fläche es
 * schon erfüllt: kein `motiv`, wo die Fläche ihr Motiv ohnehin trägt (der
 * Fokus-Stern, der Chip einer Karte); kein `cta`, wo ihr CTA schon steht (der
 * goldene „Neuer Eintrag“ über den Journal-Tabs).
 *
 * Geteilt ist nicht der Inhalt, sondern **die Spalte** — Motiv und CTA bringt
 * jede Fläche selbst mit, weil ihre Glyphe und ihre Knöpfe zu ihr gehören.
 * Geteilt ist außerdem die Zusage „passt auf einen Screen“: die Spalte misst
 * den Rest der nutzbaren Fläche und nimmt sich genau ihn
 * (`lib/utils/empty-state-fit.ts`). Deshalb gibt es diese Komponente.
 *
 * Zwei Dinge, die hier bewusst NICHT stehen:
 * - **Kein `overflow-hidden`** — es bricht den `sticky` SubPageHeader lautlos.
 * - **Kein Icon im grauen Kreis.** Das war das generische SaaS-Muster; auf den
 *   Flächen dieser App hat es nichts zu suchen.
 *
 * Nicht darunter: der leere Zustand der Belegwand (KAN-37). Dort hängt der
 * Stern `fixed` bei 26 % — eigene Spalte, sie borgt nur die Satz-Regel.
 */
type EmptyStateProps = {
  /** Glyphe der Einheit, mit der sich die Fläche füllt. Nie das Maskottchen. */
  motiv?: ReactNode;
  /** Nennt die Fläche im Werden, nie den Mangel. */
  satz: string;
  /** Zweite Zeile: die Einladung. Optional, ruhiger gesetzt als der Satz. */
  nachsatz?: string;
  /** Knöpfe am Fuß der Spalte — dort, wo sie im vollen Zustand stehen. */
  cta?: ReactNode;
  className?: string;
};

export function EmptyState({
  motiv,
  satz,
  nachsatz,
  cta,
  className,
}: EmptyStateProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();

    // Oberkante der Bottom-Nav = Ende der nutzbaren Fläche. Fehlt sie (eine
    // Fläche außerhalb des App-Layouts), endet die Fläche am Viewport.
    const nav = document.querySelector("[data-bottom-nav]");
    const navTop = nav
      ? nav.getBoundingClientRect().top
      : window.innerHeight;

    // Alles, was zwischen der Spalte und dem Ende des Seiteninhalts liegt —
    // in aller Regel das `p-4` der Seite. Der äußerste Vorfahr unter <main>
    // ist die Seite; steht die Spalte außerhalb eines <main>, bleibt der
    // Abstand 0.
    let page: HTMLElement = el;
    if (el.closest("main")) {
      while (page.parentElement && page.parentElement.tagName !== "MAIN") {
        page = page.parentElement;
      }
    }
    const pageBottom = page.getBoundingClientRect().bottom;

    setHeight(
      fitEmptyStateHeight({
        top: rect.top,
        bottom: rect.bottom,
        pageBottom,
        navTop,
      }),
    );
  }, []);

  useEffect(() => {
    measure();

    // Späte Webfonts verschieben die Oberkante — dann stimmt die erste Messung
    // nicht mehr. Resize deckt Drehung und die aufgehende Tastatur ab.
    document.fonts?.ready.then(measure).catch(() => {});
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return (
    <div
      ref={ref}
      // `min-height`, nicht `height`: passt der Inhalt einmal nicht, wächst die
      // Spalte lieber, als dass sie Sätze abschneidet.
      style={height === null ? undefined : { minHeight: `${height}px` }}
      className={cn("flex flex-col pb-4 text-center", className)}
    >
      {motiv && (
        <div className="grid shrink-0 place-items-center pt-6">{motiv}</div>
      )}

      <div className="grid min-h-0 flex-1 place-items-center py-8">
        <div>
          <p className="text-balance font-heading text-2xl leading-tight font-semibold tracking-tight">
            {satz}
          </p>
          {nachsatz && (
            <p className="mx-auto mt-2 max-w-[30ch] text-pretty text-sm leading-relaxed text-muted-foreground">
              {nachsatz}
            </p>
          )}
        </div>
      </div>

      {cta && <div className="grid shrink-0 gap-2">{cta}</div>}
    </div>
  );
}
