import { cn } from "@/lib/utils";
import { getValueLabel } from "@/lib/utils/values-bank";
import { getValueEmoji } from "@/lib/utils/values-emojis";

/**
 * Die EINE Werte-Darstellung der Auswertung: Emoji + deutsches Label. Vorher
 * gab es drei leicht unterschiedliche Chip-Varianten auf denselben Bühnen
 * (bestätigt / neu / Live-Stand / Abschluss) — Unterschiede, die nichts
 * bedeuteten. Das Emoji ist dasselbe wie auf der Kompassrose, damit ein Wert
 * über die Bühnen hinweg wiedererkennbar bleibt.
 */
export function ValueChip({
  valueId,
  className,
}: {
  valueId: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary",
        className,
      )}
    >
      <span aria-hidden="true">{getValueEmoji(valueId)}</span>
      {getValueLabel(valueId)}
    </span>
  );
}
