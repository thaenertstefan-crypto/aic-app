/**
 * Dashboard-only atmospheric backdrop — a "suggested night sky".
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
          lit against a darker night; fades out by ~42% so the app's ambient
          blobs still breathe through the mid-page. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.26) 22%, transparent 42%)",
        }}
      />
      {/* Horizon-glow: a wide, soft band of warm candle-gold light low behind
          the mascot (upper third of the viewport), spanning the full width.
          Derived from the brand gold (--primary) via the app's color-mix idiom,
          kept low-alpha so it never competes with the single gold CTA below. */}
      <div
        className="absolute inset-x-0"
        style={{
          top: "8%",
          height: "34%",
          background:
            "radial-gradient(120% 60% at 50% 90%, color-mix(in srgb, var(--primary) 20%, transparent), color-mix(in srgb, var(--primary) 6%, transparent) 45%, transparent 72%)",
        }}
      />
      {/* Two distant lights in the upper sky. */}
      <span className="sky-light sky-light-twinkle absolute left-[18%] top-[12%]" />
      <span
        className="sky-light sky-light-twinkle absolute right-[22%] top-[18%]"
        style={{ animationDelay: "1.6s" }}
      />
    </div>
  );
}
