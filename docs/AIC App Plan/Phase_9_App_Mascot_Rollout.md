# Phase 9: Der Mascot wird zum App-Begleiter

> Ziel: Den bestehenden `MoodAvatar` aus dem Dashboard zu einem generischen,
> wiederverwendbaren `Mascot` machen und an zwei risikoarmen Stellen testen
> (Auth-Hero + Login-Karte), bevor er als Begleiter ins Overthinking-Rezept
> einzieht. Jede Stelle ist einzeln bewertbar — du entscheidest nach jedem
> Block, ob's weitergeht.
>
> Geschätzte Dauer: 3–4 Tage (Schritt 4 ist der aufwändigste Teil)
>
> Voraussetzung: Phase 8 (Stimmungsbasierter Fokus) abgeschlossen — `MoodAvatar`
> existiert bereits in `components/dashboard/mood-avatar.tsx` und läuft live im
> Mood-Checkin.
>
> **Keine Datenbank-Änderung nötig.** Alles hier ist reine UI/Komponenten-Arbeit.
>
> **Code-Stand verifiziert:** Dieser Plan wurde gegen den aktuellen Stand von
> `github.com/thaenertstefan-crypto/aic-app` geprüft (`mood-avatar.tsx`,
> `lib/utils/mood.ts`, `brand-panel.tsx`, `auth-reveal.tsx`,
> `dashboard-focus.tsx`, `overthinking-wizard.tsx`). Trotzdem: vor Ausführung
> jedes Schritts kurz die betroffene Datei nochmal gegenlesen — falls
> zwischenzeitlich etwas geändert wurde.

-----

## Überblick

Der Mascot bleibt visuell exakt das, was er heute im Mood-Checkin schon ist:
ein goldener Glas-Blob mit Gesicht, der atmet und über Augen/Mund/Wangen
Stimmung ausdrückt. Was sich ändert, ist die **Technik dahinter** — er wird
aus seiner Mood-spezifischen Hülle gelöst, damit er an beliebigen Stellen in
unterschiedlicher Größe, mit unterschiedlichem Ausdruck und mit einer
Eingangs-Animation auftreten kann, ohne dass am Dashboard irgendwas anders
aussieht.

Vier Blöcke, die du einzeln freigibst:

1. **Fundament** (`Schritt 1`): `Mascot` als generische Komponente extrahieren,
   `MoodAvatar` wird ein dünner Wrapper drumherum. Null sichtbare Änderung im
   Dashboard — reiner Refactor, mit `npm run build` als Beweis.
2. **Erste Testfläche** (`Schritt 2`): Mascot auf der Auth-Hero (das, was beim
   Kaltstart/Login als Erstes zu sehen ist) und auf der Login-Karte selbst —
   beide Mal mit der "von rechts reinrutschen"-Animation, die du dir
   vorgestellt hast.
3. **Entscheidung** (`Schritt 3`): du schaust dir das in echt an (Mobile +
   Desktop) und sagst, ob's so bleibt, angepasst wird, oder wir's wieder
   rausnehmen.
4. **Overthinking-Begleiter** (`Schritt 4`, zweigeteilt): erst nur Präsenz +
   Ausdruck (risikoarm, rein additiv), dann — nach erneuter Freigabe — die
   Sprechblase, die ihn wirklich "mit dir reden" lässt.

**Verbindlichkeitshinweis zu den Stellen aus deiner Nachricht:** "Login Page"
übersetze ich als die eigentliche Login-Karte (`app/(auth)/login/page.tsx`),
"Herocard beim Kaltstart" als das, was im Code bereits `hero` heißt — das
Vollbild-Brand-Panel, das beim Öffnen der App (ausgeloggt) zuerst erscheint,
bevor man nach oben wischt (`AuthReveal` → `BrandPanel`). Die beiden liegen im
selben Auth-Flow direkt hintereinander, was die Sache angenehm macht: er
rutscht beim Öffnen zuerst in der Hero-Fläche rein, taucht kurz danach (kleiner)
auf der Login-Karte wieder auf. Falls du etwas anderes gemeint hast (z. B.
eher die Dashboard-Begrüßung nach dem Login), sag Bescheid — Schritt 2 lässt
sich leicht umhängen.

