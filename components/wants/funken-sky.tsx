"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDialogFocus } from "@/lib/hooks/use-dialog-focus";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import type { BetItem } from "@/lib/types/db-json";

/**
 * Die Funken-Konstellation der Sternschmiede: offene Funken schweben als
 * glühende Rosé-Punkte an stabilen Positionen über der Esse (Slot-Leiter +
 * ID-Hash → gleicher Himmel bei jedem Besuch). Tipp auf einen Funken → eine per
 * Portal an document.body gerenderte, fixe, scroll-gesperrte Fokus-Ebene über
 * der Bottom-Nav: Text + „Ausprobiert? Reflektieren" + „Verwerfen" (zweistufig)
 * + „Schließen". Leichtere Schwester der StarMap — ohne Edit-Modus, ohne
 * Distanz, ohne GSAP (Auf-Zoom rein per CSS vom Tap-Punkt). Reduced motion:
 * harter Schnitt ohne Flug. Persistenz bleibt beim Parent (sternschmiede.tsx).
 */

const VIEW_W = 360;
const ROW_H = 76;

/** Ziel-Abstand (viewBox-Einheiten) an beiden Rändern — derselbe Wert wie auf
 *  der Sternenkarte ([star-map.tsx](../../app/(app)/me/wants/star-map.tsx)).
 *  Ohne Maskottchen-Zuschlag: unter der Konstellation folgt direkt die
 *  „Eigener Funke"-Zeile. */
const EDGE_PAD = 40;
/** Halbe y-Jitter-Amplitude (Slot-Versatz ±15, s. layout) als Reserve. */
const Y_JITTER_RESERVE = 15;

const TOP_PAD = EDGE_PAD + Y_JITTER_RESERVE;
const BOTTOM_PAD = EDGE_PAD + Y_JITTER_RESERVE;

/** Mindesthöhe der Bühne — Schwesterwert zu MIN_VIEW_H auf der Sternenkarte,
 *  aber kleiner: hier hängt kein Maskottchen drunter. Rein visuell gesetzt.
 *  Bis 2 Funken dominiert dieser Boden die Höhe. */
const MIN_VIEW_H = 200;

/** Stabiler Hash 0..1 aus einem String — gleiche Konstellation bei jedem Besuch.
 *  FNV-1a mit Nachmischen (fmix32), wortgleich zur Sternenkarte. Das
 *  Nachmischen ist nicht Zierde: die Vorgänger-Fassung (`h * 31 + c`, dann
 *  `h % 1000`) ließ benachbarte IDs auf fast denselben Wert fallen — bei den
 *  tatsächlichen Funken-IDs, die sich nur im letzten Zeichen unterscheiden,
 *  lagen alle Werte innerhalb von 0,001. Der Versatz war damit rechnerisch da
 *  und sichtbar tot: die Konstellation stand als Zweispalten-Raster statt als
 *  Himmel. */
