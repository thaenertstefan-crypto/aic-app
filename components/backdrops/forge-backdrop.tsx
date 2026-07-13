/**
 * Sternschmiede-only atmospheric backdrop — a "suggested forge".
 *
 * Sister to SkyBackdrop, but inverted: instead of a night sky darkening upward,
 * the room deepens toward the TOP (the forge is underground, you've dived down)
 * and a warm candle-gold/amber ember-glow pools at the BOTTOM — the forge fire.
 * A few embers drift up on offset delays. Purely painted gradients (no
 * backdrop-filter) so it stays GPU-cheap and honours the Glass-Is-Rare rule.
 * Sits at -z-10 (like SkyBackdrop/AppBackdrop) so it stays behind page content;
 * rendered by the Sternschmiede component, so it unmounts on navigation away.
 *
 * On-brand: stays inside the aubergine + one-gold palette (no bright orange),
 * kept low-alpha so the ember pool never competes with the single gold CTA.
 *
 * aria-hidden + pointer-events-none — pure decoration.
 */
export function ForgeBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {/* Depth wash: deepen the aubergine ground toward the TOP (the vault
          above), a long multi-stop fade so there is no hard seam and the app's
          ambient blobs still breathe through mid-page. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.28) 18%, rgba(0,0,0,0.12) 34%, rgba(0,0,0,0.04) 48%, transparent 62%)",
        }}
      />
      {/* Ember pool: a wide, soft bloom of warm forge-fire light rising from the
          bottom edge. Derived from the brand gold (--primary) blended with the
          dim amber-accent tint, kept low-alpha so it reads as heat, not as a
          second candle. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 55% at 50% 100%, color-mix(in srgb, var(--primary) 22%, transparent), color-mix(in srgb, var(--primary) 8%, transparent) 42%, transparent 72%)",
        }}
      />
      {/* A second, tighter core right at the anvil's feet for a hotter center. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(45% 26% at 50% 100%, color-mix(in srgb, var(--celebrate) 14%, transparent), transparent 70%)",
        }}
      />
      {/* A handful of embers drifting up out of the fire. Some rise on offset
          delays, one sits dimmer for depth. Positioned across the lower third. */}
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
