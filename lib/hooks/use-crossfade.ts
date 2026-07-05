"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TransitionEvent,
} from "react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

/** Halbe Überblendung in ms — out + in ≈ 0,5 s gesamt. */
export const CROSSFADE_MS = 250;

/**
 * Puffer für den Fallback-Timer: nur relevant, wenn `transitionend` nie feuert
 * (Element unmountet, Transition von WebKit übersprungen, App mitten im Fade
 * in den Hintergrund geschickt).
 */
const FALLBACK_BUFFER_MS = 150;

/** Nachprüf-Intervall des Fallbacks, solange die Opacity noch nicht bei 0 ist. */
const FALLBACK_RECHECK_MS = 100;

/** Harte Kappe: spätestens dann tauscht der Fallback auch bei opacity > 0. */
const FALLBACK_MAX_WAIT_MS = 2000;

/**
 * Geteilte Out→Swap→In-Überblendung. Beide Dashboard-Fader (Fokus-Frage und
 * Empfehlungskarte) laufen darüber, damit sie bei einem Stimmungswechsel exakt
 * synchron und mit identischem Timing überblenden — sie können nicht mehr
 * gegeneinander driften.
 *
 * Ablauf bei Token-Wechsel: sichtbaren Inhalt ausblenden → tauschen → neuen
 * Inhalt einblenden. Es ist immer nur ein Inhalt im DOM; alter und neuer
 * Zustand sind nie gleichzeitig mit opacity > 0 sichtbar — der Swap läuft erst,
 * wenn das Ausblenden wirklich auf opacity 0 angekommen ist.
 *
 * Der Swap wird EREIGNISBASIERT ausgelöst, nicht über einen Timer: Konsumenten
 * legen den zurückgegebenen `onTransitionEnd`-Handler auf ihr fadendes Element,
 * und getauscht wird erst, wenn die Opacity-Transition tatsächlich bei 0
 * angekommen ist. Ein reiner `setTimeout(CROSSFADE_MS)` liefe gegen die CSS-
 * Transition — und auf iOS (standalone PWA) driften rAF-, Timer- und
 * Compositor-Uhren nach einem Background/Resume auseinander, sodass der Timer
 * abläuft, während das Ausblenden visuell noch mittendrin ist (kurze
 * Überlagerung von altem und neuem Inhalt). `transitionend` ist gegen diese
 * Drift immun. Ein Timer mit Puffer läuft nur noch als Fallback mit, falls das
 * Event nie feuert; er startet erst nach doppeltem requestAnimationFrame, also
 * sobald der opacity-0-Zustand gepaintet (= die Ausblend-Transition begonnen)
 * ist. Und weil dieselbe Uhren-Drift auch NACH einem Routenwechsel auftreten
 * kann (Compositor startet die Transition verspätet, Wanduhr-Timer läuft ab,
 * während der Fade visuell noch mittendrin ist), tauscht der Fallback nie
 * blind: Er liest vorher die echte Opacity am Taktgeber-Element (`fadeRef`)
 * und armiert sich neu, solange sie nicht bei 0 angekommen ist — bis zu einer
 * harten Kappe. Beide Pfade prüfen vor dem Swap, ob er noch aussteht — hängen
 * mehrere Elemente an einer Maschine, tauscht nur das erste Event.
 *
 * Der Out-Effect hängt bewusst NUR am `token` (einem Primitive), nicht am
 * `value`: Die Karte übergibt `children` als `value` — neue Objekt-Identität bei
 * jedem Parent-Render. Stünde `value` in den Dependencies, würde ein Re-Render
 * mitten in der Überblendung den Timer der Karte neu starten und sie aus dem
 * Takt mit der Frage (stabiler String-`value`) bringen. Der jeweils neueste
 * `value` wird stattdessen über eine Ref gelesen und erst beim Swap übernommen.
 *
 * Das Einblenden nutzt ein doppeltes requestAnimationFrame: so ist der
 * opacity-0-Zustand des neuen Inhalts garantiert gepaintet, bevor auf opacity-100
 * umgeschaltet wird (sonst „springt" der neue Inhalt ohne Übergang hinein).
 *
 * Respektiert `prefers-reduced-motion` (sofortiger Wechsel ohne Animation).
 */