**Offene Frage, die hier bewusst NICHT geklärt wird:** der Name. Acht
Kandidaten sind schon durchgefallen — das müssen wir nicht in diesem Schritt
lösen. Falls du magst, sammeln wir das mal in einer eigenen, kleinen Runde,
losgelöst vom Code. Bis dahin heißt die Komponente einfach `Mascot`.

-----

## Schritt 1: `Mascot` als generische Komponente extrahieren 🧩

### Designprinzip

`mood-avatar.tsx` ist aktuell komplett an Mood-Scores gekoppelt (`face` ist
vom Typ `MoodFace`, GAZE_X und Größe sind hart codiert). Wir ziehen die reine
Darstellung (Blob + Aura + Gesicht-SVG) in eine neue, kontextfreie Komponente
`Mascot` und lassen `MoodAvatar` als schmalen Wrapper bestehen — exakt gleiche
API wie heute, also **keine Änderung in `mood-checkin.tsx` nötig**.

Zwei kleine, aber wichtige Erweiterungen gegenüber dem Original:

- **`gazeX` wird ein Prop statt einer festen Konstante.** Damit kann der
  Mascot in Schritt 2 bewusst zur Seite blicken (z. B. zur Headline hin),
  während er im Dashboard exakt wie bisher leicht zur Seite schaut
  (Default bleibt `-1.3`, also pixelgleich zu heute).
- **SVG-IDs (`cheekGlow`, `moodMouthClip`) werden über `useId()` eindeutig.**
  Bisher kommt der Mascot nur einmal pro Seite vor — das ändert sich mit
  diesem Phase. Ohne eindeutige IDs würden zwei gleichzeitig sichtbare
  Mascots (z. B. später mal Hero + Begleiter) sich die Wangen-Gradient/
  Mund-Clip-Definition kaputt teilen. Kleiner, aber notwendiger Fix beim
  Verallgemeinern.

Außerdem zwei neue Ausdrücke für Nicht-Mood-Kontexte: `curious` (offene,
interessierte Augen — für den Hero/Login-Auftritt) und `thinking` (Blick
leicht nach oben/seitlich — für Wartezustände, z. B. während die KI im
Overthinking-Rezept eine Frage formuliert).

### Claude Code Prompt

