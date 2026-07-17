import { AmbientBlobs, type Blob } from "@/components/ui/ambient-blobs";

/**
 * App-wide ambient backdrop: soft, slowly drifting color blobs fixed behind the
 * whole app (see the "Dusk Membership" preview). The aubergine `body` background
 * is the canvas; these gold/rosé/lavender blobs float on top of it, and the
 * translucent glass cards above let them shine through.
 *
 * Sits at `-z-10` so it stays behind page content but above the body canvas.
 * Reduced motion is handled inside `AmbientBlobs` (blobs stay static).
 */

// Viewport-tuned: larger and pushed toward the corners so the color reads across
// the whole screen rather than clustering in one card.
const VIEWPORT_BLOBS: Blob[] = [
  {
    color: "var(--primary)", // Reframe gold
    className: "-left-32 -top-32 size-[26rem] opacity-[0.20] blur-[100px]",
    x: 40,
    y: 30,
    duration: 18,
  },
  {
    color: "var(--celebrate)", // Rosé
    className: "-right-28 bottom-[-8rem] size-[24rem] opacity-[0.16] blur-[100px]",
    x: -34,
    y: -26,
    duration: 22,
  },
  {
    color: "var(--muted-foreground)", // Lavendel
    className: "left-1/3 top-1/3 size-[22rem] opacity-[0.12] blur-[100px]",
    x: 28,
    y: 36,
    duration: 15,
  },
];

export function AppBackdrop() {
  return (
    <>
      {/* Body-Verlauf: oben dunkler (Nacht vertieft sich nach oben), unten der
          --background-Grundton. Fixe Ebene statt background-attachment:fixed
          (iOS ignoriert das); Endpunkte werden von scripts/check-contrast.mjs
          gegen --card verifiziert (GRADIENT_TOP). */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: "linear-gradient(180deg, #131020 0%, var(--background) 78%)",
        }}
      />
      <AmbientBlobs blobs={VIEWPORT_BLOBS} className="fixed inset-0 -z-10" />
    </>
  );
}
