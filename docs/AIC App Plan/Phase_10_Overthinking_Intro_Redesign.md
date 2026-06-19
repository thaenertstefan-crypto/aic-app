# Phase 8 – Overthinking-Intro Redesign

> Ziel: Die 3-Karten-Einleitungssequenz des Overthinking-Rezepts aufwerten.
> Fortschrittspunkte wandern unter die Karte, Zurück-Navigation kommt dazu,
> und jede Karte bekommt ein eigenes animiertes Maskottchen: Spiralaugen
> (Karte 1), frecher Maler im Kopfkino (Karte 2), Breathing-Animation (Karte 3).
>
> Voraussetzung: Phasen 0–7 abgeschlossen.
>
> Arbeitsweise: Vier sequenzielle Schritte, je ein Commit + `npm run build`-Gate.

---

## Schritt 8.1 – `app/globals.css`: Neue Keyframes

> Die drei Maskottchen-Animationen brauchen eigene CSS-Keyframes.
> Die Breathing-Animation für Karte 3 ist bereits vorhanden (`mascot-exhale-dip`,
> `mascot-face-rest`, `mascot-face-exhale`) — für sie sind keine neuen Keyframes nötig.

### Claude Code Prompt

```
In app/globals.css, direkt nach dem @keyframes mascot-exhale-dip-Block (nach der
schließenden Klammer von mascot-exhale-dip, vor dem Kommentar "4-7-8 breathing cycle"),
füge folgende Keyframes ein:

  /* ── Overthinking-Intro Animationen (Phase 8) ─────────────────────── */

  /* Karte 1: sanftes Schwanken des überwältigten Kopfes */
  @keyframes ot-sway {
    0%, 100% { transform: rotate(-1.4deg); }
    35%       { transform: rotate(1.1deg);  }
    70%       { transform: rotate(-0.5deg); }
  }

  /* Karte 1: Spiralauge – linkes Auge im Uhrzeigersinn */
  @keyframes spin-cw {
    to { transform: rotate(360deg); }
  }

  /* Karte 1: Spiralauge – rechtes Auge gegen den Uhrzeigersinn */
  @keyframes spin-ccw {
    to { transform: rotate(-360deg); }
  }

  /* Karte 2: Kleiner Maler bobbt auf und ab */
  @keyframes painter-bob {
    0%, 100% { transform: translateY(0);      }
    50%       { transform: translateY(-2.5px); }
  }

  /* Karte 2: Pinselarm schwingt hin und her */
  @keyframes paint-arm {
    0%, 100% { transform: rotate(-12deg); }
    50%       { transform: rotate(10deg);  }
  }

  /* Karte 2: Erste Horror-Linie erscheint auf der Leinwand */
  @keyframes scribble-a {
    0%, 100% { stroke-dashoffset: 26; opacity: 0.2; }
    55%       { stroke-dashoffset: 0;  opacity: 1;   }
  }

  /* Karte 2: Zweite Horror-Linie erscheint versetzt */
  @keyframes scribble-b {
    0%, 100% { stroke-dashoffset: 18; opacity: 0.15; }
    60%       { stroke-dashoffset: 0;  opacity: 0.85; }
  }

Keine weiteren Änderungen an globals.css. Keine bestehenden Keyframes anfassen.
```

### Manuell — danach prüfen

1. `npm run build` → muss fehlerfrei durchlaufen
2. Keine visuellen Regressions (die neuen Keyframes sind noch an nichts gebunden)

---

## Schritt 8.2 – `components/recipes/recipe-intro.tsx`: Dots unten, Zurück-Button, Mascot-Slot

> Drei Änderungen in einer Datei:
> (1) `ProgressDots` wandert von oberhalb der Karte nach unterhalb,
> (2) ein Zurück-Button kommt neben den Weiter-Button,
> (3) ein optionaler `renderMascot`-Prop rendert zentriert über der Karte.

### Claude Code Prompt

