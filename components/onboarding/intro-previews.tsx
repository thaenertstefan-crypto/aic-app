import { StarArt } from "@/components/brand/star-art";
import { CompassArt, SealArt } from "@/components/brand/me-ornaments";
import {
  ClearingStar,
  CloudStack,
  StormCloud,
  UmbrellaRain,
  WindSwirl,
} from "@/app/(app)/booster/weather-art";
import { ONBOARDING_COMPASS_EMOJIS } from "@/lib/content/onboarding-intro";

/**
 * Mini-Vorschauen der App-Bereiche für die Onboarding-Intro-Karten. Bewusst
 * rein präsentativ und mit denselben Ornamenten wie die echten Seiten gerendert
 * ([me-hub.tsx] / [booster/page.tsx]) — die Vorschau kann so nicht mehr von der
 * Realität abdriften. Ornamente ruhig (animate={false}), klein skaliert.
 */

/** Vorschau auf den „Me"-Bereich — die drei Szenen wie im Hub. */
export function MePreview() {
  const scenes = [
    {
      art: (
        <CompassArt
          emojis={ONBOARDING_COMPASS_EMOJIS}
          animate={true}
          className="size-9"
        />
      ),
      label: "Meine Werte",
    },
    { art: <StarArt animate={true} className="size-9" />, label: "Meine Wants" },
    { art: <SealArt animate={true} className="size-9" />, label: "Meine Bill of Rights" },
  ];
  return (
    <div aria-hidden="true" className="divide-y divide-border/70">
      {scenes.map((s) => (
        <div key={s.label} className="flex items-center gap-3 py-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center">
            {s.art}
          </span>
          <span className="font-heading text-sm font-medium text-foreground">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Vorschau auf das Kopfwetter — die fünf Wetter-Systeme (vgl. [booster/page.tsx]). */
export function BoosterPreview() {
  const systems = [
    { art: <WindSwirl className="size-9" />, label: "Overthinking" },
    { art: <UmbrellaRain className="size-9" />, label: "Nein sagen" },
    { art: <CloudStack className="size-9" />, label: "Things Got Messy" },
    { art: <StormCloud className="size-9" />, label: "Schattenseite" },
    { art: <ClearingStar className="size-9" />, label: "Confidence" },
  ];
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-x-3 gap-y-1">
      {systems.map((s) => (
        <div key={s.label} className="flex items-center gap-2 py-1.5">
          <span className="flex size-9 shrink-0 items-center justify-center">
            {s.art}
          </span>
          <span className="font-heading text-[11px] font-medium leading-tight text-foreground">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
