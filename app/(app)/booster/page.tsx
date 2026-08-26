import { PAGE_TITLES } from "@/lib/content/labels";
import { BoosterCells } from "@/components/booster/booster-cells";
import { BoosterHubStage } from "@/components/booster/booster-hub-stage";
import { Druckfeld } from "@/components/booster/druckfeld";

export default function BoosterPage() {
  return (
    // Alles innerhalb der Bühne strömt beim Zoom-Übergang am Tap-Punkt verankert
    // nach außen — Seitenkopf eingeschlossen. Der Nachthimmel hängt bewusst eine
    // Ebene höher im Layout (siehe dort) und bleibt dabei stehen.
    <BoosterHubStage>
      <div className="p-4">
        {/* `relative z-10`: die Karte reicht hinter den Kopf hinauf (siehe
            Druckfeld) — ohne eigenen Stapelplatz läge sie über dem Text. */}
        <header className="relative z-10 space-y-3">
          <h1 className="font-heading text-5xl font-bold tracking-tight text-foreground">
            {PAGE_TITLES.booster}
          </h1>
          <p className="kw-legible text-sm leading-relaxed text-muted-foreground">
            Manchmal schlägt das Wetter um: Zweifel, Gedankenspiralen oder
            Überforderung ziehen auf. Die folgenden Hilfen machen dich wetterfest
            gegen die Stürme und Regenwolken in deinem Kopf. Was brauchst du
            gerade?
          </p>
        </header>

        {/* Die Karte läuft bis an den Schirmrand (`-mx-4`) — eine Wetterkarte
            mit Seitenrand wäre wieder ein Kasten auf der Seite.

            `Druckfeld` wird hier gerendert und hineingereicht, statt in
            `BoosterCells` importiert zu werden: die Zellen sind eine
            Client-Komponente, das Feld ist eine spürbare Rechnung. So läuft sie
            auf dem Server und nicht noch einmal im Browser. */}
        <div className="relative -mx-4 mt-6 overflow-x-clip">
          <BoosterCells feld={<Druckfeld />} />
        </div>
      </div>
    </BoosterHubStage>
  );
}
