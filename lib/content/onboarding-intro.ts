/**
 * App-Intro-Karten im Onboarding (Steps intro2–intro8).
 *
 * WICHTIG: String-Literale mit einfachen Quotes (') delimitieren, damit die
 * deutschen Anführungszeichen („ … ") im Text kein doppeltes Quote-Literal
 * beenden (sonst TS1005 / unterminated string). Immer echte Unicode-Quotes
 * U+201E („) und U+201C (") verwenden, nie ASCII ".
 *
 * Die Kartentexte tragen leichtes Inline-Markup (`**fett**` / `*kursiv*`), das
 * [RichText](../../components/ui/rich-text.tsx) beim Rendern auflöst.
 */
import { getValueEmoji } from "@/lib/utils/values-emojis";

export type OnboardingIntroCard = { title?: string; body: string[] };

/**
 * Beispiel-Werte für die Kompassrose im Onboarding (Karte intro3 + Mini-Vorschau).
 * Ohne Emojis dimmt sich [CompassArt](../../components/brand/me-ornaments.tsx)
 * auf 40 % — im Onboarding wäre das ein Leer-Zustand ohne Aussage. Abenteuerlust
 * und Ausgeglichenheit stehen wörtlich im Kartentext („sei es Abenteuerlust oder
 * Gelassenheit"). Integrität (🧭) ist bewusst NICHT dabei: ein Kompass-Emoji im
 * Kompass liest sich falsch. Aus der echten Emoji-Quelle abgeleitet, damit die
 * Vorschau nicht von der Realität abdriften kann.
 */
export const ONBOARDING_COMPASS_EMOJIS = [
  getValueEmoji("adventurousness"), // 🧗 Abenteuerlust
  getValueEmoji("balance"), // ⚖️ Ausgeglichenheit
  getValueEmoji("growth"), // 🌱 Wachstum
  getValueEmoji("honesty"), // 🪞 Ehrlichkeit
];

/**
 * Reaktion auf den Confidence-Check (Step intro1) — verzweigt nach Score-Band,
 * damit hohe Werte nicht dieselbe „das war mutig"-Copy bekommen wie niedrige.
 */
export function confidenceReaction(score: number): OnboardingIntroCard {
  if (score <= 4) {
    return {
      title: 'Das war mutig.',
      body: [
        'Danke für deine Ehrlichkeit – zu mir und vor allem zu dir selbst. Es ist nicht immer leicht, sich die Wahrheit einzugestehen. Aber nur wer wirklich **ehrlich zu sich selbst** ist, wird es schaffen, das Gefühl von „gut genug“ zurückzugewinnen.',
      ],
    };
  }
  if (score <= 7) {
    return {
      title: 'Danke für deine Ehrlichkeit.',
      body: [
        'Ehrlich zu sich selbst zu sein ist nicht immer leicht – und genau darum geht es hier. Nur wer sich wahrnimmt, wie er gerade wirklich ist, findet zurück zu dem Gefühl, **gut genug** zu sein.',
      ],
    };
  }
  return {
    title: 'Schön, dass du dir so sicher bist.',
    body: [
      'Danke für deine Ehrlichkeit. Dieses Gefühl von Sicherheit ist genau das, was wir hier bewahren und stärken wollen – damit es dein **Normalzustand** bleibt, auch wenn es mal stürmisch wird.',
    ],
  };
}

/**
 * App-Intro-Karten (intro2–intro8). Der „Me"-Teil ist bewusst über mehrere
 * Karten verteilt (Überblick + Werte / Wants / Bill of Rights), damit kein
 * Screen zur Textwand wird — ein Gedanke pro Karte. Index-Mapping in der
 * Seite: intro2 → [0].
 */