```
Ändere components/recipes/recipe-intro.tsx wie folgt. Die ProgressDots-Komponente
selbst bleibt unverändert — nur das Layout und die Props der RecipeIntro-Funktion
werden angepasst.

1. IMPORTS: ChevronLeft zu den Lucide-Imports ergänzen:
   import { ChevronLeft, ChevronRight } from "lucide-react";

2. PROPS: RecipeIntroProps um einen optionalen renderMascot-Slot erweitern:
   type RecipeIntroProps = {
     cards: IntroCard[];
     onComplete: () => void;
     onSkip?: () => void;
     renderMascot?: (index: number) => React.ReactNode;
   };

3. LOGIK: Direkt nach dem bestehenden goNext-Block eine goBack-Funktion ergänzen:
   const goBack = () => setIndex((i) => Math.max(0, i - 1));

4. LAYOUT: Das Return-Statement vollständig ersetzen durch:

   return (
     <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">

       {/* Mascot-Slot — nur wenn prop vorhanden */}
       {renderMascot && (
         <div className="flex justify-center">
           {renderMascot(index)}
         </div>
       )}

       {/* Karte */}
       <Card
         key={index}
         className="border-primary/30 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out"
       >
         <CardContent className="flex flex-col gap-3 pt-(--card-spacing)">
           <h2 className="font-heading text-xl font-semibold text-foreground">
             {card.title}
           </h2>
           <p className="text-base leading-relaxed text-muted-foreground">
             {card.body}
           </p>
         </CardContent>
       </Card>

       {/* Fortschrittspunkte — jetzt UNTER der Karte */}
       <ProgressDots total={cards.length} current={index} />

       {/* Navigation: Zurück + Weiter nebeneinander */}
       <div className="flex items-center gap-3">
         <Button
           variant="secondary"
           size="icon"
           onClick={goBack}
           disabled={index === 0}
           aria-label="Zurück"
         >
           <ChevronLeft className="size-4" />
         </Button>

         <Button size="lg" className="flex-1 gap-1" onClick={goNext}>
           {isLast ? "Los geht's" : "Weiter"}
           <ChevronRight className="size-4" />
         </Button>
       </div>

       {/* Überspringen-Link (optional) */}
       {onSkip && (
         <Button
           variant="link"
           size="sm"
           onClick={onSkip}
           className="self-center text-muted-foreground"
         >
           Überspringen
         </Button>
       )}
     </div>
   );

Alle bestehenden Aufrufer von RecipeIntro übergeben kein renderMascot → keine
breaking change. Die ProgressDots-Unterkomponente bleibt byte-für-byte unverändert.
```

### Manuell — danach prüfen

1. `npm run build` → fehlerfrei
2. Overthinking-Rezept öffnen (erster Besuch / intro_seen auf false setzen) →
   Fortschrittspunkte erscheinen jetzt UNTER der Karte
3. Auf Karte 2 oder 3: Zurück-Button bringt zur vorherigen Karte
4. Auf Karte 1: Zurück-Button ist disabled (kein Klick möglich)
5. Values- und Bill-of-Rights-Intros (falls intro_seen zurückgesetzt): Layout
   funktioniert weiterhin — kein Mascot-Bereich, kein Fehler

---

## Schritt 8.3 – Neue Datei `components/recipes/overthinking-intro-mascot.tsx`

> Drei kartenspezifische Maskottchen als eine Komponente:
> - Karte 0: Spiralaugen + ot-sway (custom SVG, eigene Animationen)
> - Karte 1: Frecher Maler im Mind-Portal (custom SVG, eigene Animationen)
> - Karte 2: Breathing-Mascot — nutzt die bestehende `<Mascot>`-Komponente
>   mit `breathing={true}` und `pulseSeconds={11.5}`, exakt wie im Wizard
>
> prefers-reduced-motion wird für alle drei Varianten respektiert.

### Claude Code Prompt

