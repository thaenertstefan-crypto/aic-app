"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

import { Mascot, type MascotExpression } from "@/components/brand/mascot";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

/**
 * Wow-Moment nach dem allerersten Login: Das Maskottchen springt von oben in die
 * Bildschirmmitte, federt ab, strahlt und blendet aus — danach erscheint das
 * Onboarding. Wird nur beim ersten Onboarding-Eintritt gezeigt (siehe
 * onboarding/page.tsx). Respektiert prefers-reduced-motion.
 */
export function LoginOnboardingOverlay({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const overlayRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLDivElement>(null);
  const [expression, setExpression] = useState<MascotExpression>("smile");

  useEffect(() => {
    const overlay = overlayRef.current;
    const mascot = mascotRef.current;
    if (!overlay || !mascot) return;

    if (reduced) {
      gsap.set(mascot, { y: 0, opacity: 1, scale: 1 });
      setExpression("radiant");
      const t = gsap.to(overlay, {
        opacity: 0,
        duration: 0.4,
        delay: 0.8,
        onComplete: onDone,
      });
      return () => {
        t.kill();
      };
    }

    const drop = window.innerHeight * 0.45;
    const tl = gsap.timeline({ onComplete: onDone });

    gsap.set(mascot, { y: -drop, opacity: 0, scale: 1 });

    tl
      // a. Sprung von oben in die Mitte
      .to(mascot, { y: 0, opacity: 1, duration: 0.4, ease: "back.in(1.5)" })
      // b. Aufprall-Bounce
      .to(mascot, { scale: 1.15, duration: 0.12, ease: "power1.out" })
      .to(mascot, { scale: 0.95, duration: 0.12, ease: "power1.inOut" })
      .to(mascot, {
        scale: 1,
        duration: 0.16,
        ease: "power1.inOut",
        onStart: () => setExpression("radiant"),
      })
      // d. Leichtes Hüpfen (2×)
      .to(mascot, { y: -15, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.inOut" })
      .to(mascot, { y: -15, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.inOut" })
      // e. Fade-out des Overlays
      .to(overlay, { opacity: 0, duration: 0.4, ease: "power1.in" }, "+=0.1");

    return () => {
      tl.kill();
    };
  }, [reduced, onDone]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)]"
    >
      <div ref={mascotRef}>
        <Mascot expression={expression} size="lg" />
      </div>
    </div>
  );
}
