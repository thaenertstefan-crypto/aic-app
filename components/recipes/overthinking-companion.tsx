import { Mascot, type MascotExpression } from "@/components/brand/mascot";

/** Reine Präsenz-Komponente — noch ohne Sprechblasen-Text (kommt in
 *  Phase 9, Schritt 4b). */
export function OverthinkingCompanion({
  expression,
  breathing = false,
}: {
  expression: MascotExpression;
  /** Ausatmen-Choreografie für den „Atme durch"-Moment (Schritt 1). */
  breathing?: boolean;
}) {
  return (
    <div className="flex justify-center pb-1">
      <Mascot
        expression={expression}
        size="sm"
        pulseSeconds={breathing ? 11.5 : 3}
        breathing={breathing}
      />
    </div>
  );
}