```
Erstelle die neue Datei components/recipes/overthinking-intro-mascot.tsx
mit folgendem Inhalt (exakt so übernehmen):

"use client";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { Mascot } from "@/components/brand/mascot";

// ─── Karte 0: Spiralaugen + ot-sway ──────────────────────────────────
// Linkes Auge spin-cw 2s, rechtes spin-ccw 2.5s (Desync = Hypno-Effekt).
// Blob schwankt sanft (ot-sway 2.8s). Halb-offener Mund.
// Reduced-motion: statisches Gesicht ohne Rotation.

function Card0Mascot({ reduced }: { reduced: boolean }) {
  if (reduced) {
    return (
      <svg
        viewBox="0 0 100 100"
        width="88"
        height="88"
        aria-hidden="true"
        style={{ display: "block", overflow: "visible" }}
      >
        <ellipse cx="50" cy="58" rx="42" ry="38" fill="#E7B65E" />
        <circle cx="32" cy="42" r="10.5" fill="#FBF6EA" />
        <circle cx="32" cy="42" r="4" fill="#2B1B06" />
        <circle cx="68" cy="42" r="10.5" fill="#FBF6EA" />
        <circle cx="68" cy="42" r="4" fill="#2B1B06" />
        <path
          d="M26,62 Q32,59 38,62"
          fill="none"
          stroke="#2B1B06"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <ellipse cx="32" cy="66" rx="7" ry="3.5" fill="#2B1B06" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      width="88"
      height="88"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <g
        style={{
          transformBox: "fill-box",
          transformOrigin: "center",
          animation: "ot-sway 2.8s ease-in-out infinite",
        }}
      >
        <ellipse cx="50" cy="58" rx="42" ry="38" fill="#E7B65E" />

        {/* Linkes Auge: weißer Hintergrund + spin-cw Ringe */}
        <circle cx="32" cy="42" r="10.5" fill="#FBF6EA" />
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: "spin-cw 2s linear infinite",
          }}
        >
          <circle cx="32" cy="42" r="2.5" fill="#2B1B06" />
          <circle cx="32" cy="42" r="5.5" fill="none" stroke="#2B1B06" strokeWidth="2" strokeDasharray="9 3" />
          <circle cx="32" cy="42" r="9"   fill="none" stroke="#2B1B06" strokeWidth="1.5" strokeDasharray="19 5" />
        </g>

        {/* Rechtes Auge: weißer Hintergrund + spin-ccw Ringe */}
        <circle cx="68" cy="42" r="10.5" fill="#FBF6EA" />
        <g
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: "spin-ccw 2.5s linear infinite",
          }}
        >
          <circle cx="68" cy="42" r="2.5" fill="#2B1B06" />
          <circle cx="68" cy="42" r="5.5" fill="none" stroke="#2B1B06" strokeWidth="2" strokeDasharray="9 3" />
          <circle cx="68" cy="42" r="9"   fill="none" stroke="#2B1B06" strokeWidth="1.5" strokeDasharray="19 5" />
        </g>

        {/* Halb-offener Mund */}
        <path
          d="M26,62 Q32,59 38,62"
          fill="none"
          stroke="#2B1B06"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <ellipse cx="32" cy="66" rx="7" ry="3.5" fill="#2B1B06" />
      </g>
    </svg>
  );
}

// ─── Karte 1: Frecher Maler im Kopfkino ──────────────────────────────
// Das Unterbewusstsein als kleine lila Version des Mascots (Shadow-Self),
// der Horror-Szenarien auf eine Leinwand malt.
// Thought-Bubble-Punkte zeigen: das passiert im Kopf.
// Pinselarm pivotiert am Schultergelenk: transform-origin 0% 100%
// (= untere-linke Ecke des Arm-Bounding-Box = Schulter bei SVG (41,45)).
// Reduced-motion: statischer Maler, keine Bewegung.

function Card1Mascot({ reduced }: { reduced: boolean }) {
  const painterStyle: React.CSSProperties = reduced
    ? {}
    : {
        transformBox: "fill-box",
        transformOrigin: "center",
        animation: "painter-bob 2s ease-in-out infinite",
      };

  const armStyle: React.CSSProperties = reduced
    ? {}
    : {
        transformBox: "fill-box",
        transformOrigin: "0% 100%",
        animation: "paint-arm 1.1s ease-in-out infinite",
      };

  const scribbleAStyle: React.CSSProperties = reduced
    ? {}
    : { animation: "scribble-a 2.2s ease-in-out infinite" };

  const scribbleBStyle: React.CSSProperties = reduced
    ? {}
    : { animation: "scribble-b 2.2s ease-in-out 0.55s infinite" };

  return (
    <svg
      viewBox="0 0 100 100"
      width="88"
      height="88"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Haupt-Blob */}
      <ellipse cx="50" cy="58" rx="42" ry="38" fill="#E7B65E" />

      {/* Thought-Bubble-Punkte über dem Kopf */}
      <circle cx="33" cy="22" r="1.8" fill="#3D2A6E" opacity="0.75" />
      <circle cx="27" cy="14" r="2.8" fill="#3D2A6E" opacity="0.85" />

      {/* Mind-Portal: dunkles Oval im Stirnbereich */}
      <ellipse cx="50" cy="44" rx="30" ry="20" fill="#140B2E" />
      <ellipse
        cx="50" cy="44" rx="30" ry="20"
        fill="none"
        stroke="#E7B65E"
        strokeWidth="0.8"
        opacity="0.28"
        strokeDasharray="4 3"
      />

      {/* Kleiner Maler (bobbt auf/ab) */}
      <g style={painterStyle}>
        {/* Shadow-Self: kleiner lila Blob */}
        <ellipse cx="34" cy="47" rx="9" ry="8" fill="#4A2B8A" />
        {/* Maler-Gesicht: weiße Augen + freche Smirk */}
        <circle cx="31" cy="45" r="1.2" fill="#FBF6EA" />
        <circle cx="37" cy="45" r="1.2" fill="#FBF6EA" />
        <path
          d="M31,49.5 Q34,52 37,49.5"
          fill="none"
          stroke="#FBF6EA"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* Pinselarm: pivot am Schultergelenk (41,45) */}
        <g style={armStyle}>
          <line x1="41" y1="45" x2="54" y2="41" stroke="#4A2B8A" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="54" y1="41" x2="57" y2="38" stroke="#6B4C1A" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="58" cy="37" r="2.2" fill="var(--celebrate)" />
        </g>
      </g>

      {/* Leinwand (statisch) */}
      <rect
        x="57" y="30" width="19" height="16" rx="1.5"
        fill="#FBF6EA"
        stroke="#C4B5A5"
        strokeWidth="0.6"
      />

      {/* Horror-Scribbles: via stroke-dashoffset animiert */}
      <path
        d="M59,36 Q62.5,33 66,36 Q69.5,39 72,36"
        fill="none"
        stroke="var(--destructive)"
        strokeWidth="1.1"
        strokeDasharray="26"
        style={scribbleAStyle}
      />
      <path
        d="M59,41.5 Q63,38.5 69,41.5"
        fill="none"
        stroke="var(--destructive)"
        strokeWidth="1.1"
        strokeDasharray="18"
        style={scribbleBStyle}
      />
    </svg>
  );
}

// ─── Karte 2: Breathing ───────────────────────────────────────────────
// Nutzt die bestehende <Mascot>-Komponente mit breathing={true} —
// dieselbe Animation und denselben Timing wie im Overthinking-Wizard
// ab Schritt 6 (mascot-exhale-dip / mascot-face-rest / mascot-face-exhale).

function Card2Mascot() {
  return (
    <Mascot
      expression="smile"
      breathing={true}
      size="md"
      pulseSeconds={11.5}
    />
  );
}

// ─── Öffentliche Komponente ───────────────────────────────────────────

/**
 * Rendert den zum jeweiligen Intro-Karten-Index passenden animierten
 * Mascot für das Overthinking-Rezept.
 * Wird als renderMascot-Prop an <RecipeIntro> übergeben.
 */
export function OverthinkingIntroMascot({ index }: { index: number }) {
  const reduced = useReducedMotion();

  if (index === 0) return <Card0Mascot reduced={reduced} />;
  if (index === 1) return <Card1Mascot reduced={reduced} />;
  return <Card2Mascot />;
}
```

