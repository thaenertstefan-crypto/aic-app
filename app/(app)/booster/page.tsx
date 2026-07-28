import { PAGE_TITLES } from "@/lib/content/labels";
import { SkyBackdrop } from "@/components/backdrops/sky-backdrop";
import { BoosterCells } from "@/components/booster/booster-cells";

export default function BoosterPage() {
  return (
    <div className="space-y-6 p-4">
      <header className="space-y-3">
        <h1 className="font-heading text-5xl font-bold tracking-tight text-foreground">
          {PAGE_TITLES.booster}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Manchmal schlägt das Wetter um: Zweifel, Gedankenspiralen oder
          Überforderung ziehen auf. Die folgenden Hilfen machen dich wetterfest
          gegen die Stürme und Regenwolken in deinem Kopf. Was brauchst du
          gerade?
        </p>
      </header>

      <div className="relative -mx-4 overflow-x-clip">
        {/* Nachthimmel-Hintergrund (geteilte fixe -z-10-Ebene). */}
        <SkyBackdrop />
        <BoosterCells />
      </div>
    </div>
  );
}
