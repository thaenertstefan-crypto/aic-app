import {
  Cloudy,
  Heart,
  Quote,
  ScrollText,
  Sparkles,
  Wind,
  type LucideIcon,
} from "lucide-react";

/**
 * Stilisierte Mini-Vorschauen der App-Bereiche für die Onboarding-Intro-Karten.
 * Bewusst rein präsentativ (kein echter Screenshot) und im selben Look wie die
 * echten Seiten ([me/page.tsx], [booster/page.tsx]) — Icons/Labels gespiegelt,
 * damit die Vorschau zur Realität passt.
 */

function PreviewRow({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-2">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Icon className="size-3.5" />
      </div>
      <span className="font-heading text-xs font-medium text-foreground">
        {label}
      </span>
    </div>
  );
}

function PreviewTile({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2 py-2">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Icon className="size-3" />
      </div>
      <span className="font-heading text-[11px] font-medium leading-tight text-foreground">
        {label}
      </span>
    </div>
  );
}

/** Vorschau auf den „Me“-Bereich (vgl. [me/page.tsx]). */
export function MePreview() {
  return (
    <div aria-hidden="true" className="space-y-2">
      <PreviewRow icon={Sparkles} label="Meine Werte" />
      <PreviewRow icon={Heart} label="Meine Wants" />
      <PreviewRow icon={ScrollText} label="Meine Bill of Rights" />
    </div>
  );
}

/** Vorschau auf das Kopfwetter (vgl. [booster/page.tsx]). */
export function BoosterPreview() {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-2">
      <PreviewTile icon={Wind} label="Overthinking" />
      <PreviewTile icon={Cloudy} label="Things Got Messy" />
      <PreviewTile icon={Sparkles} label="Confidence" />
      <PreviewTile icon={Quote} label="Mantra" />
    </div>
  );
}
