"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ChevronUp } from "lucide-react";

import { MascotPeek } from "@/components/brand/mascot-peek";
import { SkyBackdrop } from "@/components/backdrops/sky-backdrop";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/** Mindest-Wischweg (in px) nach oben, ab dem die Karte aufgedeckt wird. */
const SWIPE_THRESHOLD = 50;

type AuthRevealProps = {
  /** Hero-Inhalt (Logo + BrandPanel) — wird nur auf der gegateten Signup-Route
   *  als Vollbild-Intro gezeigt; Login/Reset ignorieren diesen Prop. */
  hero: ReactNode;
  /** Die eigentliche Auth-Karte (Login-/Signup-Formular). */
  children: ReactNode;
};

/**
 * Vollbild-„Bühne“ für die Auth-Seiten: zuerst sieht man nur den Hero auf dem
 * Nachthimmel (SkyBackdrop) und einem Pfeil. Wischt man nach oben (oder tippt
 * den Pfeil), schiebt der Hero nach oben weg und die Auth-Karte zoomt von
 * hinten nach vorne herein.
 *
 * Bei „Bewegung reduzieren“ entfällt das Gating komplett: Hero und Karte
 * stehen im normalen Fluss untereinander, ohne Animation und ohne versteckte
 * Inhalte.
 */
