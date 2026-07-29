import { cn } from "@/lib/utils";
import {
  ReframeAnimation,
  type ReframePair,
} from "@/components/auth/reframe-animation";

const DEFAULT_HEADLINE = "Willkommen im Club, den niemand zugibt zu brauchen.";
const DEFAULT_SUBLINE =
  "Fast jeder kennt die Stimme im Kopf, die sagt „du bist nicht gut genug“. Hier lernst du, ihr nicht mehr zu glauben — mit kleinen Übungen, die wirklich etwas verändern.";

type BrandPanelProps = {
  headline?: string;
  subline?: string;
  pairs?: ReframePair[];
  className?: string;
};

/**
 * Emotionale Brand-Seite für die Auth-Seiten: selbstbewusste Headline, warme
 * Subline und das animierte Reframe als Hero-Element. Layout-unabhängig.
 *
 * Bewusst ohne eigenen Hintergrund und ohne Deko-Blob: Die Tiefe kommt vom
 * `SkyBackdrop`, der im Signup-Hero darunter liegt. Der frühere `blur-3xl`-Blob
 * war die zweite atmosphärische Ebene (dieselbe, die bei `AmbientBlobs` schon
 * entfernt wurde) — und weil ihn `overflow-hidden` an der Panel-Oberkante
 * abschnitt, zog ein 64-px-Blur dort eine harte waagerechte Kante quer über den
 * Hero, direkt unter dem Logo.
 */
export function BrandPanel({
  headline = DEFAULT_HEADLINE,
  subline = DEFAULT_SUBLINE,
  pairs,
  className,
}: BrandPanelProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="flex flex-col gap-6 p-8 sm:p-10">
        <h1 className="font-heading text-4xl font-semibold leading-tight text-balance text-foreground md:text-5xl">
          {headline}
        </h1>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground">
          {subline}
        </p>
        <ReframeAnimation pairs={pairs} className="mt-2" />
      </div>
    </div>
  );
}