```
Extrahiere die Mascot-Darstellung aus components/dashboard/mood-avatar.tsx in
eine neue, generische Komponente. Bestehendes Verhalten bleibt 1:1 erhalten —
das ist ein reiner Refactor, keine optische Änderung im Dashboard.

1. Neue Datei components/brand/mascot.tsx:

   "use client";

   import { useId } from "react";

   import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
   import type { MoodFace } from "@/lib/utils/mood";

   export type MascotExpression = MoodFace | "curious" | "thinking";
   export type MascotSize = "sm" | "md" | "lg";

   const BLOB_RADIUS = "58% 42% 55% 45% / 48% 52% 45% 55%";

   type FaceShape = {
     dx: number;
     dy: number;
     mouthD: string;
     mouthWidth: number;
     mouthOpen?: boolean;
     eyesClosed?: boolean;
     cheek: number;
   };

   const FACES: Record<MascotExpression, FaceShape> = {
     sorrowStrong: { dx: 1.3, dy: 2, mouthD: "M22,38.5 Q32,35.5 42,38.5", mouthWidth: 3, cheek: 0 },
     sorrowMild: { dx: 0.6, dy: 1, mouthD: "M24,37.5 Q32,36.5 40,37.5", mouthWidth: 2.6, cheek: 0 },
     smile: { dx: 0, dy: 0, mouthD: "M23,37 Q32,42.5 41,37", mouthWidth: 3, cheek: 0 },
     happy: { dx: 0, dy: 0, mouthD: "M20,36 Q32,47 44,36", mouthWidth: 3.2, eyesClosed: true, cheek: 0.4 },
     radiant: { dx: 0, dy: 0, mouthD: "M18,35 Q32,50 46,35", mouthWidth: 3.5, mouthOpen: true, eyesClosed: true, cheek: 0.55 },
     // Neu — für Kontexte außerhalb des Mood-Checkins:
     curious: { dx: 0, dy: -0.5, mouthD: "M24,37 Q32,40 40,37", mouthWidth: 2.8, cheek: 0.15 },
     thinking: { dx: 1, dy: -2, mouthD: "M25,38 Q32,37.5 39,38", mouthWidth: 2.4, cheek: 0 },
   };

   const SCLERA = "#FBF6EA";
   const EYE_X = 22;
   const MOUTH_DY = 5;

   const SIZE_CLASSES: Record<MascotSize, string> = {
     sm: "size-14",
     md: "size-24",
     lg: "size-32",
   };

   export function Mascot({
     expression,
     pulseSeconds = 3,
     size = "md",
     gazeX = -1.3,
     className,
   }: {
     expression: MascotExpression;
     pulseSeconds?: number;
     size?: MascotSize;
     /** Horizontaler Pupillen-Offset. Negative Werte blicken nach links —
      *  z. B. wenn der Mascot von rechts ins Bild kommt und zur Mitte
      *  schaut. Default entspricht exakt dem bisherigen festen Wert. */
     gazeX?: number;
     className?: string;
   }) {
     const reduced = useReducedMotion();
     const uid = useId();
     const f = FACES[expression];

     return (
       <div className={`relative ${SIZE_CLASSES[size]} ${className ?? ""}`}>
         {/* Aura — 1:1 aus mood-avatar.tsx übernommen */}
         <div
           aria-hidden="true"
           className="absolute"
           style={{
             inset: "-12px",
             background: "var(--primary)",
             borderRadius: BLOB_RADIUS,
             opacity: 0.28,
             filter: "blur(14px)",
             ...(reduced
               ? {}
               : {
                   animationName: "mood-glow",
                   animationDuration: `${pulseSeconds}s`,
                   animationTimingFunction: "ease-in-out",
                   animationIterationCount: "infinite",
                 }),
           }}
         />

         {/* Blob-Körper */}
         <div
           className="absolute inset-0 overflow-hidden"
           style={{
             borderRadius: BLOB_RADIUS,
             background: "rgba(231,182,94,0.10)",
             border: "1px solid rgba(255,255,255,0.22)",
             backdropFilter: "blur(8px)",
             WebkitBackdropFilter: "blur(8px)",
             boxShadow: "0 0 20px 2px rgba(231,182,94,0.16)",
             transition: "all 400ms ease",
             ...(reduced
               ? {}
               : {
                   animationName: "mood-breathe",
                   animationDuration: `${pulseSeconds}s`,
                   animationTimingFunction: "ease-in-out",
                   animationIterationCount: "infinite",
                 }),
           }}
         >
           <svg viewBox="0 0 64 64" aria-hidden="true" className="size-full">
             <defs>
               <radialGradient id={`cheekGlow-${uid}`}>
                 <stop offset="0%" stopColor="var(--celebrate)" stopOpacity={1} />
                 <stop offset="100%" stopColor="var(--celebrate)" stopOpacity={0} />
               </radialGradient>
             </defs>

             <ellipse cx={10} cy={34} rx={7} ry={6} fill={`url(#cheekGlow-${uid})`} opacity={f.cheek} />
             <ellipse cx={54} cy={34} rx={7} ry={6} fill={`url(#cheekGlow-${uid})`} opacity={f.cheek} />

             {f.eyesClosed ? (
               <>
                 <path d={`M${EYE_X - 5.5},28 Q${EYE_X},24 ${EYE_X + 5.5},28`} stroke="var(--primary-foreground)" strokeWidth={2.6} strokeLinecap="round" fill="none" />
                 <path d={`M${64 - EYE_X - 5.5},28 Q${64 - EYE_X},24 ${64 - EYE_X + 5.5},28`} stroke="var(--primary-foreground)" strokeWidth={2.6} strokeLinecap="round" fill="none" />
               </>
             ) : (
               <>
                 <circle cx={EYE_X} cy={27} r={7} fill={SCLERA} />
                 <circle cx={64 - EYE_X} cy={27} r={7} fill={SCLERA} />
                 <circle cx={EYE_X + f.dx + gazeX} cy={27 + f.dy} r={4} fill="var(--primary-foreground)" />
                 <circle cx={64 - EYE_X - f.dx + gazeX} cy={27 + f.dy} r={4} fill="var(--primary-foreground)" />
                 <circle cx={EYE_X + f.dx + gazeX - 1.3} cy={27 + f.dy - 1.3} r={1.3} fill="white" />
                 <circle cx={64 - EYE_X - f.dx + gazeX - 1.3} cy={27 + f.dy - 1.3} r={1.3} fill="white" />
               </>
             )}

             {f.mouthOpen ? (
               <>
                 <defs>
                   <clipPath id={`moodMouthClip-${uid}`}>
                     <path d={f.mouthD} />
                   </clipPath>
                 </defs>
                 <g transform={`translate(0 ${MOUTH_DY})`}>
                   <path d={f.mouthD} fill="var(--primary-foreground)" stroke="var(--primary-foreground)" strokeWidth={2} strokeLinejoin="round" />
                   <ellipse cx={32} cy={41} rx={3.8} ry={2.2} fill="var(--celebrate)" opacity={0.85} clipPath={`url(#moodMouthClip-${uid})`} />
                 </g>
               </>
             ) : (
               <path d={f.mouthD} transform={`translate(0 ${MOUTH_DY})`} stroke="var(--primary-foreground)" strokeWidth={f.mouthWidth} strokeLinecap="round" fill="none" />
             )}
           </svg>
         </div>
       </div>
     );
   }