export function AuthReveal({ hero, children }: AuthRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const reduced = useReducedMotion();
  const touchStartY = useRef<number | null>(null);
  // Das hochblickende Karten-Maskottchen erscheint auf Login + Signup.
  const pathname = usePathname();
  const showCardMascot = pathname === "/login" || pathname === "/signup";

  // Das Vollbild-Swipe-Gate ist bewusst NUR noch der Signup-Bühne vorbehalten.
  // Rückkehrer (Login) und die Reset-Seiten sehen die Karte sofort — kein
  // Gate, keine versteckt-fokussierbare Karte hinter dem Hero.
  const gated = !reduced && pathname === "/signup";

  // Der Karten-Peek erscheint erst, nachdem der Hero (inkl. Hero-Maskottchen)
  // weggeslidet ist — sonst blitzen beim Aufwischen kurz zwei Maskottchen.
  // Das Zurücksetzen passiert im Cleanup, nicht im Effect-Rumpf: der läuft
  // genau dann, wenn `revealed` zurückspringt (Abwärts-Swipe, s. handleTouchEnd)
  // — und nur dann muss ein erneutes Aufdecken die Sekunde wieder abwarten.
  const [heroGone, setHeroGone] = useState(false);
  useEffect(() => {
    if (!revealed) return;
    const t = window.setTimeout(() => setHeroGone(true), 1000);
    return () => {
      window.clearTimeout(t);
      setHeroGone(false);
    };
  }, [revealed]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY.current === null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    const delta = touchStartY.current - endY;
    if (delta > SWIPE_THRESHOLD) {
      setRevealed(true);
    } else if (delta < -SWIPE_THRESHOLD) {
      setRevealed(false);
    }
    touchStartY.current = null;
  }

  function handleWheel(e: React.WheelEvent) {
    // Nur aufdecken; nie wieder verstecken (sonst schlägt der Hero beim
    // Hoch-Scrollen über das halb ausgefüllte Formular zurück).
    if (e.deltaY > 0) setRevealed(true);
  }

  // Nicht-gegateter Pfad: reduced-motion UND alle Nicht-Signup-Routen (Login,
  // Reset). Nur die Karte auf dem Nachthimmel — KEIN großer Hero (der brächte
  // ein zweites Maskottchen) und bewusst auch keine Wortmarke: Rückkehrer
  // wissen, wo sie sind, die verkürzte „AIC"-Marke oben links war reine
  // Ablenkung neben dem Maskottchen. Genau ein Peek.
  if (!gated) {
    return (
      <div className="relative flex min-h-lvh flex-col overflow-hidden">
        <SkyBackdrop />
        <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        {showCardMascot && (
          <MascotPeek
            from="top"
            size="lg"
            expression="smile"
            pulseSeconds={3}
            rotate={180}
            gazeX={0}
            gazeY={-3}
            className="pointer-events-none absolute left-1/2 -ml-16 -mt-10 z-0"
            style={{ top: "env(safe-area-inset-top, 0px)" }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      className="relative min-h-lvh overflow-hidden"
    >
      {/* Karten-Panel: zoomt von hinten nach vorne herein, sobald aufgedeckt. */}
      <div className="flex min-h-lvh items-center justify-center px-4 py-12">
        <div
          inert={!revealed || undefined}
          className={cn(
            "w-full max-w-sm transition-[scale,opacity] duration-700 ease-out",
            revealed
              ? "scale-100 opacity-100"
              : "pointer-events-none scale-90 opacity-0",
          )}
        >
          {children}
        </div>

        {/* Maskottchen lugt oben mittig vom Bildschirmrand herein und schaut
            hinunter zur Login-Karte. Positioniert relativ zum Vollbild-Root
            (wird oben geclippt → nur die Augen sind sichtbar). Mountet erst beim
            Aufdecken, damit die Slide-down-Animation spielt. */}
        {showCardMascot && revealed && heroGone && (
          <MascotPeek
            from="top"
            size="lg"
            expression="smile"
            pulseSeconds={3}
            rotate={180}
            gazeX={0}
            gazeY={-3}
            className="pointer-events-none absolute left-1/2 -ml-16 -mt-10 z-0"
            style={{ top: "env(safe-area-inset-top, 0px)" }}
          />
        )}
      </div>

      {/* Hero-Panel: liegt darüber und schiebt beim Aufdecken nach oben weg.
          Nachthimmel statt eigenem Verlauf — derselbe SkyBackdrop wie Dashboard,
          /me und Kopfwetter, damit der Erstkontakt die Bildsprache der App
          dahinter spricht. AmbientBlobs entfällt: der Himmel bringt seine eigene
          Tiefe mit, zwei atmosphärische Ebenen übereinander werden matschig. */}
      <div
        className={cn(
          "absolute inset-0 z-20 isolate flex flex-col overflow-hidden",
          "bg-background",
          "transition-[translate,opacity] duration-1000 ease-out",
          revealed
            ? "pointer-events-none -translate-y-full opacity-0"
            : "translate-y-0 opacity-100",
        )}
      >
        <SkyBackdrop />

        <div className="flex flex-1 flex-col">{hero}</div>

        {/* Maskottchen lugt von unten rechts halb über den Bildschirmrand
            herein, gekippt, Blick nach links oben zur Headline. Es verlässt die
            Bühne beim Aufdecken NACH RECHTS, während der Hero nach oben geht —
            gleiche Dauer und Kurve, damit die beiden Bewegungen als eine
            gelesen werden.

            Tailwind v4: `translate-x-*` kompiliert zu der eigenständigen
            CSS-Property `translate`, nicht zu `transform`. Die Transition muss
            `translate` deshalb namentlich nennen, sonst springt die Position
            statt zu gleiten.

            Die Exit-Klassen liegen auf diesem Wrapper und NICHT auf
            `MascotPeek` selbst: GSAP faltet innerhalb von `MascotPeek` seine
            eigene `x`/`y`/`rotation`-Transition in `transform` und löscht dabei
            die eigenständige `translate`-Property inline auf seinem Wurzel-Element
            (CSSPlugin normalisiert Individual-Transform-Properties weg) — auf
            diesem Element wäre unser `translate-x-*` toter Code. Der Wrapper
            bleibt von GSAP unberührt, seine `translate`/`opacity` gewinnen also
            zuverlässig.

            Der Wrapper trägt bewusst KEINE eigene Opacity: das Hero-Panel
            faded schon (s.u.), eine zweite Fade-Ebene würde die Alpha-Werte
            multiplizieren (0.32 × 0.32 ≈ 0.10 bei t = 500ms statt 0.32 — das
            Maskottchen verschwindet, statt sichtbar zur Seite zu ziehen) und
            zusätzlich zwei opacity-animierende Vorfahren um das
            `backdrop-filter` des Maskottchens stapeln — das ist in diesem
            Repo der dokumentierte Trigger für iOS-Compositing-Ghosting. Nur
            `translate` hier, die Fade übernimmt allein das Hero-Panel unten.
            `flex` blockifiziert `MascotPeek`s `inline-block`-Root (sonst
            hebt die Inline-Baseline-Lücke unter dem Maskottchen es von
            seiner austarierten `-mb-3`-Ruheposition ab). */}
        <div
          className={cn(
            "pointer-events-none absolute bottom-0 right-0 -mb-3 -mr-12 z-10 flex",
            "transition-[translate] duration-1000 ease-out",
            revealed ? "translate-x-[140%]" : "translate-x-0",
          )}
        >
          <MascotPeek
            from="right"
            size="lg"
            rotate={-45}
            gazeX={0}
            gazeY={-3}
            expression="curious"
          />
        </div>

        {/* Aufdeck-Hinweis: Pfeil + Text, dezent pulsierend. */}
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="group flex flex-col items-center gap-2 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-4 text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="text-sm font-medium">Nach oben wischen</span>
          <ChevronUp
            className="size-6 motion-safe:animate-[nudge-y_1.6s_ease-in-out_infinite]"
            aria-hidden
          />
          <span className="sr-only">Zur Anmeldung</span>
        </button>
      </div>
    </div>
  );
}
