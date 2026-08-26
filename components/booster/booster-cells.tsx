"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";

import type { ReactNode } from "react";

import { Reveal } from "@/components/ui/reveal";
import { PAGE_TITLES } from "@/lib/content/labels";
import { BOOSTER_ART, type CellVariant } from "@/components/booster/booster-art";
import { useBoosterFlug } from "@/components/booster/booster-flug";
import { UEBERGABE_MS } from "@/lib/kopfwetter/flug";
import {
  ZEILEN_H,
  ZELLEN_H,
  zeilenAnker,
  zeilenSeite,
} from "@/lib/kopfwetter/buehne";

type WeatherSystem = {
  feeling: string;
  title: string;
  variant: CellVariant;
  href: string;
};

const SYSTEMS: WeatherSystem[] = [
  { feeling: "Ich bin am overthinken", title: "Overthinking", variant: "overthinking", href: "/booster/overthinking" },
  { feeling: "Ich will zu etwas Nein sagen, aber weiß nicht wie", title: PAGE_TITLES.sayingNo, variant: "sayingNo", href: "/booster/saying-no" },
  { feeling: "Ich fühl mich schuldig, obwohl ich es nicht sollte", title: PAGE_TITLES.thingsGotMessy, variant: "messy", href: "/booster/things-got-messy" },
  { feeling: "Ich muss Dampf ablassen", title: PAGE_TITLES.shadow, variant: "shadow", href: "/booster/shadow" },
  { feeling: "Ich brauche einen kurzen Confidence Boost", title: PAGE_TITLES.confidence, variant: "confidence", href: "/booster/confidence" },
];

/**
 * Der Weg über die Kopfwetter-Karte: fünf Systeme, abwechselnd links und rechts,
 * jedes im Auge seines Tiefs.
 *
 * Die Zeilen stehen **nicht** im Fluss, sondern auf den Koordinaten aus
 * `lib/kopfwetter/buehne.ts` — genau denen, aus denen `druckfeld.ts` auch seine
 * Zentren rechnet. Das ist der Punkt der ganzen Bühne: Feld und
 * Motiv kommen aus einer Konstante, nicht aus zwei Zahlenreihen, die man
 * getrennt nachzieht.
 *
 * Waagerecht rechnet `zeilenAnker` in Prozent der Bühnenbreite — dadurch bleibt
 * die Motiv-Mitte auch auf breiteren Schirmen deckungsgleich mit dem Auge des
 * Tiefs, das mit der SVG mitgedehnt wird.
 *
 * Kein Drift mehr: driften die Zellen, während das Feld steht, wandern sie aus
 * ihren Augen heraus. Die einzige Bewegung der Bühne ist das Ausblenden beim
 * Abflug (siehe `booster-flug.tsx`), nicht ein Wackeln im Stand.
 *
 * Das Druckfeld kommt als **Prop**, nicht als Import: diese Datei ist eine
 * Client-Komponente, und `lib/kopfwetter/druckfeld.ts` rechnet beim Laden das
 * ganze Isobaren-Feld (~40 ms auf dem Schreibtisch, auf dem Telefon mehr). Als
 * Prop bleibt diese Rechnung auf dem Server; im Browser landet nur das fertige
 * Markup, das die Seite ohnehin schon trägt.
 */
export function BoosterCells({ feld }: { feld: ReactNode }) {
  const router = useRouter();
  const { starteFlug, heimkehr } = useBoosterFlug();
  // Kommt gerade ein Rückflug herein, ist der Hub kein Auftritt, sondern eine
  // Wiederherstellung: `router.back()` bringt ihn samt Scroll-Position zurück,
  // und ein zweiter Zellen-Auftritt wäre eine Bewegung zu viel unter dem
  // landenden Klon. Einmal beim Mount entschieden — sonst würde der Wechsel auf
  // „idle“ die Zellen mitten im Landeanflug neu montieren.
  const [heimkehrLaeuft] = useState(() => heimkehr !== null);

  function handleClick(e: MouseEvent<HTMLAnchorElement>, system: WeatherSystem) {
    // Modifier/Mittelklick → normaler Link (neuer Tab etc.).
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    const link = e.currentTarget;
    const iconEl = (link.querySelector("[data-cell-icon]") as HTMLElement | null) ?? link;
    const r = iconEl.getBoundingClientRect();
    starteFlug(
      {
        rect: { x: r.left + r.width / 2, y: r.top + r.height / 2, size: r.width },
        variant: system.variant,
      },
      () => router.push(system.href),
    );
  }

  // Die Blende des Abflugs sitzt nicht hier, sondern eine Ebene höher auf der
  // ganzen Hub-Bühne (BoosterHubStage) — sonst bliebe der Seitenkopf während des
  // Übergangs stehen. Hier bleibt der Tap-Punkt-Melder und der Landeplatz der
  // Heimkehr.
  return (
    <div className="relative" style={{ height: ZELLEN_H }} data-e2e="booster-cells">
      {feld}

      {SYSTEMS.map((s, i) => {
        const links = zeilenSeite(i) === "left";
        const Art = BOOSTER_ART[s.variant];
        return (
          <div key={s.href} className="absolute z-10" style={zeilenAnker(i)}>
            <Reveal delay={i * 0.09} instant={heimkehrLaeuft}>
              <Link
                href={s.href}
                onClick={(e) => handleClick(e, s)}
                aria-label={`${s.title} — ${s.feeling}`}
                style={{ height: ZEILEN_H }}
                className={`group flex w-[min(17rem,82vw)] items-center gap-3 rounded-xl px-3 transition-[background-color,scale] duration-150 ease-out hover:bg-muted/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                  links ? "flex-row text-left" : "flex-row-reverse text-right"
                }`}
              >
                <span
                  data-cell-icon
                  className="relative flex size-16 shrink-0 items-center justify-center"
                >
                  {/* Das Auge wird nur freigeräumt, nicht zugedeckt: eine satte
                      dunkle Scheibe machte aus dem Motiv wieder einen Planeten.
                      Die Isobaren laufen sichtbar dahinter durch. */}
                  <span aria-hidden className="kw-auge absolute -inset-1 rounded-full" />
                  {/* Solange der Klon dieses Motiv nach Hause trägt, bleibt die
                      Zelle leer — sonst stünde der Gegenstand doppelt im Bild.
                      Die Übergabe überlappt mit dem Ausblenden des Klons. */}
                  <span
                    className="relative flex transition-opacity ease-out"
                    style={{
                      opacity: heimkehr === s.variant ? 0 : 1,
                      transitionDuration: `${UEBERGABE_MS}ms`,
                    }}
                  >
                    <Art className="size-16" />
                  </span>
                </span>
                <span className="kw-legible relative font-heading text-lg font-medium leading-snug text-balance text-foreground">
                  {s.feeling}
                </span>
              </Link>
            </Reveal>
          </div>
        );
      })}
    </div>
  );
}