2. components/dashboard/mood-avatar.tsx komplett ersetzen durch:

   "use client";

   import { Mascot } from "@/components/brand/mascot";
   import type { MoodFace } from "@/lib/utils/mood";

   /** Dünner, mood-spezifischer Wrapper um den generischen Mascot — exakt
    *  gleiche API wie bisher, damit mood-checkin.tsx unverändert bleibt. */
   export function MoodAvatar({
     face,
     pulseSeconds,
   }: {
     face: MoodFace;
     pulseSeconds: number;
   }) {
     return <Mascot expression={face} pulseSeconds={pulseSeconds} size="md" />;
   }

3. app/(app)/dashboard/mood-checkin.tsx NICHT anfassen — Import und Nutzung
   bleiben identisch.

Wichtig: Die `mood-glow` / `mood-breathe` Keyframes existieren bereits
irgendwo (globals.css o. ä.) — nicht duplizieren, nur referenzieren.
```

### Manuell — danach prüfen

1. Dashboard öffnen, Mood-Checkin antippen → Avatar verhält sich exakt wie
   vor dem Refactor (gleiche Größe, gleicher Atem-Rhythmus, gleiche Gesichter)
2. `npm run build && npm run lint` — keine Fehler
3. Kurzer Diff-Check: `mood-avatar.tsx` ist jetzt deutlich kürzer, keine
   Logik verloren

-----

## Schritt 2: Erste Testfläche — Auth-Hero & Login-Karte 🎬

### Designprinzip

Die Einstiegs-Idee aus deiner Nachricht — er "guckt von rechts nach links
rein" — setzen wir als eigene, wiederverwendbare Eingangs-Animation um:
`MascotPeek` lässt den `Mascot` leicht außerhalb seiner Endposition starten
und sanft hineingleiten, mit einem Blick, der zur Mitte/zum Text hin geht.
Bewusst **keine** dauerhaft an der Kante "angeschnittene" Pose für diese
erste Version — er rutscht vollständig sichtbar ins Bild, das ist optisch
einfacher und risikoärmer zu beurteilen. Eine "halb hinter der Kante
versteckt"-Variante können wir später draufsetzen, falls dir das gefällt.

Auf der Auth-Hero (groß, `lg`, Ausdruck `curious`) sitzt er oben rechts im
Brand-Panel, bevor man nach oben wischt — das ist der "Kaltstart"-Moment.
Auf der Login-Karte (klein, `sm`, Ausdruck `smile`) taucht er nochmal auf,
diesmal als "Schön, dass du wieder da bist"-Begrüßung neben dem Titel.

### Claude Code Prompt

```
1. Neue Datei components/brand/mascot-peek.tsx:

   "use client";

   import { useEffect, useRef } from "react";
   import gsap from "gsap";

   import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
   import { Mascot, type MascotExpression, type MascotSize } from "@/components/brand/mascot";
   import { cn } from "@/lib/utils";

   type MascotPeekProps = {
     from?: "left" | "right";
     expression?: MascotExpression;
     size?: MascotSize;
     pulseSeconds?: number;
     gazeX?: number;
     className?: string;
   };

   /**
    * Lässt den Mascot von einer Bildschirmkante sanft ins Bild gleiten —
    * für Einstiegs-Momente wie den Auth-Hero oder die Login-Karte. Blickt
    * standardmäßig in Richtung Bildmitte (abhängig davon, von welcher Seite
    * er kommt), außer ein expliziter gazeX wird übergeben.
    *
    * Respektiert prefers-reduced-motion: erscheint direkt an Endposition,
    * keine Translate-Animation.
    */
   export function MascotPeek({
     from = "right",
     expression = "curious",
     size = "lg",
     pulseSeconds = 3.4,
     gazeX,
     className,
   }: MascotPeekProps) {
     const reduced = useReducedMotion();
     const ref = useRef<HTMLDivElement>(null);
     const resolvedGazeX = gazeX ?? (from === "right" ? -3.5 : 3.5);

     useEffect(() => {
       const el = ref.current;
       if (!el) return;

       if (reduced) {
         gsap.set(el, { x: 0, opacity: 1 });
         return;
       }

       const startX = from === "right" ? 90 : -90;
       const tween = gsap.fromTo(
         el,
         { x: startX, opacity: 0 },
         { x: 0, opacity: 1, duration: 1, ease: "power3.out", delay: 0.3 },
       );

       return () => tween.kill();
     }, [reduced, from]);

     return (
       <div ref={ref} className={cn("inline-block", className)}>
         <Mascot expression={expression} pulseSeconds={pulseSeconds} size={size} gazeX={resolvedGazeX} />
       </div>
     );
   }

