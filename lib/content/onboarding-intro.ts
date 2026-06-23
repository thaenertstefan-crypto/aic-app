/** App-Intro-Karten im Onboarding (Steps intro1–intro4). Initiale Entwürfe. */
export type OnboardingIntroCard = { title: string; body: string };

export const ONBOARDING_INTRO: OnboardingIntroCard[] = [
  {
    title: "Dein persönliches Werkzeug",
    body: "Diese App hilft dir, dein Selbstbewusstsein aus verschiedenen Winkeln zu stärken — mit kleinen, gezielten Übungen für deinen Alltag.",
  },
  {
    title: "Was dich erwartet",
    body: "Du lernst, mit Gedankenspiralen umzugehen, schuldgefühlfrei Nein zu sagen und die Angst loszulassen, einfach du selbst zu sein.",
  },
  {
    title: "Dich selbst kennenlernen",
    body: "Das Ziel: dich auf einer tieferen Ebene zu verstehen — deine Werte entdecken, wissen was du wirklich willst, und dir innere Regeln definieren, nach denen du lebst.",
  },
  {
    title: "Für schwierige Momente",
    body: "Und wenn's eng wird: die Kopf-Apotheke hilft dir aus unangenehmen Momenten — ob Gedankenspirale, Nervosität vor einem Auftritt oder ein schwieriges Gespräch.",
  },
];
