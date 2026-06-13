# Phase 0: Vorbereitung & Accounts (manuell)

> Bevor Claude Code überhaupt loslegen kann, brauchst du ein paar Accounts und das lokale Setup. Das hier machst du **einmalig manuell** – dauert ca. 30-45 Minuten.

---

## 1. Accounts anlegen

### GitHub
1. Falls noch nicht vorhanden: Account auf [github.com](https://github.com) erstellen
2. Neues Repository anlegen:
   - Name: z.B. `aic-app`
   - Sichtbarkeit: **Private** (empfohlen, solange es noch in Entwicklung ist)
   - **Nicht** mit README/.gitignore initialisieren – das macht `create-next-app` später für dich

### Supabase
1. Account auf [supabase.com](https://supabase.com) erstellen (Login via GitHub geht am schnellsten)
2. Neues Projekt anlegen:
   - Projektname: z.B. `aic-app`
   - Datenbank-Passwort generieren lassen und **sicher speichern** (Passwort-Manager!)
   - Region: Europe (Frankfurt) für niedrige Latenz aus Deutschland
3. Nach Erstellung (dauert 1-2 Min): Im Dashboard unter **Project Settings → API** notieren:
   - `Project URL`
   - `anon public` Key
   - (Diese brauchst du später für `.env.local`)

### Anthropic (API Key)
1. Account auf [console.anthropic.com](https://console.anthropic.com) erstellen
2. Unter **API Keys** einen neuen Key generieren
3. Key sicher speichern (wird nur einmal angezeigt!)
4. Optional: Unter **Billing** ein kleines Guthaben aufladen (5-10 $ reichen für die ganze Entwicklungsphase locker) und ein **Spending Limit** setzen (z.B. 10 $/Monat), damit du nicht überrascht wirst

### Vercel
1. Account auf [vercel.com](https://vercel.com) erstellen – **mit GitHub einloggen**, das verknüpft beide Accounts direkt
2. Mehr musst du hier noch nicht tun – die Verbindung zum Repo machst du erst in Phase 1, sobald Code existiert

---

## 2. Lokale Tools installieren

### Node.js
1. Prüfen, ob bereits installiert: Terminal/PowerShell öffnen, `node -v` eingeben
2. Falls nicht vorhanden oder Version < 20.9: [nodejs.org](https://nodejs.org) → LTS-Version installieren (Next.js 16 benötigt mind. Node.js 20.9)

### Git
1. Prüfen: `git --version`
2. Falls nicht vorhanden: [git-scm.com](https://git-scm.com) installieren
3. Falls noch nie konfiguriert:
   ```bash
   git config --global user.name "Dein Name"
   git config --global user.email "deine@email.com"
   ```

### VS Code + Claude Code
1. VS Code: [code.visualstudio.com](https://code.visualstudio.com) installieren (falls noch nicht vorhanden)
2. Claude Code installieren – folge der offiziellen Anleitung unter [docs.claude.com](https://docs.claude.com) (Suche nach "Claude Code installation"), da sich der Installationsprozess ändern kann
3. In VS Code einen leeren Ordner für dein Projekt anlegen, z.B. `~/Projects/aic-app`, und diesen Ordner in VS Code öffnen

---

## 3. GitHub Repo lokal verknüpfen

Im Terminal, im gewünschten übergeordneten Ordner (z.B. `~/Projects`):

```bash
git clone https://github.com/DEIN-USERNAME/aic-app.git
cd aic-app
```

Falls das Repo noch komplett leer ist, ist das ok – im nächsten Schritt (Phase 1) wird Claude Code hier das Next.js-Projekt initialisieren.

---

## 4. Checkliste — bevor du zu Phase 1 gehst

- [ ] GitHub Repo erstellt und lokal geklont
- [ ] Supabase-Projekt erstellt, URL + anon Key notiert
- [ ] Anthropic API Key erstellt, Spending Limit gesetzt
- [ ] Vercel Account erstellt (mit GitHub verknüpft)
- [ ] Node.js, Git, VS Code, Claude Code installiert
- [ ] Projektordner in VS Code geöffnet, Terminal funktioniert

Sobald das steht, geht's weiter mit **Phase 1: Foundation**.