2. components/auth/brand-panel.tsx: Mascot oben in der Hero-Fläche ergänzen,
   rechtsbündig über der Headline. Betrifft sowohl /login als auch /signup,
   weil beide dasselbe AuthLayout/BrandPanel teilen.

   Import ergänzen:
     import { MascotPeek } from "@/components/brand/mascot-peek";

   Im äußeren <div className="flex flex-col gap-6 p-8 sm:p-10"> direkt VOR
   dem <h1>:

     <MascotPeek from="right" size="lg" className="self-end" />

3. app/(auth)/login/page.tsx: kleine Variante neben dem Kartentitel.

   Import ergänzen:
     import { MascotPeek } from "@/components/brand/mascot-peek";

   CardHeader von:
     <CardHeader>
       <CardTitle>Zurück in den Club</CardTitle>
       <CardDescription>...</CardDescription>
     </CardHeader>

   zu:
     <CardHeader>
       <div className="flex justify-end">
         <MascotPeek from="right" size="sm" expression="smile" pulseSeconds={3} />
       </div>
       <CardTitle>Zurück in den Club</CardTitle>
       <CardDescription>...</CardDescription>
     </CardHeader>

   signup/page.tsx bewusst NICHT anfassen — erst nach Freigabe in Schritt 3
   spiegeln, falls gewünscht.
