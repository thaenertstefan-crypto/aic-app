"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Scrollt bei jeder client-seitigen Navigation zurück nach ganz oben.
 * Der Next.js App Router behält sonst bei manchen Routenwechseln die
 * Scroll-Position bei, sodass man mitten auf der neuen Seite landet.
 *
 * behavior: "instant" ist gewünscht — kein smooth-Scroll, auch unter
 * prefers-reduced-motion.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
