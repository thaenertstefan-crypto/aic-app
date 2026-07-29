import {
  ClearingStar,
  CloudStack,
  StormCloud,
  UmbrellaRain,
  WindSwirl,
} from "@/app/(app)/booster/weather-art";
import type { CellVariant } from "@/app/(app)/booster/pressure-cell";

/**
 * Wetter-Motiv je Kopfwetter-System — EINE Quelle für die Hub-Zelle, den
 * fliegenden Zoom-Klon und das Modul-Icon auf der Sub-Page. Ohne diese Map
 * müsste der Zoom-Klon die Variante erneut auf ein Motiv mappen und könnte von
 * der Hub-Zelle abdriften.
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