### Manuell — danach prüfen

1. `npm run build` → fehlerfrei (Komponente ist noch nicht eingebunden,
   aber muss fehlerfrei kompilieren)
2. TypeScript-Fehler? → Keiner erwartet; alle Props sind getypt

---

## Schritt 8.4 – `overthinking-wizard.tsx`: Mascot eindrehen

> Zwei Zeilen: Import + renderMascot-Prop. Die restliche Logik des Wizards
> bleibt vollständig unverändert.

### Claude Code Prompt

```
In app/(app)/recipes/overthinking/overthinking-wizard.tsx zwei Änderungen:

1. IMPORT: OverthinkingIntroMascot importieren — direkt unter den anderen
   Rezept-spezifischen Imports (nach dem OverthinkingCompanion-Import):

   import { OverthinkingIntroMascot } from "@/components/recipes/overthinking-intro-mascot";

2. PROP: Im bestehenden Render-Block der Intro-Sequenz (der Block, der prüft
   "if (!introSeen && !introDismissed && INTRO_CARDS.length > 0)"), beim
   <RecipeIntro>-Element den renderMascot-Prop ergänzen:

   <RecipeIntro
     cards={INTRO_CARDS}
     onComplete={handleIntroSeen}
     onSkip={handleIntroSeen}
     renderMascot={(index) => <OverthinkingIntroMascot index={index} />}
   />

Keine weiteren Änderungen. Weder die Intro-Card-Texte in recipe-intros.ts
noch der Rest des Wizard-Renders wird angefasst.
```

### Manuell — danach prüfen

1. `npm run build` → fehlerfrei
2. In Supabase: für den Test-User `intro_seen` für "overthinking" auf `false`
   setzen (oder einen neuen Test-User nutzen)
3. Overthinking-Rezept öffnen → Intro-Sequenz erscheint
4. Karte 1 prüfen: Mascot mit Spiralaugen erscheint oberhalb der Karte,
   Augen drehen sich (CW/CCW), Kopf schwankt sanft
5. Weiter → Karte 2: Maler-Mascot mit Mind-Portal, Pinselarm schwingt,
   Scribbles erscheinen/verschwinden auf der Leinwand
6. Weiter → Karte 3: Breathing-Mascot (sanftes Pulsieren + Gesichtswechsel)
7. Zurück-Button bringt von Karte 2 → 1 und von Karte 3 → 2
8. Auf Karte 1: Zurück-Button disabled
9. Fortschrittspunkte sind auf allen drei Karten UNTER der Karte
10. `prefers-reduced-motion` in DevTools aktivieren → Karten 1+2 zeigen
    statische Gesichter, Karte 3 zeigt Mascot ohne Atemanimation
11. Nicht-Overthinking-Intros (Values, Bill of Rights) unverändert: kein
    Mascot, keine Layout-Regression

