import {
  ClearingStar,
  CloudStack,
  StormCloud,
  UmbrellaRain,
  WindSwirl,
} from "@/app/(app)/booster/weather-art";
import type { CellVariant } from "@/app/(app)/booster/pressure-cell";

/**
 * Wetter-Motiv je Kopfwetter-System — gedacht als EINE Quelle für die
 * Hub-Zelle, den fliegenden Zoom-Klon und das Modul-Icon auf der Sub-Page.
 * Heute nur vom Modul-Icon konsumiert; Hub-Zelle und Zoom-Klon sollen in
 * einer Folge-Task darauf umgestellt werden, statt die Variante erneut auf
 * ein Motiv zu mappen und so von der Hub-Zelle abzudriften.
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
