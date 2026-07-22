/**
 * Sternschmiede-only atmospheric backdrop — die „Esse" (Schmiedefeuer).
 *
 * Schwester zu SkyBackdrop, aber invertiert: der Raum vertieft sich nach OBEN
 * (das Gewölbe), und am unteren Rand pool't eine warme Glut — das Schmiedefeuer,
 * aus dem Funken aufsteigen. Rein gemalte Gradienten (kein backdrop-filter), GPU-
 * günstig, iOS-freundlich. Sitzt bei -z-10 hinter dem Seiteninhalt und wird von
 * der Sternschmiede-Komponente gerendert (unmountet beim Verlassen).
 *
 * On-brand: die Glut ist ROSÉ (--celebrate, die Wants/Schmiede-Modulfarbe), nicht
 * Gold — Gold bleibt der einen CTA vorbehalten. Low-alpha, damit die Glut nie mit
 * der Gold-CTA konkurriert. `intensity="hot"` (Warte-Screen) macht die Glut
 * kräftiger und legt einen warmen Gold-Kern-Hauch an den Boden.
 *
 * aria-hidden + pointer-events-none — reine Dekoration.
 */
export function ForgeBackdrop({
  intensity = "calm",
}: {
  intensity?: "calm" | "hot";
}) {
  const hot = intensity === "hot";
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* Tiefen-Wash: den Aubergine-Grund nach OBEN vertiefen (Gewölbe), langer
          Mehrstufen-Fade ohne harte Naht, damit die Ambient-Blobs mittig atmen. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.28) 18%, rgba(0,0,0,0.12) 34%, rgba(0,0,0,0.04) 48%, transparent 62%)",
        }}
      />
      {/* Glut-Pool: breiter, weicher Rosé-Bloom vom unteren Rand. Low-alpha =
          Hitze, nicht zweite Kerze. „hot" (Warte-Screen) hebt die Alpha an. */}
      <div
        className="absolute inset-0"
        style={{
          background: hot
            ? "radial-gradient(120% 58% at 50% 100%, color-mix(in srgb, var(--celebrate) 34%, transparent), color-mix(in srgb, var(--celebrate) 12%, transparent) 44%, transparent 74%)"
            : "radial-gradient(120% 55% at 50% 100%, color-mix(in srgb, var(--celebrate) 22%, transparent), color-mix(in srgb, var(--celebrate) 8%, transparent) 42%, transparent 72%)",
        }}
      />
      {/* Engerer, hellerer Rosé-Kern direkt am Boden für ein heißeres Zentrum. */}
      <div
        className="absolute inset-0"
        style={{
          background: hot
            ? "radial-gradient(48% 30% at 50% 100%, color-mix(in srgb, var(--celebrate) 22%, transparent), transparent 70%)"
            : "radial-gradient(45% 26% at 50% 100%, color-mix(in srgb, var(--celebrate) 14%, transparent), transparent 70%)",
        }}
      />
      {/* Nur „hot": ein warmer Gold-Hauch tief im Feuer — der Moment, in dem das
          Metall glüht. Sehr low-alpha, bricht die One-Candle-Rule nicht (kein
          CTA-Konkurrent, reine Glut ganz am Boden). */}
      {hot && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(40% 20% at 50% 100%, color-mix(in srgb, var(--primary) 16%, transparent), transparent 68%)",
          }}
        />
      )}
      {/* Ein paar Deko-Funken, die aus dem Feuer aufsteigen (--celebrate, bereits
          rosé in .forge-spark). Versetzte Delays, einer dimmer für Tiefe. */}
      <span className="forge-spark absolute bottom-[8%] left-[28%]" />
      <span
        className="forge-spark absolute bottom-[12%] right-[30%]"
        style={{ animationDelay: "1.9s" }}
      />
      <span
        className="forge-spark absolute bottom-[6%] left-[52%]"
        style={{ width: "3px", height: "3px", animationDelay: "3.4s" }}
      />
      <span
        className="forge-spark absolute bottom-[16%] left-[16%]"
        style={{ animationDelay: "0.7s" }}
      />
      <span
        className="forge-spark absolute bottom-[10%] right-[18%]"
        style={{ width: "3px", height: "3px", animationDelay: "2.6s" }}
      />
    </div>
  );
}
