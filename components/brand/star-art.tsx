import { cn } from "@/lib/utils";
import { StarGlyph } from "@/components/brand/star-glyph";

/**
 * Glühender Stern — Signatur-Ornament der Wants. Delegiert an `StarGlyph`, die
 * Glyphe der echten Wants-Sterne auf der Sternenkarte: derselbe STAR_PATH,
 * derselbe statische Schein und dasselbe leise Funkeln (`want-star-twinkle`,
 * reiner Opacity-Loop). /me-Hub, Onboarding-Preview und die Wants-Seite sprechen
 * damit nicht nur dieselbe Form, sondern auch dieselbe Bewegung.
 * `dim` blasst ihn aus (leerer Zustand), `animate` lässt ihn funkeln.
 */
export function StarArt({
  animate,
  dim = false,
  className,
}: {
  animate: boolean;
  dim?: boolean;
  className?: string;
}) {
  return (
    <StarGlyph
      sizeClass="size-14"
      // Kräftiger als die 6 px der size-6-Karten-Sterne: als Ornament steht die
      // Glyphe auf size-16/size-20, ein 6-px-Schein läse sich dort flach.
      glow={dim ? 6 : 10}
      twinkle={animate}
      className={cn(dim && "opacity-40", className)}
    />
  );
}
