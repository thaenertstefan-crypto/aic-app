import { Mascot, type MascotExpression, type MascotSize } from "@/components/brand/mascot";
import { MascotPeek } from "@/components/brand/mascot-peek";

/** Reine Präsenz-Komponente — der zentrierte Begleiter über dem Schritt-Inhalt
 *  (Schritte 6-8 + Completion-Screen). */
export function OverthinkingCompanion({
  expression,
  size = "sm",
  breathing = false,
}: {
  expression: MascotExpression;
  size?: MascotSize;
  /** Ausatmen-Choreografie für den „Atme durch"-Moment. */
  breathing?: boolean;
}) {
  return (
    <div className="flex justify-center pb-1">
      <Mascot
        expression={expression}
        size={size}
        pulseSeconds={breathing ? 11.5 : 3}
        breathing={breathing}
      />
    </div>
  );
}

/** Kleiner Notizblock + Stift, den der Eck-Begleiter „vor sich hält". Liegt im
 *  rotierten Container der MascotPeek → kippt und gleitet mit dem Mascot mit. */
function NotepadAccessory() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 bottom-1 -translate-x-[35%] w-14"
    >
      <svg viewBox="0 0 40 32" className="w-full drop-shadow-sm">
        {/* Horizontal gespiegelt → Stift sitzt auf der anderen Seite des Blocks */}
        <g transform="translate(40,0) scale(-1,1)">
        {/* Notizblock */}
        <rect
          x={4}
          y={3}
          width={26}
          height={26}
          rx={3}
          fill="#FBF6EA"
          stroke="var(--primary-foreground)"
          strokeWidth={1.6}
        />
        {/* Spiralbindung oben */}
        <line x1={9} y1={1} x2={9} y2={6} stroke="var(--primary-foreground)" strokeWidth={1.4} strokeLinecap="round" />
        <line x1={17} y1={1} x2={17} y2={6} stroke="var(--primary-foreground)" strokeWidth={1.4} strokeLinecap="round" />
        <line x1={25} y1={1} x2={25} y2={6} stroke="var(--primary-foreground)" strokeWidth={1.4} strokeLinecap="round" />
        {/* Notiz-Linien */}
        <line x1={9} y1={13} x2={25} y2={13} stroke="var(--primary)" strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
        <line x1={9} y1={18} x2={25} y2={18} stroke="var(--primary)" strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
        <line x1={9} y1={23} x2={20} y2={23} stroke="var(--primary)" strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
        {/* Stift, schräg daneben */}
        <g transform="rotate(28 32 18)">
          <rect x={30} y={6} width={4} height={20} rx={1.2} fill="var(--primary)" />
          <polygon points="30,26 34,26 32,31" fill="var(--primary-foreground)" />
          <rect x={30} y={5} width={4} height={3} rx={1} fill="var(--celebrate)" />
        </g>
        </g>
      </svg>
    </span>
  );
}

/** Eck-Begleiter für die Frage-Schritte (2-5): lugt — wie auf der Auth-Hero
 *  beim Kaltstart — unten rechts halb hinter dem Rand hervor, ~45° gekippt,
 *  Blick nach links oben, und hält einen kleinen Notizblock vor sich.
 *  Positionierung kommt per `className` vom Aufrufer. */
export function OverthinkingPeekCompanion({ className }: { className?: string }) {
  return (
    <MascotPeek
      from="right"
      size="lg"
      rotate={-45}
      gazeX={0}
      gazeY={-3}
      expression="curious"
      accessory={<NotepadAccessory />}
      className={className}
    />
  );
}
