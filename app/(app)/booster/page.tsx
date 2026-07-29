import { PAGE_TITLES } from "@/lib/content/labels";
import { BoosterCells } from "@/components/booster/booster-cells";
import { BoosterHubStage } from "@/components/booster/booster-hub-stage";

export default function BoosterPage() {
  return (
    // Alles innerhalb der Bühne strömt beim Zoom-Übergang am Tap-Punkt verankert
    // nach außen — Seitenkopf eingeschlossen. Der Nachthimmel hängt bewusst eine
    // Ebene höher im Layout (siehe dort) und bleibt dabei stehen.
    <BoosterHubStage>
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
          <BoosterCells />
        </div>
      </div>
    </BoosterHubStage>
  );
}
