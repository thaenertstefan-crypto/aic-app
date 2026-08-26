"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { Home, User, CloudMoon, NotebookPen, Settings2 } from "lucide-react";

import { useKeyboardOpen } from "@/lib/hooks/use-keyboard-open";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { NAV_LABELS } from "@/lib/content/labels";
import { cn } from "@/lib/utils";

const navItems = [
  { label: NAV_LABELS.dashboard, href: "/dashboard", icon: Home },
  { label: NAV_LABELS.me, href: "/me", icon: User },
  { label: NAV_LABELS.booster, href: "/booster", icon: CloudMoon },
  { label: NAV_LABELS.journal, href: "/journal", icon: NotebookPen },
  { label: NAV_LABELS.settings, href: "/settings", icon: Settings2 },
] as const;

/** Width (px) of the sliding active-tab indicator line. */
const INDICATOR_WIDTH = 32;

export function BottomNav() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const keyboardOpen = useKeyboardOpen();

  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const indicatorRef = useRef<HTMLLIElement>(null);
  const firstRun = useRef(true);

  const activeIndex = navItems.findIndex(
    ({ href }) => pathname === href || pathname.startsWith(href + "/"),
  );

  useEffect(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return;

    const place = () => {
      // No matching tab (e.g. a sub-page) → hide the indicator.
      if (activeIndex < 0) {
        gsap.to(indicator, {
          opacity: 0,
          duration: reduced ? 0 : 0.2,
        });
        return;
      }

      const item = itemRefs.current[activeIndex];
      if (!item) return;

      const targetX =
        item.offsetLeft + item.offsetWidth / 2 - INDICATOR_WIDTH / 2;

      if (firstRun.current || reduced) {
        gsap.set(indicator, { x: targetX, opacity: 1 });
      } else {
        gsap.set(indicator, { opacity: 1 });
        gsap.to(indicator, { x: targetX, duration: 0.4, ease: "power2.out" });
      }
      firstRun.current = false;
    };

    place();

    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [activeIndex, reduced]);

  return (
    <nav
      // Marke für die Leer-Grammatik: `EmptyState` misst hier die Oberkante der
      // nutzbaren Fläche ab (lib/utils/empty-state-fit.ts). Nicht entfernen,
      // ohne dort nachzuziehen.
      data-bottom-nav
      // Bei offener Tastatur geht die Leiste aus dem Bild (KAN-51): iOS schiebt
      // nur den sichtbaren Ausschnitt hoch, die Leiste bleibt am Rand eines
      // Viewports kleben, den niemand mehr sieht, und wirkt wie mitten im Text
      // schwebend. Zu tun hat sie dort nichts — ein Tab-Wechsel beim Tippen
      // wirft den Text weg.
      //
      // `invisible`, nicht `hidden`: die Leiste bleibt im Fluss, sonst ändert
      // sich die Dokumenthöhe genau während WebKit scrollt — und die
      // Leer-Grammatik misst hier weiter ihre Oberkante ab. Ohne Übergang, weil
      // ein Opacity-Fade diesen Knoten zur Backdrop-Root macht und die
      // Glas-Ebene darunter schlagartig klar würde (die iOS-Compositing-Klasse
      // aus daily-focus.tsx); nativ verdeckt die Tastatur eine Tab-Leiste
      // ohnehin, statt sie auszublenden.
      className={cn("sticky bottom-0 z-50 border-t", keyboardOpen && "invisible")}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Glass background on a separate, absolutely-positioned layer. Putting
          backdrop-filter directly on the fixed <nav> triggers a WebKit/iOS bug
          where the bar anchors to the content bottom instead of the viewport on
          short, non-scrolling pages. An absolute (non-fixed) layer avoids it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-background/70 backdrop-blur-xl"
      />
      <ul className="relative mx-auto flex h-16 max-w-lg items-center justify-around">
        {navItems.map(({ label, href, icon: Icon }, i) => {
          const isActive = i === activeIndex;

          return (
            <li key={href} ref={(el) => { itemRefs.current[i] = el; }}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={cn("h-5 w-5", isActive && "fill-primary/10")}
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}

        {/* Sliding active-tab indicator (absolute → out of flow, ignored by justify-around). */}
        <li
          ref={indicatorRef}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 left-0 opacity-0"
        >
          <span className="block h-0.5 w-8 rounded-full bg-primary" />
        </li>
      </ul>
    </nav>
  );
}
