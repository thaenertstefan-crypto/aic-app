/**
 * Shared atmospheric backdrop (Dashboard + Wants) — a "suggested night sky".
 *
 * Layers a downward-darkening sky wash, a soft candle-gold horizon-glow behind
 * where the mascot sits, and two barely-visible distant lights. Purely painted
 * gradients (no backdrop-filter) so it stays GPU-cheap and honours the
 * Glass-Is-Rare rule. Sits at -z-10 (like AppBackdrop) so it stays behind page
 * content; rendered by the dashboard page, so it unmounts on navigation away.
 *
 * aria-hidden + pointer-events-none — pure decoration.
 */
export function SkyBackdrop() {
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
      {/* Horizon-glow: a wide, soft bloom of warm candle-gold light behind the
          mascot (upper third), spanning the full width. Painted on a full-size
          layer and positioned via the gradient itself (no clipping box), so it
          fades out smoothly. Derived from the brand gold (--primary) via the
          app's color-mix idiom, kept low-alpha so it never competes with the
          single gold CTA below. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 42% at 50% 24%, color-mix(in srgb, var(--primary) 20%, transparent), color-mix(in srgb, var(--primary) 6%, transparent) 45%, transparent 70%)",
        }}
      />
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
        style={{ width: "3px", height: "3px", animationDelay: "3.1s" }}
      />
      <span
        className="sky-light sky-light-twinkle absolute right-[12%] top-[8%]"
        style={{ animationDelay: "0.8s" }}
      />
      <span
        className="sky-light absolute left-[38%] top-[7%]"
        style={{ opacity: 0.16 }}
      />
      <span
        className="sky-light absolute right-[34%] top-[30%]"
        style={{ width: "3px", height: "3px", opacity: 0.18 }}
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
        style={{ width: "3px", height: "3px", animationDelay: "1.2s" }}
      />
      <span
        className="sky-light sky-light-twinkle absolute right-[42%] top-[47%]"
        style={{ animationDelay: "5.1s" }}
      />
      <span
        className="sky-light absolute left-[66%] top-[42%]"
        style={{ opacity: 0.15 }}
      />
      <span
        className="sky-light sky-light-twinkle absolute left-[22%] top-[52%]"
        style={{ animationDelay: "2.9s" }}
      />
      <span
        className="sky-light absolute right-[26%] top-[36%]"
        style={{ width: "3px", height: "3px", opacity: 0.17 }}
      />
    </div>
  );
}
