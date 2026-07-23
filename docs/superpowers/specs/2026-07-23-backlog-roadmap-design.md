# Backlog-Roadmap — Abarbeitung der offenen Punkte

_Stand: 2026-07-23. Referenz-Dokument, aus dem Runde für Runde abgearbeitet wird. Konsolidiert aus den Daily Notes 13.07.–22.07. und gegen Code/Prod verifiziert. Jede baubare Runde bekommt bei Bedarf ihren eigenen Spec → Plan → Implementierung-Zyklus; dieses Dokument ist die Landkarte darüber._

## Kern-Entscheide (in dieser Session getroffen)

- **Modulfarbe Wants:** **Gold** ist die Wants-Modulfarbe (Sternenkarte + alles, was dazugehört — Hauptfläche, Primary/CTA/„One-Candle"). **Rose (`--celebrate`) gehört der Schmiede-Subpage** als bewusster Feier-/Completion-Akzent. Das ist eine bewusste Zonierung, keine Inkonsistenz. → löst den Gold-vs-Rose-Cluster (C1) auf.
- **Reihenfolge-Logik:** Erst Baubares wegräumen (statisch grün), *dann* das iPhone-Gate über den finalen Stand — so wächst der „gebaut-aber-ungeprüft"-Berg nicht, und jede Fläche wird nur einmal abgenommen.
- **Dependency-Insight:** **C1 (Gold-vs-Rose) baut VOR B2 (Schmiede-iPhone-Abnahme)** — sonst wird die Schmiede zweimal abgenommen (einmal jetzt, einmal nach der Umfärbung). C1 ändert Schmiede-Rose + Reflektieren-CTA; vorher rein, dann verifiziert B2 den Endzustand in einem Durchgang.

## Validitäts-Check (2026-07-23)

Alle konkreten Fixes sind noch offen — nichts wurde zwischenzeitlich still erledigt:

| Punkt | Status | Beleg |
|---|---|---|
| FK-Migration auf Prod | offen | Prod hat nur `baseline_schema` + `wants_table` (via `list_migrations`); `20260720120000_cleanser_checkins_cascade` nicht angewandt |
| `--celebrate` im Kontrast-Gate | offen | kein `celebrate`-Treffer in `scripts/check-contrast.mjs` |
| Stale-Label „Ersetzen-Toggle" | offen | `scripts/check-contrast.mjs:43` |
| `savedCount` → `openCount` | offen | `app/(app)/me/wants/schmiede/sternschmiede.tsx:498` |
| funken-sky `aria-live` (Verwerfen-Swap) | offen | Text wechselt „Verwerfen"↔„Wirklich verwerfen?" ohne Live-Region, `funken-sky.tsx:283` |
| funken-sky Backdrop-Button | teils | ist bereits `<button aria-label="Schließen">` (`funken-sky.tsx:241`); Rest-Punkt = VoiceOver-Swipe-Reihenfolge (Detail) |

Design-Entscheidungen (Gold-vs-Rose, Seitentitel, Abschluss-Farbe) und der iPhone-Verifikations-Stau sind naturgemäß offen — nicht aus dem Code als „erledigt" verifizierbar.

---

## Track-Struktur

### Track A — Handoffs (nur Stefan, keine Abhängigkeit, jederzeit)
- **A1** FK-Migration: `supabase db push` (CLI, in der Claude-Arbeitsumgebung nicht verfügbar; bewusst **nicht** via MCP `apply_migration`, um History-Drift zur committeten Datei zu vermeiden). Danach Kaskade in `information_schema.referential_constraints` prüfen. Voraussetzung für späteres DSGVO-„Konto löschen". Migration: `supabase/migrations/20260720120000_cleanser_checkins_cascade.sql` (committet `0618f50`).

### Track B — iPhone-Verifikations-Stau (Stefans Gate; schaltet die Re-Critiques frei)
Gebaut, aber am Gerät nicht abgenommen — in Bündeln, je ein Durchgang:
- **B1** Sternensuche-Redesign + drei Regressions-Fixes (sticky Header, ploppender Himmel, hartes Toggle, Completion-Safe-Area). Rest-Risiko: Grid-`0fr→1fr`-Transition kann auf altem iOS-Safari ruckeln → dann D2.
- **B2** Sternschmiede-Redesign (vier Phasen, gezähmter Warp, Funken-Fokus-Ebene) — **nach C1**, damit der Rose-Endzustand mit abgenommen wird.
- **B3** Wants Kamera-Push (`f2e3775`, letzte Himmel-Helligkeit).
- **B4** values-Runden: `/me/values`, `/me/values/journey` (Vorrunde + Finale 31/40), `/me/values/journey/journal` (31/40).
- → nach jedem Bündel die zugehörige `/impeccable critique` erneut (Erwartung: Scores steigen).

### Track C — Baubare Runden (entscheidungsfrei, ich)
- **C1** Gold-vs-Rose-Cluster *(Entscheid steht)*:
  - DESIGN.md-Mapping nachziehen: Wants-Modul = Gold; Schmiede-Subpage = Rose (`--celebrate`, Feier-/Completion-Akzent).
  - Reflektieren-CTA → Gold (statt outline).
  - `--celebrate` (Rose) ins `scripts/check-contrast.mjs` aufnehmen — Rose ist seit dem Schmiede-Redesign breite Ornament-/Auswahlfarbe (Esse-Bloom, Funken, Auswahlkarten, Schwarm); bisher nur handgerechnet (Held-Haken 5,8:1).
  - Stale-Label „Ersetzen-Toggle" in `check-contrast.mjs` umbenennen (Toggle nutzt seit dem Neutral-Umbau kein Destructive-Text-Paar mehr).
  - Gold/Rose-Leckagen prüfen: kein verirrtes Gold in der Schmiede, das Rose sein sollte, und umgekehrt.
- **C2** a11y-Einzeiler `components/wants/funken-sky.tsx`: `aria-live` beim Verwerfen-Swap (`funken-sky.tsx:283`) + VoiceOver-Backdrop-Swipe-Reihenfolge.
- **C3** `savedCount` → `openCount` (`sternschmiede.tsx:498`; Verhalten korrekt, Name irreführend — zählt offene Funken). Trivial, in den C1/C2-Commit faltbar.
- **C4** Leitsatz-Runde: „Auch wenn das Wetter sie manchmal versteckt: Deine Sterne leuchten weiter." in `.font-affirmation` an 1–2 Übungs-Abschlussmomente. Text + Utility existieren, nur Platzierung fehlt. Reif, weil die Stern-/Kompass-Bildwelt vollständig gebaut ist.
- **C5** Yang-„Bonus: Willst du tiefer graben?"-Toggle (`app/(app)/me/wants/journey/wants-journey.tsx`) auf die Grid-`0fr→1fr`-Ausklapp-Animation ziehen — derselbe harte `{open && …}`-Mount wie die schon gefixte Sterne-Liste. Konsistenz.

### Track D — Architektur / Refactor
- **D1** `/impeccable extract`: Fokus-Ebene → geteiltes Dialog-Primitive/Hook. Wurzel-Fix der wiederkehrenden Klasse „hand-gerollte Portal-Overlays re-derivieren Focus + Scroll und regressieren am Gerät" (21.07. `focus()`-Scroll-Bug, 22.07. sticky-Header). Aktuell koexistieren zwei Dialog-Impls (`focus-sky` + `funken-sky`). Kandidat für die nächste substanzielle Wants-Berührung. Siehe Memory `portal-focus-needs-preventscroll`.
- **D2** *(bedingt)* Collapse-Primitive (Radix Collapsible / gemessene Höhe) — nur falls die Grid-Transition auf altem iOS-Safari fühlbar ruckelt (B1). Dann Sterne-Liste (`wants-journey.tsx`) + Yang-Toggle (C5) beide darauf ziehen.

### Track E — Design-System-Entscheide (offen, brauchen Stefan, kein Raten)
- **E1** Seitentitel-Konsistenz: Auswertung rendert ein eigenes In-Body-`text-4xl`-Heading zusätzlich zum sticky `SubPageHeader`, Hypothese/Journal nicht. Welches Muster kanonisch ist — Design-System-Frage. Löst dann eine kleine Angleichungs-Runde aus.
- **E2** Abschluss-Farbe flächenübergreifend: bleiben alle Completion-Screens Gold (Haus-Completion), oder wechseln sie auf Sage/Rose (semantische Completion-Farbe)? Von C1 nur teilweise berührt (C1 klärt Wants-Modul vs. Schmiede-Subpage, nicht die flächenübergreifende Completion-Frage). Hängt mit E1 zusammen.

### Track F — Bewusst geparkt (nicht aktiv, aus dem `/me/wants` 35/40-Snapshot)
- Generische „Speichern fehlgeschlagen"-Strings (`/impeccable clarify`).
- Harter Karten-Remount bei Add/Delete statt Per-Stern Enter/Exit (`/impeccable animate`).
- Vibe-Pillen im Reflect nicht als „(optional)" markiert.
- Fokus-Edit-Save ohne explizites Erfolgssignal.

Bleibt geparkt, bis eine aktive Runde zufällig dranstreift.

---

## Empfohlene Reihenfolge (kritischer Pfad)

**Phase 1 — Jetzt, parallel (nichts blockiert):**
- 🟦 **A1** FK-Push *(Stefan, CLI)* — läuft neben allem her.
- 🟩 **C1 + C2 + C3** in einem Push-Zyklus *(ich)* — alle statisch verifizierbar (tsc + `npm run gate` + build), alle berühren wants/schmiede, Entscheid steht. Räumt den mechanischen Cluster ab.

**Phase 2 — Runder Abschluss der Bildwelt:**
- 🟩 **C4** Leitsatz-Runde *(ich)*.

**Phase 3 — iPhone-Gate (jetzt am finalen Stand):**
- 🟦 **B1** Sternensuche · **B2** Sternschmiede *(enthält jetzt C1-Rose)* · **B3** Wants-Kamera · **B4** values.
- → danach die Re-Critiques.

**Phase 4 — Konsistenz + Refactor (bei der nächsten Wants-Berührung):**
- 🟩 **C5** Yang-Toggle + 🟩 **D1** extract gebündelt. **D2** nur bei fühlbarem Grid-Jank aus B1.

**Phase 5 — Design-System-Entscheide (beim Anfassen der journey/completion-Flächen):**
- 🟨 **E1** Seitentitel · 🟨 **E2** Abschluss-Farbe — Entscheide, die je eine kleine Angleichungs-Runde auslösen.

**Track F** bleibt geparkt.

## Legende
- 🟩 baubar (ich, statisch verifizierbar) · 🟦 Handoff/Gate (Stefan) · 🟨 Entscheid (Stefan, kein Bau)
