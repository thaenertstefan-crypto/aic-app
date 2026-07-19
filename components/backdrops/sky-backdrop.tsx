/**
 * Shared atmospheric backdrop (Dashboard + Wants) — a "suggested night sky".
 *
 * Layers a downward-darkening sky wash and prominent distant lights. Purely
 * painted gradients (no backdrop-filter) so it stays GPU-cheap and honours the
 * Glass-Is-Rare rule. On the Dashboard, the sky reacts to the mood score (via
 * optional score prop). Sits at -z-10 (like AppBackdrop) so it stays behind
 * page content; rendered by the dashboard page, so it unmounts on navigation away.
 *
 * aria-hidden + pointer-events-none — pure decoration.
 */
export function SkyBackdrop({ score = null }: { score?: number | null }) {
  // Himmelsreaktion auf das Kopfwetter (nur mit Score — die Wants-Seite
  // rendert ohne und bleibt neutral): 1 = dunkel + Sterne verschleiert,
  // 2 = leicht gedimmt, 5 = Sterne heller/schneller.
  const veil = score === 1 ? 0.2 : score === 2 ? 0.1 : 0;
  const starsOpacity = score === 1 ? 0.35 : score === 2 ? 0.6 : 1;
  const bright = score === 5;
  // Nebel zieht bei rauem Wetter herein: stürmisch am stärksten, bewölkt dezent,
  // ab ruhig aufgelöst.
  const mist = score === 1 ? 0.5 : score === 2 ? 0.22 : 0;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* Sky wash: a soft black-alpha vignette that deepens the aubergine
          ground toward the top (a shade, not a new hue), so the mascot reads as
          lit against a darker night. Painted across the full layer with a long,
          multi-stop fade so there is no hard horizontal seam — it dissolves into
          the page so the app's ambient blobs still breathe through mid-page. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.2) 16%, rgba(0,0,0,0.08) 32%, rgba(0,0,0,0.02) 44%, transparent 56%)",
        }}
      />

      {/* Sterne-Gruppe: alle sky-light-Spans wandern hier hinein. Der Twinkle-Loop
          läuft durchgehend (feste Dauer) — nur Helligkeit/Opacity faden zwischen den
          Moods, damit das Feld nie neu anläuft. */}
      <div
        className="absolute inset-0 transition-[opacity,filter] duration-[1200ms] ease-out"
        style={{
          opacity: starsOpacity,
          filter: bright ? "brightness(1.5)" : undefined,
        }}
      >
        {/* A handful of distant lights scattered across the upper sky. Some
            twinkle on offset delays, one or two sit still for depth. The center
            around top-24% (where the mascot glow blooms) is left clear. */}
        <span className="sky-light sky-light-twinkle absolute left-[18%] top-[12%]" />
        <span
          className="sky-light sky-light-twinkle absolute right-[22%] top-[18%]"
          style={{ animationDelay: "1.6s" }}
        />
        <span
          className="sky-light sky-light-twinkle absolute left-[9%] top-[26%]"
          style={{ width: "4px", height: "4px", animationDelay: "3.1s" }}
        />
        <span
          className="sky-light sky-light-twinkle absolute right-[12%] top-[8%]"
          style={{ animationDelay: "0.8s" }}
        />
        <span
          className="sky-light absolute left-[38%] top-[7%]"
          style={{ opacity: 0.3 }}
        />
        <span
          className="sky-light absolute right-[34%] top-[30%]"
          style={{ opacity: 0.3 }}
        />
        {/* Zusätzliche Sterne Richtung Bildschirmmitte — gleiche Größen- und
            Funkel-Sprache, unterhalb des Mascot-Glows (top ≳ 32%). */}
        <span
          className="sky-light sky-light-twinkle absolute left-[46%] top-[14%]"
          style={{ animationDelay: "2.3s" }}
        />
        <span
          className="sky-light sky-light-twinkle absolute left-[58%] top-[34%]"
          style={{ animationDelay: "4.2s" }}
        />
        <span
          className="sky-light sky-light-twinkle absolute left-[30%] top-[40%]"
          style={{ width: "4px", height: "4px", animationDelay: "1.2s" }}
        />
        <span
          className="sky-light sky-light-twinkle absolute right-[42%] top-[47%]"
          style={{ animationDelay: "5.1s" }}
        />
        <span
          className="sky-light absolute left-[66%] top-[42%]"
          style={{ opacity: 0.3 }}
        />
        <span
          className="sky-light sky-light-twinkle absolute left-[22%] top-[52%]"
          style={{ animationDelay: "2.9s" }}
        />
        <span
          className="sky-light absolute right-[26%] top-[36%]"
          style={{ opacity: 0.3 }}
        />
        {/* 3 neue Sterne (gleiche Sprache, freie Bereiche): */}
        <span className="sky-light sky-light-twinkle absolute left-[74%] top-[22%]" style={{ animationDelay: "3.7s" }} />
        <span className="sky-light sky-light-twinkle absolute left-[12%] top-[44%]" style={{ animationDelay: "1.9s" }} />
        <span className="sky-light absolute right-[8%] top-[56%]" style={{ opacity: 0.3 }} />
      </div>

      {/* Nebel/Dunst-Ebene: weicher, langsam treibender Dunst im unteren Drittel,
          kühles Lavendel-Grau. Trägt bei rauem Wetter die Stimmung mit (statt reinem
          Abdunkeln); löst sich ab „ruhig" auf. Gemalter Gradient, kein backdrop-filter. */}
      <div
        className="absolute inset-x-0 bottom-0 h-2/5 overflow-hidden transition-opacity duration-[1200ms] ease-out"
        style={{ opacity: mist }}
      >
        <div
          className="sky-mist-drift absolute inset-y-0 -left-1/4 w-[150%]"
          style={{
            background:
              "linear-gradient(to top, color-mix(in srgb, var(--muted-foreground) 55%, transparent) 0%, transparent 85%)",
          }}
        />
      </div>

      {/* Wetter-Schleier: dunkelt den Himmel bei rauem Wetter ab (liegt im
          -z-10-Stack, dimmt also nur Backdrop-Ebenen, nie den Content). */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-[1200ms] ease-out"
        style={{ opacity: veil }}
      />
    </div>
  );
}
