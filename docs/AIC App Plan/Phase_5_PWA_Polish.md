# Phase 5: PWA-Setup & Polish

> Ziel: Die App installierbar machen (Home Screen Icon, Offline-Grundgerüst, Push-Vorbereitung) und letzten Feinschliff vornehmen.
>
> Geschätzte Dauer: 2-4 Tage
>
> Voraussetzung: Phasen 1-4 abgeschlossen (zumindest 1, 2, 4)

---

## Schritt 5.1: PWA-Grundsetup

### Manuell: Icons vorbereiten

Du brauchst App-Icons in mehreren Größen. Am einfachsten:
1. Erstelle/exportiere ein quadratisches Logo (mind. 512x512px) - dein bestehendes AIC-Branding (schwarz/weiß, "Anti Imposter Club") eignet sich gut
2. Nutze einen kostenlosen Generator wie [realfavicongenerator.net](https://realfavicongenerator.net) oder [pwabuilder.com](https://www.pwabuilder.com) um die nötigen Größen zu erzeugen (typisch: 192x192, 512x512, plus maskable Varianten)
3. Lege die generierten Dateien in `public/icons/` ab

### Claude Code Prompt

```
Set up PWA support for this Next.js 14 App Router project:

1. Install next-pwa (or if there are known compatibility issues with 
   Next.js 14 App Router, use the manual approach: create a 
   public/manifest.json and register a service worker manually - choose 
   whichever is more stable and explain your choice)

2. Create public/manifest.json with:
   - name: "Anti Imposter Club"
   - short_name: "AIC"
   - description: "Dein Begleiter für mehr Selbstbewusstsein"
   - start_url: "/dashboard"
   - display: "standalone"
   - background_color and theme_color matching the app's design 
     (check the Tailwind config / globals.css for the primary colors used)
   - icons array referencing the files in public/icons/

3. Add the manifest link and theme-color meta tags to app/layout.tsx

4. Set up a basic service worker for offline fallback (at minimum, cache 
   the app shell so the app doesn't show a browser error when offline - 
   show a simple "You're offline" state instead)

5. Test that the app shows an "Install" prompt / "Add to Home Screen" 
   option on mobile Chrome and can be added to the home screen.
```

### Manuell testen

- Auf dem Handy: Vercel-URL im Chrome (Android) oder Safari (iOS) öffnen
- "Zum Startbildschirm hinzufügen" sollte verfügbar sein
- App öffnen vom Homescreen → sollte ohne Browser-Leiste starten

---

## Schritt 5.2: Offline-fähiges Journaling (optional, aber empfehlenswert)

### Claude Code Prompt

```
Improve offline resilience for the journal forms:

1. In the journal entry forms (Recipe #1 daily journal, overthinking wizard, 
   bill of rights reflection), if a save request fails (e.g. due to no 
   network connection), save the form data to localStorage as a draft 
   instead of losing it.

2. On page load, check for a localStorage draft for that form and offer to 
   restore it ("Du hattest einen ungespeicherten Eintrag - wiederherstellen?")

3. Show a small offline indicator (banner) when navigator.onLine is false.

This doesn't need to be a full offline-sync system - just prevent users 
from losing journal entries if their connection drops mid-write.
```

---

## Schritt 5.3: Push Notifications (optional)

> Das ist der aufwändigste optionale Teil. Du kannst diesen Schritt auch erstmal überspringen und später nachholen.

### Manuell: OneSignal Account

1. Account auf [onesignal.com](https://onesignal.com) erstellen (kostenloser Tier)
2. Neue App anlegen, Plattform "Web Push"
3. Im Setup-Wizard die Site-URL eintragen (deine Vercel-URL bzw. Custom Domain)
4. App ID und REST API Key notieren

### Claude Code Prompt

```
Integrate OneSignal Web Push into this Next.js PWA:

1. Install react-onesignal
2. Create lib/onesignal/client.ts to initialize OneSignal with the app ID 
   (from NEXT_PUBLIC_ONESIGNAL_APP_ID env var)
3. Initialize it in app/layout.tsx (client component wrapper)
4. On the Profile page, add a "Erinnerungen aktivieren" toggle that 
   prompts for push permission via OneSignal
5. Create a simple app/api/send-reminder/route.ts that, given a user's 
   OneSignal player ID, sends a push notification via the OneSignal REST 
   API (for now this is just the function - actual scheduling/cron is a 
   later step)

Document in a comment what env vars are needed: 
NEXT_PUBLIC_ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY
```

### Manuell

- Env Vars in `.env.local` und Vercel eintragen
- Für tatsächliches "tägliche Erinnerung um 9 Uhr" brauchst du später einen Cron-Job (z.B. Vercel Cron, [vercel.com/docs/cron-jobs](https://vercel.com/docs/cron-jobs)) - das kann ein eigener kleiner Folge-Schritt sein, sobald die Grundfunktion steht

---

## Schritt 5.4: Allgemeiner Polish-Pass

### Claude Code Prompt

```
Do a polish pass over the entire app:

1. Check all pages for loading states (skeleton loaders or spinners while 
   fetching data) and empty states (friendly messages when no data exists 
   yet)
2. Check all forms for proper validation and error messages
3. Ensure consistent spacing, typography, and color usage across all pages 
   - extract repeated patterns into shared components if you find 
   duplication
4. Add a simple 404 page (app/not-found.tsx) and a global error boundary 
   (app/error.tsx) with friendly, on-brand messaging
5. Review all German microcopy for consistency in tone (warm, encouraging, 
   informal "du" form throughout)
6. Run `npm run build` and fix any TypeScript or build errors

Go through the app systematically page by page and list what you changed.
```

---

## Schritt 5.5: Finales Testen & Deployen

### Manuell

```bash
npm run build
npm run start
```

Teste den Production-Build lokal (nicht nur `npm run dev`).

Dann:
```bash
git add .
git commit -m "Phase 5: PWA setup, offline drafts, polish"
git push
```

Auf der Vercel-URL (idealerweise vom Smartphone, als installierte PWA) den kompletten Flow nochmal durchspielen:
1. Signup → Onboarding
2. Dashboard Check-in
3. Ein Recipe komplett durchlaufen
4. Cleanser nutzen
5. App schließen und vom Homescreen-Icon neu öffnen

---

## Checkliste Phase 5

- [ ] App-Icons erstellt und in `public/icons/` abgelegt
- [ ] PWA-Manifest + Service Worker eingerichtet, "Add to Home Screen" funktioniert
- [ ] Journal-Formulare haben Draft-Recovery bei Verbindungsabbruch
- [ ] (Optional) Push Notifications via OneSignal eingerichtet
- [ ] Loading-/Empty-/Error-States überall vorhanden
- [ ] 404- und Error-Seiten vorhanden
- [ ] `npm run build` läuft fehlerfrei
- [ ] Kompletter Flow auf dem Smartphone als installierte PWA getestet

---

## Was kommt danach?

An diesem Punkt hast du ein **funktionierendes MVP** gemäß dem ursprünglichen Plan. Mögliche nächste Schritte (V1.1 / V2.0 aus dem Hauptplan):

- **Recipe #2 (Wants + Little Bets)** und **Recipe #4 (Saying No)** nach demselben Muster wie Phase 2 ergänzen
- **Recipe #6 (Shadow Journal)** mit optionalem "Rage Walk" (Web Speech API für Sprachaufnahme)
- **AI Coach Chat** (offener Chat mit Kontext über Werte, Bill of Rights, Fortschritt) - ähnliches Muster wie Phase 3, aber mit Conversation-History
- **Eigene Domain** verbinden (Vercel: Settings → Domains)
- **Feedback einholen**: ein paar Freunde/Bekannte testen lassen, bevor du größer denkst

Für jeden dieser Schritte kannst du nach demselben Muster vorgehen: Datenbank-Tabellen zuerst (manuell SQL), dann Claude-Code-Prompts pro Komponente/Seite, dann testen & deployen.
