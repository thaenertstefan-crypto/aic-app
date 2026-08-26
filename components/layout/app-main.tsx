"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { useTakt } from "@/components/layout/einblenden";
import { traegtEinFlug } from "@/lib/motion/uebergang";

/**
 * Die Inhaltsfläche der App — und die Stelle, an der der generische Übergang
 * für **alle** Routenwechsel hängt (KAN-53). Ein Baustein, nicht pro Seite
 * kopiert.
 *
 * Nur der Inhalt blendet ein, nicht der ganze Schirm: Hintergrund und
 * Bottom-Nav stehen außerhalb und sind bleibende Möbel — eine Leiste, die bei
 * jedem Tab-Wechsel mitblinkt, liest sich als Fehler.
 *
 * Getragen wird der Wechsel erst, wenn die Navigation committet ist. Genau
 * dafür bekommt jede datenabhängige Route ein `loading.tsx`: ohne wartet der
 * Client auf die Serverantwort, bevor überhaupt etwas passiert — mit hat der
 * Übergang sofort etwas, in das er einblenden kann.
 *
 * Trägt ein Flug den Wechsel (`traegtEinFlug`), hält das Einblenden still.
 */
export function AppMain({ children }: { children: ReactNode }) {
  const takt = useTakt(usePathname(), traegtEinFlug);

  return (
    <main
      data-einblenden={takt}
      // overflow-x-clip fängt horizontale Overflows (z. B. seitlich aus dem
      // Bild fliegende Dekor-Wolken) am echten Viewport-Rand ab, ohne einen
      // Scroll-Container zu erzeugen — verhindert das Seiten-Scrollen.
      //
      // `flex flex-1 flex-col` ist die Höhen-Weitergabe (KAN-64): eine Seite
      // darin fordert ihre Höhe mit `flex-1` an und ERBT sie damit, statt
      // selbst am Viewport zu messen.
      className="flex flex-1 flex-col overflow-x-clip"
    >
      {children}
    </main>
  );
}
