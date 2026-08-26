import type { ReactNode } from "react";

import { SubPageHeader } from "@/components/layout/sub-page-header";

/**
 * Das Gerüst einer Sub-Page — die Seite in ihrem ersten Frame, kein dritter
 * Zustand neben Übergang und Wartescreen (KAN-30).
 *
 * Der Header steht schon **echt** da: Titel und Rückweg hängen an keiner
 * Abfrage, also gibt es keinen Grund, sie zu skelettieren. Was fehlt, ist der
 * Inhalt — und genau der ist unten drin als Skelett *seiner eigenen* Seite,
 * nie als generischer Balkensalat.
 *
 * Höhe über `flex-1`, geerbt vom `main` des App-Layouts (KAN-64) — ein Gerüst,
 * das selbst am Viewport misst, schiebt die Seite über den Schirm hinaus.
 */
export function SubPageScaffold({
  backHref,
  title,
  subtitle,
  backdrop,
  children,
}: {
  backHref: string;
  title: string;
  subtitle?: string;
  /** Der Hintergrund der Zone (Sternenhimmel, Esse …). Gehört zum Rahmen: er
   *  steht im ersten Frame, sonst „ploppt" er beim Eintreffen des Inhalts. */
  backdrop?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative flex flex-1 flex-col">
      {backdrop}
      <SubPageHeader backHref={backHref} title={title} subtitle={subtitle} />
      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-6">
        {children}
      </div>
    </div>
  );
}
