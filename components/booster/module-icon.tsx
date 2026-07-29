import { BOOSTER_ART } from "@/components/booster/booster-art";
import type { CellVariant } from "@/app/(app)/booster/pressure-cell";

/**
 * Das Modul-Icon der Übung: sitzt auf der ERSTEN Seite jeder Booster-Übung
 * direkt unter dem (unveränderten) SubPageHeader und trägt dort die Signatur des
 * Wetter-Systems — dasselbe Motiv, das auf dem Hub angetippt wurde.
 *
 * Bewusst NICHT auf der Intro-Sequenz: dort sitzt das Intro-Maskottchen über der
 * Karte, zwei Signaturen auf einer Seite wären zu viel.
 */
export function ModuleIcon({ variant }: { variant: CellVariant }) {
  const Art = BOOSTER_ART[variant];
  return (
    <div className="flex justify-center pb-2 pt-1">
      <Art className="size-20" />
    </div>
  );
}
