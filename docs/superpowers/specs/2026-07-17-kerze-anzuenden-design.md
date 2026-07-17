# Spec: „Die Kerze anzünden" — 5 Design-Maßnahmen + Checkpoint

**Datum:** 2026-07-17
**Status:** Design freigegeben (Brainstorming-Session mit Stefan)
**Herkunft:** Design-Review-Session (extern, 15.07.) + eigenes Verifikations-Review (17.07.). Alle quantitativen Befunde wurden am Code nachgemessen.

## Problem

Die App wirkt beim Öffnen „underwhelming und flach". Messbar belegte Ursachen:

1. **Flächenkontrast Card vs. Background = 1,07:1** (`#221C30` vs. `#1B1726`) — unter der Wahrnehmungsschwelle; Trennung trägt allein die 10%-Hairline.
2. **Der Primary-CTA glimmt nur:** `bg-primary/15` ergibt effektiv `#3a2f2e` (1,36:1 gegen den Grund); nur der 55%-Gold-Rand (3,69:1) definiert ihn. Im Tageslicht/Sonnenlicht stirbt genau diese Nuance. Zudem widersprechen sich DESIGN.md-Frontmatter (solid `candle-gold`) und Code (15%-Alpha) bereits heute.
3. **Flache Einfarb-Fläche** ohne Materialität („digital-flach").
4. **Monochromer Erst-Eindruck:** Rosé/Sage/Lilac existieren, leben aber fast nur tief in den Flows.

Das Restraint-System (One-Candle-Rule, Glass-Is-Rare, Hairline-Elevation) ist richtig und bleibt unangetastet — es fehlt der laute Gegenpol, der Restraint als „ruhig" statt „leer" lesen lässt.

## Ziel

Der erste Eindruck (Dashboard, Hubs) wirkt warm, tief und lebendig; der eine Gold-CTA ist der hellste Moment jedes Screens; das Dunkeltheme bleibt auch bei niedriger Display-Helligkeit und draußen lesbar. Keine neue Designsprache — die bestehende („Candlelight in a Quiet Room") wird schärfer belichtet.

## Entscheidungen (aus dem Brainstorming)

- **Ansatz „System-Fix":** Die `default`-Button-Variante selbst wird die Gold-Kerze (kein paralleler `candle`-Variant, keine schleichende Migration).
- **Modulfarben = Bestand ausbauen:** Werte = Gold, Wants/Schmiede = Rosé, Confidence = Lilac, Bill of Rights = Sage. Kein bestehender Flow wechselt seine Farbe; nur Hub-/Szenen-Ornamente ziehen nach.
- **Maßnahme 6 (Glow, mood-reaktive Ambience) ist KEIN Arbeitspaket**, sondern ein Bewertungs-Checkpoint nach Abschluss von 1–5.
- **Out of scope:** Farbpalettenwechsel (explizit aufgehoben für später), Light Mode, Tageszeit-Tönung, Glow.

## Maßnahmen

### M2 — Flächenkontrast + Body-Verlauf *(zuerst: erst der Raum, dann die Kerze)*

- Fixe Gradient-Ebene **unterhalb der Ambient-Blobs**, integriert in `components/ui/app-backdrop.tsx`. Kein `background-attachment: fixed` (iOS ignoriert es).
- Vertikaler Verlauf, Richtwerte oben ~`#131020` → unten ~`#171326`. Beide Endpunkte so, dass Card `#221C30` **≥ 1,3:1** gegen jeden Punkt des Verlaufs trägt.
- `--background`-Token in `app/globals.css` auf den unteren Endpunkt setzen (für alle direkten Token-Nutzer: Outline-Buttons, Inputs, Bottom-Nav-Alpha etc.).
- **Kontrast-Script ins Repo** (`scripts/check-contrast.mjs`): rechnet die Kernpaarungen (Card vs. Verlaufs-Endpunkte, Text-Paarungen, Gold-CTA) nach und dient als Gate für M1/M2.
- **SkyBackdrop nachjustieren** (`components/backdrops/sky-backdrop.tsx`, rendert auf Dashboard + Wants): dessen Schwarz-Vignette (heute 0,6 → 0 von oben) reduzieren, damit sich globale und lokale Abdunkelung oben nicht stapeln. Gesamt-Anmutung oben ≈ heute.

### M1 — Gold-CTA („die Kerze anzünden")

- `components/ui/button.tsx`, Variante `default`: `bg-primary text-primary-foreground` (Gold-Ink `#2B1B06`, 8,9:1), Hover = Gold leicht Richtung Ink abgedunkelt (`color-mix`, ~8 %), `backdrop-blur-md` entfällt. Active-Nudge (1px) und Disabled (`opacity-50`) bleiben. Focus-Ring bleibt Gold — Sichtbarkeit auf Gold-Fläche beim Umsetzen visuell prüfen (3px-Ring mit Abstand durch `border`).
- **Nicht angefasst:** `link`-Variante, Badges (bereits solid gold), `bg-primary/15`-Identity-Chips, alle anderen Varianten.
- **One-Candle-Audit:** 69 Default-Buttons in 31 Dateien; 13 Dateien haben mehrere. Prüfregel: pro **sichtbarem Zustand** (Wizard-Phase, nicht Datei!) genau ein Gold-Button. Konkurrenten → `outline` (gleichwertige Alternative) oder `secondary` (untergeordnet). Erwartung: Wizard-Phasen rendern meist exklusiv, realer Umstufungsbedarf klein.
- **DESIGN.md synchronisieren:** Abschnitt 5 (Buttons) beschreibt künftig den soliden Gold-CTA; Frontmatter `button-primary.textColor` wird `gold-ink` (heute fälschlich `moonlight`).

### M3 — Grain

- Neue Komponente `GrainOverlay` im Root-Layout: SVG-Noise (`feTurbulence`) als data-URI, `fixed inset-0 pointer-events-none`, Opacity ~0,025, statisch (keine Animation, kein Scroll-Repaint), oberste Deko-Ebene mit dokumentiertem z-Index.
- **Gate:** iPhone-Test über den Glass-Cards (bekannte iOS-Compositing-Geister bei backdrop-filter). Bei Artefakten: Fallback unter den Content (`-z`), sonst Revert. Reduced-Motion: nichts nötig (statisch).

### M4 — Fraunces Italic für Affirmationen

- Vorab-Check: liefert der geladene `next/font`-Fraunces-Cut Italics + SOFT-Achse mit, oder kostet das eine zweite Font-Datei? (Abwägung Payload vs. Wirkung dokumentieren; bei signifikantem Mehrgewicht Entscheidung an Stefan.)
- Utility `.font-affirmation` (Fraunces Italic, hohe SOFT-Achse) für Sprach-Momente: Heutiges Recht (Dashboard), Bill-of-Rights-Liste, Daily-Reminder, Mantra-Texte.
- DESIGN.md: Serif-Is-Voice-Regel um die Italic-Stufe erweitern („Affirmationen dürfen kursiv sprechen").

### M5 — Modul-Lichtfarben über Szenen

- Zuordnung: **Werte = Gold** (`--primary`), **Wants/Schmiede = Rosé** (`--celebrate`), **Confidence = Lilac** (`--cleanser-confidence`), **Bill of Rights = Sage** (`--success`).
- Nur Szenen-Ornamente/Glows ziehen nach: /me-Hub (Wachssiegel → Sage-Glow; Wants-Stern/Blasen → Rosé), Kopf-Apotheke (Gefäß-Ornamente je Modulfarbe). Kein Flow-Inhalt wird umgefärbt.
- **Gold bleibt überall die Aktions-Farbe** — Modulfarbe ist reine Identität in Ornament/Glow, die One-Candle-Rule bleibt unberührt.
- DESIGN.md: Modulfarben-Tabelle dokumentieren.

## Rollout & Verifikation

- **Reihenfolge: M2 → M1 → M3 → M4 → M5.** Ein Commit + Push pro Maßnahme (etablierter Workflow); Stefan testet unmittelbar am iPhone gegen den Live-Deploy.
- Pro Schritt: `npx tsc --noEmit` + Build; für M1/M2 zusätzlich das Kontrast-Script; Desktop-Sichtprüfung per Browser-Verifikations-Rezept (Wegwerf-Account + `onboarding_completed`).
- **Checkpoint (nach M5, gemeinsam am Live-Stand):** Braucht es noch Glow unter der Hero-Card oder mood-reaktive Ambience? Erst dann ggf. Folge-Spec. Ebenfalls am Checkpoint: North-Star-Umformulierung in DESIGN.md („ein geschützter, gedämpfter Raum, in den du dich jederzeit zurückziehen kannst") als reine Doku-Änderung.

## Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Mehrere Gold-Buttons pro Wizard-Phase nach M1 | Audit pro sichtbarem Zustand, Umstufungs-Regel outline/secondary |
| Doppelte Abdunkelung oben auf Dashboard/Wants | SkyBackdrop-Vignette wird mit dem Body-Verlauf gegengerechnet |
| iOS-Compositing-Artefakte durch Grain über Glass | Test-Gate am iPhone, Fallback/Revert definiert |
| Fraunces-Italic-Payload | Vorab-Check der Font-Achsen, Entscheidung bei Mehrgewicht |
| Focus-Ring auf Gold-Fläche schlecht sichtbar | Visuelle Prüfung im M1-Schritt, ggf. Ring-Farbe auf Moonlight für default-Variante |
