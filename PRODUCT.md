# Product

## Register

product

## Users

Menschen, die sich trotz sichtbarer Erfolge nicht „gut genug" fühlen — Selbstzweifel, Imposter-Gefühle, innerer Kritiker. Sie kommen meist in verletzlichen, emotional aufgeladenen Momenten (vor einer Herausforderung, nach einem „messy" Moment, beim abendlichen Grübeln) und oft am Handy. Sie suchen keinen Kurs und keine Theorie, sondern einen konkreten nächsten Schritt und das Gefühl, damit nicht allein zu sein.

**Job to be done:** „Hilf mir, gerade jetzt einen kleinen, machbaren Schritt zu gehen, der mein Selbstvertrauen stärkt — ohne mich zu überfordern oder zu beschämen."

## Product Purpose

Anti Imposter Club verwandelt die Übungen des Anti-Imposter-Workbooks in interaktive, geführte Module: **Rezepte** (mehrstufige Kern-Übungen wie Werteentdeckung, Bill of Rights, Was-du-wirklich-willst), **Kopfwetter** (kurze Akut-Hilfen wie Confidence-Boost, Overthinking-Stopper, Nein-Trainer, Schattenseite) und ein **Journal**. Ein Dashboard bündelt Wetterbericht (Stimmungs-Check-in) und einen stimmungsbasierten „heutigen Fokus".

Erzählerisch hält die Bildwelt „Dein Nachthimmel“ alles zusammen: Werte = Kompass, Wants = Sterne, innere Regeln = Navigationsregeln — und schwere Momente sind Kopfwetter, das vorbeizieht, ohne den Himmel zu ändern (Details: `docs/superpowers/specs/2026-07-17-bildsprache-nachthimmel-design.md`).

Erfolg heißt: Nutzer:innen greifen im richtigen Moment zur App, schließen einen kleinen Schritt ab und gehen etwas gestärkter (nicht abgehakt-erledigt) heraus — und kommen wieder, weil es sich gut angefühlt hat, nicht weil eine Streak sie drängt.

## Brand Personality

**Warm · ermutigend · nahbar.** Ein Begleiter auf Augenhöhe, kein Coach von oben herab. Die Stimme spricht durchgehend informelles „du", warm und ermutigend (siehe CLAUDE.md). Getragen wird die Persönlichkeit vom prozeduralen Maskottchen (ein SVG/CSS-Blob, siehe `components/brand/mascot.tsx`), von sanfter, „atmender" Motion und von einem geerdeten Aubergine-Dunkeltheme mit warmem Gold-Akzent.

Emotionale Ziele: **Sicherheit** (ein geschützter Raum), **Ermutigung** (kleine Schritte werden gefeiert), **Erleichterung** (Druck fällt ab, statt sich aufzubauen).

## Anti-references

Explizit NICHT so aussehen/anfühlen:

- **Hustle-/Productivity-Coach:** kein Leistungsdruck, keine „No excuses"-Motivation, Streaks nie als Peitsche.
- **Klinische Health-/Therapie-App:** nicht kühl-medizinisch, nicht formularlastig, kein kaltes Praxis-Blau.
- **Generisches SaaS-Dashboard:** keine austauschbaren Karten-Grids, keine Hero-Metric-Kacheln, keine seelenlose Corporate-Neutralität.
- **Kitschige Wellness-Esoterik:** nicht übersüß, keine leeren Achtsamkeits-Floskeln, keine Pastell-Beliebigkeit.

## Design Principles

1. **Begleiter, nicht Coach.** Auf Augenhöhe, einladend statt anweisend. Die App nimmt an die Hand, sie treibt nicht an.
2. **Übung wird Erlebnis.** Workbook-Aufgaben werden zu geführten, interaktiven Momenten mit Charakter — nie zu einem trockenen Formular.
3. **Wärme trägt, sie dekoriert nicht.** Persönlichkeit (Maskottchen, Ton, Motion) schafft Sicherheit und Vertrauen; sie ist funktional, kein Zierrat und kein Kitsch.
4. **Fortschritt ohne Scham.** Motivation ist sanft und gegenwärtig; Streaks, Progress und Erinnerungen ermutigen, statt Druck oder Schuld zu erzeugen.
5. **Trotz Wärme ein Werkzeug.** Jeder Screen hat eine klare, machbare Handlung. Im emotional aufgeladenen Moment gewinnt Klarheit — ein Ziel pro Screen, keine kognitive Überladung.

## Accessibility & Inclusion

- **Ziel: WCAG 2.1 AA.** Body-Text ≥ 4.5:1 Kontrast, große/fette Schrift ≥ 3:1, auch für Placeholder. Auf dem dunklen Aubergine-Grund gilt besondere Vorsicht bei `muted-foreground`-Text.
- **Sichtbarer Fokus** auf allen interaktiven Elementen (Tastatur-Navigation), konsistente State-Vokabeln (hover/focus/active/disabled/selected/loading/error).
- **`prefers-reduced-motion: reduce` ist Pflicht.** Die „atmende" Marken-Motion (Maskottchen, Puls, Reveals) braucht überall einen ruhigen Fallback (Crossfade oder sofort), ohne dass Inhalt verschwindet.
- **Mobile-first**, Ziel-Viewport ~375px; ausreichend große Touch-Ziele; sichere Bereiche (Notch/Safe-Area) berücksichtigt.
- Zielgruppe in verletzlichen Momenten: Sprache und Fehlermeldungen bleiben entlastend, nie beschämend.
