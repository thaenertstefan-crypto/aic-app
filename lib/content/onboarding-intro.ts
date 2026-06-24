/** App-Intro-Karten im Onboarding (Steps intro1–intro4). */
export type OnboardingIntroCard = { title?: string; body: string[] };

export const ONBOARDING_INTRO: OnboardingIntroCard[] = [
  {
    // intro1 (Schritt 5) — ohne Titel
    body: [
      'Danke für Deine Ehrlichkeit – zu mir und vor allem zu Dir selbst. Genau das ist die Grundlage für Dein persönliches Wachstum, bei dem Dir diese App helfen soll.',
    ],
  },
  {
    // intro2 (Schritt 6)
    title: 'Was Dich erwartet',
    body: [
      'Die App besteht im Wesentlichen aus zwei Teilen. Im Teil „Me“ geht es darum, die Essenz eines gesunden Selbstbewusstseins herauszuarbeiten: Dich selbst kennenzulernen – und zwar auf einer tieferen Ebene, als Du sie bisher vielleicht betrachtet hast.',
      'Konkret findest Du mit den Übungen im Teil „Me“ heraus, was Dir wirklich wichtig ist (Deine Werte), was Du wirklich willst (Deine Wants) und nach welchen inneren Regeln Du leben willst (Deine Bill of Rights).',
      'Die Prämisse: Nur wenn Du Dich selbst wirklich kennst, kannst Du Dein Leben so gestalten, dass Du die Dinge tust, die Dir wirklich Energie geben, statt sie Dir zu nehmen. Und wenn Du dabei in innere Konflikte gerätst, hast Du immer noch die Kopf-Apotheke.',
    ],
  },
  {
    // intro3 (Schritt 7)
    title: 'Was Dich erwartet',
    body: [
      'Die Kopf-Apotheke ist der zweite Teil dieser App und stellt Dir eine Reihe von Schnellhilfen bereit.',
      'Sie helfen Dir, Overthinking-Spiralen zu überwinden, eine schuldgefühlfreie „Nein“-Antwort zu formulieren oder Dir selbst Rückenwind zu geben, bevor Du in ein nervenaufreibendes Gespräch, Treffen oder eine Präsentation gehst. Sprich: schnell abrufbare kleine Unterstützer für mittendrin im Alltag.',
    ],
  },
  {
    // intro4 (Schritt 8) — ohne Titel
    body: [
      '„Me“, um Dich Stück für Stück kennenzulernen. Die Kopf-Apotheke, um Dir im Alltag den Rücken zu stärken. Zusammen bringen sie Dich zu dem Gefühl zurück, das eigentlich Dein Normalzustand sein sollte: gut genug.',
      'Bereit?',
    ],
  },
];