```

### Manuell — danach prüfen

1. Ausgeloggt `/login` frisch öffnen (privates Fenster oder Logout) → Hero
   zeigt Mascot oben rechts, der von rechts reingleitet, sobald die Seite
   lädt
2. Nach oben wischen/Pfeil tippen → Login-Karte erscheint, kleiner Mascot
   neben dem Titel gleitet ebenfalls ein
3. `/signup` öffnen → Hero-Mascot erscheint dort ebenfalls (geteiltes
   Layout), Signup-Karte selbst zeigt noch keinen (erwartet, siehe oben)
4. Mobile-Ansicht prüfen: Mascot überlappt nicht mit Logo/Headline/Pfeil,
   bleibt gut lesbar
5. System-Einstellung "Bewegung reduzieren" aktivieren → Mascot erscheint
   sofort an Endposition, keine Gleit-Animation
6. `npm run build && npm run lint`

-----

## Schritt 3: Entscheiden ✋

Schau dir Schritt 1+2 ein paar Tage in echter Nutzung an (Mobile **und**
Desktop, weil die Hero-Fläche auf großen Screens anders wirkt als auf dem
Handy). Drei Wege von hier:

- **Gefällt mir, weiter so** → Schritt 4 angehen.
- **Gefällt mir, aber XY anpassen** (Größe, Position, Tempo, welcher
  Ausdruck) → kleine Korrektur, dann nochmal anschauen.
- **Überzeugt mich nicht** → Schritt 2 zurückrollen (`git revert` der
  entsprechenden Commits), Schritt 1 (das Fundament) bleibt trotzdem
  sinnvoll liegen, falls du es später woanders brauchst.

-----

## Schritt 4a: Overthinking-Begleiter — Präsenz & Ausdruck 🧘

> Nur weitermachen, wenn Schritt 3 mit "weiter so" oder "angepasst, aber
> weiter so" entschieden wurde.

### Designprinzip

Der Overthinking-Wizard hat heute schon eine Coach-Stimme, nur noch ohne
Gesicht: die KI-generierten "Warum?"-Fragen (Schritte 3–5), die fixe
Challenger-Einleitung in Schritt 6 ("Ich möchte dich gerne challengen …"),
und die Lade-Schimmer während die KI nachdenkt. Schritt 4a gibt dieser
Stimme ein Gesicht, **ohne** an Texten, Antworten oder der State-Logik
irgendwas zu verändern — rein additiv, damit du ihn isoliert beurteilen
kannst, bevor wir an den eigentlichen Text rangehen (das kommt erst in 4b).

Ausdruck je Moment:

- Schritt 1 (Stop/Countdown) & Schritte 2–5 im Normalzustand → `smile`
- Während die KI eine Frage formuliert (`questionLoading` ohne fertige
  Frage, Schritte 3–6) → `thinking`
- Schritt 6 (Challenger) & Schritt 7 (Reframing), sobald die Frage da ist
  → `happy`
- Completion-Screen ("Geschafft.") → `radiant`, passend zur bestehenden
  `CompletionCelebration`

### Claude Code Prompt

```
1. Neue Datei components/recipes/overthinking-companion.tsx:

   import { Mascot, type MascotExpression } from "@/components/brand/mascot";

   /** Reine Präsenz-Komponente — noch ohne Sprechblasen-Text (kommt in
    *  Phase 9, Schritt 4b). */
   export function OverthinkingCompanion({
     expression,
   }: {
     expression: MascotExpression;
   }) {
     return (
       <div className="flex justify-center pb-1">
         <Mascot expression={expression} size="sm" pulseSeconds={3} />
       </div>
     );
   }

2. app/(app)/recipes/overthinking/overthinking-wizard.tsx: Begleiter
   einblenden, OHNE renderStepContent(), Labels oder State-Logik zu
   verändern.

   Import ergänzen:
     import { OverthinkingCompanion } from "@/components/recipes/overthinking-companion";
     import type { MascotExpression } from "@/components/brand/mascot";

   Kleine Ableitungs-Funktion ergänzen (z. B. direkt vor renderStepContent):

     function getCompanionExpression(): MascotExpression {
       const stillThinking =
         questionLoading &&
         step >= 3 &&
         step <= 6 &&
         !generatedQuestions[step];
       if (stillThinking) return "thinking";
       if (step === 6 || step === 7) return "happy";
       return "smile";
     }

   Im JSX direkt VOR { renderStepContent() } (also vor dem
   `<div key={step} className="mt-8 ...">`-Block, nicht darin):

     <OverthinkingCompanion expression={getCompanionExpression()} />

3. Im Completion-Screen (innerhalb von `if (saved) { ... }`), direkt VOR
   <CompletionCelebration />:

     <OverthinkingCompanion expression="radiant" />