export function useCrossfade<T>(token: string, value: T) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<{ token: string; value: T }>({
    token,
    value,
  });
  const [visible, setVisible] = useState(true);

  // Taktgeber-Element der Maschine — der Fallback liest hier die echte
  // Opacity, bevor er tauscht (Konsumenten hängen die Ref an das Element,
  // das auch `onTransitionEnd` trägt).
  const fadeRef = useRef<HTMLElement | null>(null);

  // Neuesten value halten, ohne ihn in die Effect-Dependencies aufzunehmen.
  // Der Sync läuft in einem Effect (kein Ref-Write während des Renders); die
  // Lesezugriffe passieren erst beim Swap (transitionend bzw. Fallback-Timer) —
  // da ist dieser Effect garantiert schon gelaufen.
  const latestValue = useRef(value);
  useEffect(() => {
    latestValue.current = value;
  });

  // Swap-Auslöser: feuert, wenn die Ausblend-Transition tatsächlich bei
  // opacity 0 angekommen ist. Konsumenten legen den Handler auf das fadende
  // Element (bei mehreren Elementen pro Maschine genügt eines als Taktgeber).
  const onTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLElement>) => {
      if (reduced) return;
      if (event.target !== event.currentTarget) return;
      if (event.propertyName !== "opacity") return;
      if (visible) return; // nur das Ende des AUSblendens interessiert
      setShown((prev) =>
        prev.token === token ? prev : { token, value: latestValue.current },
      );
    },
    [token, visible, reduced],
  );

  // Out → Fallback-Timer scharf stellen, sobald sich der Token ändert. Der
  // eigentliche Swap kommt regulär über `onTransitionEnd`.
  useEffect(() => {
    if (reduced || token === shown.token) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- bewusst post-paint: das Ausblenden darf erst starten, nachdem der alte Inhalt gepaintet wurde (s. Kommentar oben)
    setVisible(false); // läuft post-paint, blendet den sichtbaren Inhalt aus

    // Fallback, falls `transitionend` nie feuert: per doppeltem rAF warten, bis
    // der opacity-0-Zustand gepaintet ist (= die CSS-Transition hat begonnen),
    // dann volle Transition-Dauer plus Puffer. Vor dem Tausch liest der
    // Fallback die ECHTE Opacity am Taktgeber-Element: Läuft die Transition
    // noch (Compositor hinkt der Wanduhr hinterher, z. B. nach Routenwechsel
    // oder Resume), armiert er sich neu, statt mitten im Fade zu tauschen —
    // sonst überlagerten sich alter und neuer Inhalt sichtbar. Erst nach der
    // harten Kappe tauscht er bedingungslos. Feuert das Event zuerst, räumt
    // der Cleanup (Dependency `shown.token`) den Timer ab; der Guard im
    // Updater verhindert einen Doppel-Swap in jedem Fall.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let waitedMs = 0;
    const trySwap = () => {
      const el = fadeRef.current;
      const stillFading =
        el !== null &&
        waitedMs < FALLBACK_MAX_WAIT_MS &&
        parseFloat(getComputedStyle(el).opacity || "0") > 0.02;
      if (stillFading) {
        waitedMs += FALLBACK_RECHECK_MS;
        timer = setTimeout(trySwap, FALLBACK_RECHECK_MS);
        return;
      }
      setShown((prev) =>
        prev.token === token ? prev : { token, value: latestValue.current },
      );
    };
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        timer = setTimeout(trySwap, CROSSFADE_MS + FALLBACK_BUFFER_MS);
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      if (timer) clearTimeout(timer);
    };
  }, [token, reduced, shown.token]);

  // In → einblenden, sobald Token und gezeigter Inhalt wieder übereinstimmen.
  // Das passiert auf zwei Wegen: nach dem Swap (`shown.token` ändert sich) ODER
  // wenn mitten im Ausblenden zurück zum ursprünglichen Token gewechselt wird
  // (`token` ändert sich zurück). Ohne den zweiten Fall bliebe der Inhalt nach
  // einem schnellen Hin-und-zurück dauerhaft unsichtbar: der Out-Effect bricht
  // dann früh ab (Token stimmt ja wieder) und niemand blendet wieder ein.
  useEffect(() => {
    if (reduced || token !== shown.token) return; // Ausblenden läuft noch

    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setVisible(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [token, shown.token, reduced]);

  return { shown, visible, reduced, onTransitionEnd, fadeRef };
}
