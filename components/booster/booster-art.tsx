import {
  ClearingStar,
  CloudStack,
  StormCloud,
  UmbrellaRain,
  WindSwirl,
} from "@/app/(app)/booster/weather-art";

/**
 * Wetter-Motiv je Kopfwetter-System — EINE Quelle für den Hub, den fliegenden
 * Zoom-Klon und das Modul-Icon auf der Sub-Page. Wer ein System hinzufügt oder
 * umbenennt, tut es hier: `CellVariant` ist die Schlüsselmenge dieser Tabelle,
 * es gibt keine zweite Liste daneben.
 */
export const BOOSTER_ART = {
  overthinking: WindSwirl,
  sayingNo: UmbrellaRain,
  messy: CloudStack,
  shadow: StormCloud,
  confidence: ClearingStar,
} satisfies Record<string, (props: { className?: string }) => React.ReactElement>;

/** Die fünf Kopfwetter-Systeme. */
export type CellVariant = keyof typeof BOOSTER_ART;