Sonst nichts ändern — Schritt 4a ist bewusst additiv.
```

### Manuell — danach prüfen

1. Overthinking komplett durchklicken → Begleiter ist auf jedem Schritt
   sichtbar, wechselt während des KI-Ladens (Schritte 3–6) kurz zu
   "thinking", danach wieder zurück
2. Schritt 6 erreichen, während die Challenger-Frage lädt → "thinking",
   danach "happy"
3. Bis zum Ende durchklicken → Completion-Screen zeigt "radiant"-Begleiter
   über der bestehenden Celebration
4. Bestehender Text, Ladder, Textareas, Validierung — alles unverändert
5. `npm run build && npm run lint`

-----

## Schritt 4b: Overthinking-Begleiter — Sprechblase 💬

> Erst angehen, nachdem 4a sich in echter Nutzung gut angefühlt hat. Das ist
> der Teil, der ihn wirklich zum Gesprächspartner macht — und der am meisten
> von deinem Feingefühl für Ton profitiert. Deshalb hier bewusst als Konzept
> statt als fertig gesperrter Prompt.

Die Idee: die Frage wandert aus dem `<Label>` in eine Sprechblase neben dem
Begleiter — er fragt dich quasi wörtlich, statt dass die Frage über dem
Textfeld "schwebt". Betrifft Schritte 2–6, weil dort ohnehin schon eine
Frage/Coach-Stimme existiert (Schritt 3-5: die Warum-Leiter; Schritt 6: der
Challenger). Schritte 7+8 bleiben unverändert als normale Formularfelder —
die sind eher Anweisung als Dialog. Schritt 6 braucht dabei am wenigsten:
`CHALLENGE_INTRO` liest sich heute schon wie eine direkte Ich-Aussage des
Coaches und lässt sich fast 1:1 in die Bubble übernehmen.

Drei Dinge, die wir vor der Umsetzung gemeinsam klären sollten:

- Verschwindet das `<Label>` dann ganz, oder bleibt es als `sr-only` für
  Screenreader bestehen (htmlFor-Verknüpfung zur Textarea bleibt ja
  trotzdem nötig)? Ich würde zu Letzterem raten.
- Sollen die Bubble-Texte wärmer/persönlicher umformuliert werden ("Ich
  frag mich gerade …" statt der reinen Frage), oder reicht die 1:1-Übernahme
  der bestehenden Labels/KI-Fragen?
- Reagiert der Begleiter auf Eingaben (z. B. ein kurzes Nicken nach dem
  Abschicken einer Antwort), oder bleibt er während des Tippens einfach
  ruhig stehen? Mehr Bewegung = mehr Charme, aber auch mehr potenzielle
  Ablenkung vom eigentlichen Schreiben — bei einem Rezept, das gerade
  Ruhe vermitteln soll, würde ich eher zur zurückhaltenden Variante raten.

Sobald das geklärt ist, bauen wir daraus den finalen Claude Code Prompt —
analog zu 4a, aber mit Textinhalt statt nur Ausdruck.

-----

## Später (bewusst nicht in diesem Update)

- Signup-Karte spiegeln (wie Login), falls Schritt 2 dir gefällt
- Eine echte "halb hinter der Kante versteckt"-Peek-Pose als Alternative
  zur aktuellen voll-sichtbaren Gleit-Animation
- Weitere Rollout-Kandidaten, sobald Overthinking sich bewährt hat: die
  Rezepte-Übersicht (`/recipes`), Empty-States (z. B. "noch kein Bill of
  Rights"), die Cleanser-Übersicht, der Onboarding-Flow
- Ein eigener `MascotExpression`-Wert für den Challenger-Moment in Schritt 6
  (z. B. ein schiefes Grinsen statt der Wiederverwendung von `happy`) — erst
  sinnvoll, wenn der Begleiter sich insgesamt bewährt hat
- Die Namensfrage für den Mascot

-----

## Checkliste Phase 9

- [ ] Schritt 1: `Mascot` extrahiert, `MoodAvatar` ist dünner Wrapper, Dashboard
      optisch unverändert, Build grün
- [ ] Schritt 2: Auth-Hero + Login-Karte zeigen den einrutschenden Mascot,
      Mobile + Desktop geprüft, reduced-motion geprüft
- [ ] Schritt 3: Entscheidung getroffen (weiter / anpassen / zurückrollen)
- [ ] Schritt 4a: Begleiter im Overthinking-Wizard sichtbar, Ausdruck wechselt
      korrekt mit Lade-/Schritt-Zustand, bestehende Logik unverändert
- [ ] Schritt 4b: gemeinsam Ton/Scope geklärt, Sprechblase umgesetzt

→ Danach: gemeinsam entscheiden, welcher der "Später"-Kandidaten als Nächstes
dran ist.