export const ONBOARDING_INTRO: OnboardingIntroCard[] = [
  {
    // intro2 (Schritt 6) — „Me"-Überblick: Prämisse + die drei Anlaufpunkte
    title: 'Was dich erwartet: „Me“',
    body: [
      'Die AIC-App vertritt eine zentrale Prämisse, die mein Leben seit ihrer Entdeckung komplett verändert hat: Die Essenz eines gesunden Selbstbewusstseins ist das: ***Sei dir bewusst, wer du bist.*** – und zwar auf einer tieferen Ebene, als du sie bisher vielleicht betrachtet hast.',
      'Denn nur wenn du dich *wirklich* kennst, kannst du dein Leben so gestalten, dass du die Dinge tust, die dir wirklich Energie geben, statt sie dir zu nehmen.',
      'Wir müssen nur herausfinden, was diese Dinge sind! Dabei helfen dir vor allem **drei innere Anlaufpunkte**:',
    ],
  },
  {
    // intro3 (Schritt 7) — Anlaufpunkt 1: Werte (Kompass)
    title: 'Deine Werte',
    body: [
      'Die fundamentale Grundlage für dein persönliches Wohlbefinden sind dabei deine **Werte**. Sie sind wie dein innerer Kompass, der dir den Weg weist und darauf zeigt, was dir *wirklich* wichtig ist, sei es Abenteuerlust oder Gelassenheit.',
    ],
  },
  {
    // intro4 (Schritt 8) — Anlaufpunkt 2: Wants (Sterne)
    title: 'Deine Wants',
    body: [
      'Deine **Wants** hingegen sind wie Sterne, nach denen du entlang dieses von deinem Kompass vorgegebenen Weges greifst. Sie sind Dinge, die *echte Freudenquellen* für dich sind, wie z.B. Wanderurlaube oder ein chilliger Spieleabend mit Freunden, aber auch deine Ziele, die dich tagträumen lassen und dich antreiben.',
      'Mit anderen Worten: Deine Wants sind die Dinge, die dich so richtig zum Leuchten bringen. Wie einen Stern.',
    ],
  },
  {
    // intro5 (Schritt 9) — Anlaufpunkt 3: Bill of Rights + Bridge zum Caveat
    title: 'Deine Bill of Rights',
    body: [
      'Und dann gibt es noch deine **inneren Regeln**. Sie sind wie unbewusste Rechte, die wir uns selbst geben und die uns sagen, was wir dürfen und was nicht.',
      'Leider sind sie nicht immer nützlich – vor allem, wenn sie „Ich darf niemanden enttäuschen“ lauten und uns vom Weg abbringen, der uns an unseren Sternen vorbeiführt.',
      'Diese App hilft dir, deine inneren Regeln neu zu schreiben und dir selbst die Rechte zu verleihen, nach denen du wirklich leben willst.',
      '**Aber eins sei von Anfang an ganz klar gesagt:**',
    ],
  },
  {
    // intro6 (Schritt 10) — Caveat (titellos, Fortführung der Bridge)
    body: [
      'Immer den Weg einzuschlagen, den unser Kompass vorgibt, wird nicht immer leicht sein. Manchmal zieht in unserem Kopf ein Unwetter auf, das unsere Sterne verdeckt – sei es in Form von Overthinking oder als Schuldgefühl, etwa wenn wir nach unseren Regeln leben und dabei andere enttäuschen müssen.',
      '**Das ist normal:** Wetter kommt und vergeht, doch die eigenen Sterne leuchten weiter. Wir müssen bloß einen Weg finden, mit dem Wetter umzugehen. Genau dabei hilft dir der Teil **Kopfwetter**:',
    ],
  },
  {
    // intro7 (Schritt 11) — Kopfwetter
    title: 'Was dich erwartet: Kopfwetter',
    body: [
      'Das Kopfwetter ist der zweite Teil dieser App und stellt dir eine Reihe von Schnellhilfen bereit, wenn es mal etwas stürmisch wird.',
      'Sie helfen dir, Overthinking-Spiralen zu überwinden, eine schuldgefühlfreie „Nein“-Antwort zu formulieren oder dir selbst Rückenwind zu geben, bevor du in ein nervenaufreibendes Gespräch, Treffen oder eine Präsentation gehst. Sprich: schnell abrufbare kleine Unterstützer für mittendrin im Alltag.',
    ],
  },
  {
    // intro8 (Schritt 12) — Abschluss
    title: 'Schön, dass du da bist.',
    body: [
      '„Me“, um dich Stück für Stück kennenzulernen. Das Kopfwetter, um dir im Alltag den Rücken zu stärken. Zusammen bringen sie dich zu dem Gefühl zurück, das eigentlich dein Normalzustand sein sollte: ***Ich bin gut genug***.',
      'Bereit?',
    ],
  },
];
