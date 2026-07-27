/** App-Intro-Karten im Onboarding (Steps intro2–intro6). */
export type OnboardingIntroCard = { title?: string; body: string[] };

/**
 * Reaktion auf den Confidence-Check (Step intro1) — verzweigt nach Score-Band,
 * damit hohe Werte nicht dieselbe „das war mutig"-Copy bekommen wie niedrige.
 */
export function confidenceReaction(score: number): OnboardingIntroCard {
  if (score <= 4) {
    return {
      title: "Das war mutig.",
      body: [
        "Danke für deine Ehrlichkeit – zu mir und vor allem zu dir selbst. Sich die Wahrheit einzugestehen ist nicht immer leicht. Aber genau da fängt es an: Nur wer wirklich ehrlich zu sich ist, findet zurück zu dem Gefühl, gut genug zu sein.",
      ],
    };
  }
  if (score <= 7) {
    return {
      title: "Danke für deine Ehrlichkeit.",
      body: [
        "Ehrlich zu sich selbst zu sein ist nicht immer leicht – und genau darum geht es hier. Nur wer sich wahrnimmt, wie er gerade wirklich ist, findet zurück zu dem Gefühl, gut genug zu sein.",
      ],
    };
  }
  return {
    title: "Schön, dass du dir so sicher bist.",
    body: [
      "Danke für deine Ehrlichkeit. Dieses Gefühl von Sicherheit ist genau das, was wir hier bewahren und stärken wollen – damit es dein Normalzustand bleibt, auch wenn es mal stürmisch wird.",
    ],
  };
}

/**
 * App-Intro-Karten (intro2–intro6). Der „Me"-Teil ist bewusst auf drei Karten
 * verteilt (Werte / Wants / Bill of Rights), damit kein Screen zur Textwand
 * wird — ein Anlaufpunkt pro Karte. Index-Mapping in der Seite: intro2 → [0].
 */
export const ONBOARDING_INTRO: OnboardingIntroCard[] = [
  {
    // intro2 (Schritt 6) — Me-Teil, Anlaufpunkt 1: Werte
    title: "Was dich erwartet: Me",
    body: [
      "Diese App hat eine Prämisse, die für mich alles verändert hat: Ein gesundes Selbstbewusstsein beginnt damit, dass du weißt, wer du wirklich bist – tiefer, als du vielleicht bisher hingeschaut hast. Denn nur wenn du dich kennst, kannst du dein Leben so gestalten, dass es dir Energie gibt, statt sie dir zu nehmen.",
      "Dabei tragen dich drei innere Anlaufpunkte. Der erste und wichtigste sind deine Werte – dein innerer Kompass. Er weist dir den Weg und zeigt, was dir wirklich wichtig ist, ob Abenteuerlust oder Gelassenheit.",
    ],
  },
  {
    // intro3 (Schritt 7) — Me-Teil, Anlaufpunkt 2: Wants
    title: "Deine Wants",
    body: [
      "Der zweite Anlaufpunkt sind deine Wants – wie Sterne, nach denen du entlang dieses Weges greifst. Es sind echte Freudenquellen: ein Wanderurlaub, ein chilliger Spieleabend mit Freunden, aber auch Ziele, die dich tagträumen lassen und antreiben.",
      "Es sind die Dinge, die dich so richtig zum Leuchten bringen. Wie einen Stern.",
    ],
  },
  {
    // intro4 (Schritt 8) — Me-Teil, Anlaufpunkt 3: Bill of Rights + Übergang zum Kopfwetter
    title: "Deine Bill of Rights",
    body: [
      "Und dann sind da deine inneren Regeln: unausgesprochene Rechte, die dir sagen, was du darfst und was nicht. Nur sind sie nicht immer hilfreich – vor allem, wenn sie „Ich darf niemanden enttäuschen“ heißen und dich von deinen Sternen wegführen.",
      "Diese App hilft dir, sie neu zu schreiben und dir selbst die Rechte zu geben, nach denen du wirklich leben willst.",
      "Diesen Weg zu gehen ist nicht immer leicht. Manchmal zieht in deinem Kopf ein Unwetter auf, das deine Sterne verdeckt – als Overthinking oder als Schuldgefühl, wenn du nach deinen Regeln lebst und dabei jemanden enttäuschen musst. Das ist normal: Wetter kommt und vergeht, doch deine Sterne leuchten weiter. Du brauchst nur einen Weg, mit dem Wetter umzugehen. Genau dafür ist das Kopfwetter da:",
    ],
  },
  {
    // intro5 (Schritt 9) — Kopfwetter
    title: "Was dich erwartet: Kopfwetter",
    body: [
      "Das Kopfwetter ist der zweite Teil dieser App: eine Reihe von Schnellhilfen, wenn es mal etwas stürmisch wird.",
      "Sie helfen dir, aus Overthinking-Spiralen herauszufinden, eine schuldgefühlfreie „Nein“-Antwort zu formulieren oder dir selbst Rückenwind zu geben, bevor du in ein nervenaufreibendes Gespräch, Treffen oder eine Präsentation gehst. Kleine Unterstützer, schnell abrufbar, für mittendrin im Alltag.",
    ],
  },
  {
    // intro6 (Schritt 10) — Abschluss
    title: "Schön, dass du da bist.",
    body: [
      "„Me“, um dich Stück für Stück kennenzulernen. Das Kopfwetter, um dir im Alltag den Rücken zu stärken. Zusammen bringen sie dich zurück zu dem Gefühl, das eigentlich dein Normalzustand sein sollte: ich bin gut genug.",
      "Bereit?",
    ],
  },
];
