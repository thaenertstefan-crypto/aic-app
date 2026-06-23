import { Mascot } from "@/components/brand/mascot";
import { cn } from "@/lib/utils";

/** Weiße Barrister-Perücke — im 0 0 64 64-Raum des Mascot-Gesichts gerendert,
 *  liegt also passgenau über dem Kopf und wird vom Blob beschnitten. Die
 *  Seitenlocken sitzen außerhalb der Augen (x≈12 / x≈52), das Gesicht bleibt
 *  frei. */
const JudgeWig = (
  <g fill="var(--foreground)" stroke="rgba(0,0,0,0.10)" strokeWidth="0.5">
    {/* Krone */}
    <path d="M13,22 Q11,5 32,4 Q53,5 51,22 Q44,12 32,12 Q20,12 13,22 Z" />
    {/* Seitenlocken links */}
    <circle cx="13" cy="22" r="4.5" />
    <circle cx="12" cy="30" r="4" />
    <circle cx="13" cy="37" r="3.5" />
    {/* Seitenlocken rechts */}
    <circle cx="51" cy="22" r="4.5" />
    <circle cx="52" cy="30" r="4" />
    <circle cx="51" cy="37" r="3.5" />
  </g>
);

/**
 * Maskottchen in Richter-Verkleidung: Mascot mit weißer Perücke (Overlay) und
 * dunkler Robe samt weißem Jabot dahinter. Nur für /me/bill-of-rights gedacht.
 */
export function MascotJudge({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative mx-auto", className)}
      style={{ width: 112, height: 124 }}
      aria-hidden="true"
    >
      {/* Robe hinter dem Maskottchen, ragt unten/seitlich heraus */}
      <svg
        viewBox="0 0 112 70"
        width="112"
        height="70"
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
      >
        <path
          d="M16,18 Q28,8 56,8 Q84,8 96,18 L104,70 L8,70 Z"
          fill="var(--secondary)"
          stroke="var(--border)"
          strokeWidth="1"
        />
        {/* Weißes Jabot am Ausschnitt */}
        <path
          d="M56,8 L49,30 L56,42 L63,30 Z"
          fill="var(--foreground)"
          stroke="var(--border)"
          strokeWidth="0.5"
        />
      </svg>

      {/* Maskottchen mit Perücke, würdevoller Blick leicht nach unten */}
      <Mascot
        size="md"
        expression="smile"
        gazeX={0}
        gazeY={1}
        overlay={JudgeWig}
        className="absolute left-1/2 top-0 -translate-x-1/2"
      />
    </div>
  );
}