function hash01(seed: string): number {
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

/** Innerste x-Position einer Spalte (viewBox-Einheiten, vom linken Rand;
 *  rechts gespiegelt) — Schwesterwert zur Sternenkarte. Weil der Versatz unten
 *  nur nach außen schiebt, ist dieser Wert zugleich der engste Fall, den ein
 *  Label je bekommt.
 *  Anders als auf der Karte ist das hier **kein** Platzgewinn fürs Label: der
 *  Deckel LABEL_MAX_PX greift vor dem Kartenrand (s. labelMaxWidthCss), ein
 *  Funke weiter außen bekommt also keinen längeren Text, sondern nur mehr Himmel
 *  hinter seinem Label. Die Verteilung dient hier der Optik, nicht der Breite. */
const COL_X_INNER = 58;
/** Wie weit der ID-Hash einen Funken aus seiner Spalte nach außen schiebt —
 *  stabil je Funke, damit die Konstellation kein Raster ist. Nur nach außen:
 *  nach innen läge sein Label. Weiter geht es nicht, ohne dass das 44-px-
 *  Tap-Ziel über den Kartenrand hinausragt: der äußerste Funke steht bei
 *  COL_X_INNER - X_JITTER = 30 Einheiten, das sind 8,3 % der Kartenbreite. */
const X_JITTER = 28;

/** Halbes Tap-Ziel: der Funke sitzt in einer `size-11`-Fläche (44 px), sein
 *  Label beginnt an deren Rand. */
const TAP_RADIUS_PX = 22;
/** Abstand Label ↔ Funke: `ml-2`/`mr-2`. **Hier liegt der Unterschied zur
 *  Sternenkarte** — die setzt `ml-1.5`/`mr-1.5` = 6 px. Nicht von dort
 *  abschreiben. */
const LABEL_OFFSET_PX = 8;
/** Luft zwischen Label-Ende und Kartenrand, damit das „…" nicht auf der Kante
 *  klebt. */
const EDGE_AIR_PX = 4;

/** Was ein Label an px verliert, bevor es anfängt. Diese Strecke ist in px
 *  festgeschrieben, die Funken-Position in Prozent der Karte — deshalb rechnet
 *  die Breite unten in cqw minus px. */
const LABEL_GUTTER_PX = TAP_RADIUS_PX + LABEL_OFFSET_PX + EDGE_AIR_PX;

/** Deckel auf der Label-Breite, unabhängig vom Platz bis zum Kartenrand.
 *
 *  Hier weicht die Konstellation bewusst von der Sternenkarte ab. Auf der
 *  Karte trägt ein Stern einen **Namen** — eine Überschrift, die meist von
 *  selbst endet, bevor der Rand kommt; dort ist der Rand die einzige Schranke.
 *  Ein Funke trägt keinen Namen, sondern seinen **ganzen Wetten-Satz** (ein
 *  Satz, bis 20 Wörter — s. `lib/anthropic/prompts/sternschmiede.ts`). Der
 *  reißt jede Schranke, egal wo sie steht. Die Frage ist also nicht „kürzen
 *  oder nicht", sondern „wie breit darf ein Balken werden, bevor er kein
 *  Funke mehr ist".
 *
 *  Gemessen in WebKit bei 375 px Viewport (Karte 343 px), mit sechs echten
 *  Funken-Sätzen von 61 bis 92 Zeichen:
 *
 *    Deckel      Label-Breite   sichtbar   Himmel bis zum Gegenrand
 *    128 px alt   37 % / 128     12–15 Z.   136–155 px
 *    200 px       58 % / 200     20–24 Z.    64– 83 px
 *    ohne         76–81 %        29–33 Z.     4 px
 *
 *  Ohne Deckel bleiben 4 px: jede Zeile ein Balken von Rand zu Rand, die
 *  Konstellation wird zur Liste. Und sie kauft das teuer — ganze acht Zeichen
 *  mehr als bei 200 px, weit entfernt davon, den Satz lesbar zu machen. Ein
 *  Wetten-Satz ist auf dieser Bühne grundsätzlich nicht zu Ende zu lesen; er
 *  steht einen Tap entfernt in der Fokus-Ebene und im `aria-label` ungekürzt.
 *
 *  200 px ist damit gesetzt: gegenüber den alten 128 px werden aus einem
 *  angerissenen Wort (~14 Zeichen) der erste Halbsatz (~22), und es bleibt
 *  rund ein Fünftel der Kartenbreite Himmel neben jedem Label stehen.
 *  Der Wert ist Geschmack, nicht Physik — wer ihn ändert, ändert ihn hier und
 *  prüft am Gerät, nicht in dieser Tabelle. */
const LABEL_MAX_PX = 200;

/** Der Platz, den ein Label wirklich hat: von seinem Funken bis zum
 *  gegenüberliegenden Kartenrand, gedeckelt auf LABEL_MAX_PX. `cqw` misst die
 *  Karte (sie trägt dafür `@container`), sodass jeder Funke seine eigene
 *  Schranke bekommt statt einer gemeinsamen, die sich am engsten Fall
 *  orientieren müsste. Erst hier kürzt `truncate`.
 *
 *  Ehrlich gesagt: **beim heutigen LABEL_MAX_PX gewinnt der Deckel überall.**
 *  Der Rand-Term liegt schon bei 320 px Viewport im engsten Fall bei 208 px,
 *  also darüber. Er steht trotzdem da, und zwar als Geländer, nicht als
 *  Zierde — LABEL_MAX_PX ist der Wert, der sich am Gerät noch ändern kann
 *  (s. dort), und COL_X_INNER/X_JITTER sind es auch. Ohne den Term liefe ein
 *  angehobener Deckel still über den Kartenrand hinaus; mit ihm kürzt das
 *  Label spätestens am Rand.
 *
 *  Kollidieren können zwei Labels dabei nicht: pro Zeile steht genau ein
 *  Funke, und zwei Zeilen liegen selbst im ungünstigsten Fall noch
 *  ROW_H - 2 * Y_JITTER_RESERVE = 46 Einheiten auseinander — deutlich mehr als
 *  die Höhe einer Zeile. */
function labelMaxWidthCss(x: number, side: "left" | "right"): string {
  const room = side === "left" ? VIEW_W - x : x;
  const toEdge = `${((room / VIEW_W) * 100).toFixed(2)}cqw - ${LABEL_GUTTER_PX}px`;
  return `min(calc(${toEdge}), ${LABEL_MAX_PX}px)`;
}

type Placed = { bet: BetItem; x: number; y: number; side: "left" | "right" };

/** Slot-Leiter: links/rechts versetzt von oben nach unten; ID-Hash gibt jedem
 *  Funken einen stabilen Versatz im Slot. */
function layout(funken: BetItem[]): { placed: Placed[]; viewH: number } {
  const placed = funken.map((bet, i) => {
    const side: "left" | "right" = i % 2 === 0 ? "left" : "right";
    const outward = hash01(bet.id) * X_JITTER;
    return {
      bet,
      x: side === "left" ? COL_X_INNER - outward : VIEW_W - COL_X_INNER + outward,
      y: TOP_PAD + i * ROW_H + (hash01(`${bet.id}y`) - 0.5) * Y_JITTER_RESERVE * 2,
      side,
    };
  });
  // Wie auf der Sternenkarte: der letzte Funke sitzt bei TOP_PAD + (n-1)*ROW_H.
  const viewH = Math.max(
    MIN_VIEW_H,
    TOP_PAD + Math.max(0, funken.length - 1) * ROW_H + BOTTOM_PAD,
  );
  return { placed, viewH };
}

export function FunkenSky({
  funken,
  reflectHref,
  onDelete,
}: {
  funken: BetItem[];
  reflectHref: (id: string) => string;
  onDelete: (id: string) => void;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [rafReady, setRafReady] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Der Auf-Zoom ist „fertig", sobald ein Funke fokussiert ist UND entweder
  // Bewegung reduziert wird (dann sofort) oder der rAF-Tick durch ist. Als
  // abgeleiteter Wert braucht der reduced-Pfad kein setState im Effect, und das
  // Zurücksetzen beim Schließen passiert automatisch über focusedId.
  const ready = focusedId !== null && (reduced || rafReady);

  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  // Tap-Punkt (viewport-relativ) → transform-origin für den Auf-Zoom der Ebene.
  // Als State, nicht als Ref: er wird in open() im selben Handler gesetzt wie
  // focusedId, React batcht beide zu einem Render — der Origin steht also im
  // selben Frame wie die Ebene, ohne dass der Render eine Ref lesen muss.
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  // Portal erst nach Mount (kein document auf dem Server).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- einmaliger Client-Mount-Flag
  useEffect(() => setMounted(true), []);

  // Scroll-Lock + Fokus reinziehen (preventScroll) + Tab-Falle + Fokus-Rückkehr.
  useDialogFocus({
    open: focusedId !== null,
    dialogRef,
    triggerRef,
    onEscape: close,
  });

  const { placed, viewH } = layout(funken);
  const focused = funken.find((f) => f.id === focusedId) ?? null;

  function open(bet: BetItem, el: HTMLElement) {
    if (focusedId) return;
    const r = el.getBoundingClientRect();
    setOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    triggerRef.current = el;
    setConfirmDelete(false);
    setFocusedId(bet.id);
  }

  function close() {
    setFocusedId(null);
    setConfirmDelete(false);
  }

  // Auf-Zoom: transform-origin steht am Tap-Punkt, ein rAF-Tick später schaltet
  // „ready" → CSS transitioniert von scale(0.92)/opacity 0 auf 1. Bei reduzierter
  // Bewegung übernimmt die Ableitung oben, der Effect läuft dann gar nicht.
  useEffect(() => {
    if (!focusedId || reduced) return;
    const raf = requestAnimationFrame(() => setRafReady(true));
    return () => {
      cancelAnimationFrame(raf);
      setRafReady(false);
    };
  }, [focusedId, reduced]);

  function handleDelete() {
    if (!focused) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    const id = focused.id;
    close();
    onDelete(id);
  }

  return (
    // `@container`: die Karte ist der Bezug für die cqw-Rechnung in
    // labelMaxWidthCss. Sie hat keine `fixed` Nachfahren — die Fokus-Ebene hängt
    // per Portal an document.body —, also kostet die Containment nichts.
    <div
      className="@container relative w-full"
      style={{ aspectRatio: `${VIEW_W} / ${viewH}` }}
      data-e2e="funken-sky"
    >
      {/* Die Konstellation (inert, solange ein Funke fokussiert ist: die
          Hintergrund-Punkte dürfen weder Tastatur-Fokus noch Screenreader). */}
      <div className="absolute inset-0" inert={focusedId !== null}>
        {placed.map(({ bet, x, y, side }, i) => (
          <button
            key={bet.id}
            type="button"
            onClick={(e) => open(bet, e.currentTarget)}
            aria-label={`Funken ansehen: ${bet.text}`}
            className="absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            style={{ left: `${(x / VIEW_W) * 100}%`, top: `${(y / viewH) * 100}%` }}
          >
            <span
              aria-hidden
              className={cn("size-3 rounded-full bg-celebrate", !reduced && "funke-drift")}
              style={{
                boxShadow: "0 0 10px 2px color-mix(in srgb, var(--celebrate) 70%, transparent)",
                // NEGATIVER Versatz: die Funken starten alle im ersten Frame,
                // nur an fünf verschiedenen Stellen der 6-s-Periode. Ein
                // positiver Delay ließ sie (mangels animation-fill-mode) bis zu
                // ihrem Startzeitpunkt im statischen Zustand stehen und dann auf
                // den 0-%-Keyframe springen — ein sichtbares Nacheinander-
                // Anspringen über die ersten Sekunden nach dem Laden.
                animationDelay: `-${(i % 5) * 1.2}s`,
              }}
            />
            <span
              // Die Schranke ist der Kartenrand bzw. LABEL_MAX_PX, nicht eine
              // feste Breite: gekürzt wird erst dort.
              style={{ maxWidth: labelMaxWidthCss(x, side) }}
              className={cn(
                "absolute top-1/2 block -translate-y-1/2 truncate font-heading text-base font-medium text-foreground",
                side === "left" ? "left-full ml-2" : "right-full mr-2",
              )}
            >
              {bet.text}
            </span>
          </button>
        ))}
      </div>

      {/* Fokus-Ebene: Portal an document.body, fix, scroll-gesperrt, über der Nav. */}
      {mounted &&
        focused &&
        createPortal(
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Funke: ${focused.text}`}
            tabIndex={-1}
            className="fixed inset-0 z-[60] outline-none"
          >
            {/* Gedimmte Esse: klick = schließen. Für Screenreader/Tastatur inert
                (aria-hidden + tabIndex -1) — der explizite „Schließen"-Button unten
                trägt den barrierefreien Weg, sonst läge diese Fläche als erstes
                „Schließen" vor dem eigentlichen Funken in der VoiceOver-Reihenfolge. */}
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onClick={close}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            {/* Inhalt: fliegt vom Tap-Punkt auf (transform-origin), fadet auf. */}
            <div
              className={cn(
                "absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 transition-[opacity,scale] duration-300 ease-out motion-reduce:transition-none",
                ready ? "scale-100" : "scale-[0.92]",
              )}
              style={{
                transformOrigin: origin
                  ? `${origin.x}px ${origin.y}px`
                  : "center",
                opacity: ready ? 1 : 0,
              }}
            >
              <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 text-center">
                <span
                  aria-hidden
                  className="size-5 rounded-full bg-celebrate"
                  style={{
                    boxShadow: "0 0 22px 5px color-mix(in srgb, var(--celebrate) 70%, transparent)",
                  }}
                />
                <p className="text-lg leading-relaxed text-foreground">{focused.text}</p>
                <div className="flex w-full flex-col gap-2">
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    render={<Link href={reflectHref(focused.id)} />}
                  >
                    <Flame className="size-4" /> Ausprobiert? Reflektieren
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={handleDelete}
                  >
                    {/* aria-live: der Text-Swap zur Rückfrage wird sonst nicht
                        angesagt (gleicher Button behält den Fokus). */}
                    <span aria-live="polite">
                      {confirmDelete ? "Wirklich verwerfen?" : "Verwerfen"}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={close}
                  >
                    Schließen
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
