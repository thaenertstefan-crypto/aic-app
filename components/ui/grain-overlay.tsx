/**
 * Statisches Film-Korn über der App — nimmt dem Dunkeltheme das Plastikhafte
 * („Raum bei Kerzenlicht"-Materialität). Fixe, klicktransparente Ebene ohne
 * Animation: kein Repaint beim Scrollen, kein reduced-motion-Bedarf.
 * z-40: über Content/Bottom-Nav, unter Dialogen/Toasts (z-50).
 */
const NOISE_SVG = encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>" +
    "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/>" +
    "<feColorMatrix type='saturate' values='0'/></filter>" +
    "<rect width='100%' height='100%' filter='url(#n)'/></svg>",
);

export function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 opacity-[0.025]"
      style={{ backgroundImage: `url("data:image/svg+xml,${NOISE_SVG}")` }}
    />
  );
}
