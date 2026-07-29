import {
  ClearingStar,
  CloudStack,
  StormCloud,
  UmbrellaRain,
  WindSwirl,
} from "@/app/(app)/booster/weather-art";
import type { CellVariant } from "@/app/(app)/booster/pressure-cell";

/**
 * Wetter-Motiv je Kopfwetter-System — EINE Quelle für den fliegenden
 * Zoom-Klon und das Modul-Icon auf der Sub-Page (beide seit dem Zoom-Task
 * Konsumenten). Die Hub-Zelle selbst mappt ihre Variante weiterhin separat
 * auf ein Motiv (`weather-art.tsx`) — sie an dieselbe Quelle anzugleichen
 * bleibt eine mögliche Folge-Task, ist aber kein offener Punkt dieses Diffs.
 */
export const BOOSTER_ART: Record<
  CellVariant,
  (props: { className?: string }) => React.ReactElement
> = {
  overthinking: WindSwirl,
  sayingNo: UmbrellaRain,
  messy: CloudStack,
  shadow: StormCloud,
  confidence: ClearingStar,
};
