/**
 * Intro-Sequenzen für die Rezepte (Schritt 6.10).
 *
 * Beim ersten Besuch eines Rezepts werden diese Karten als durchklickbare
 * Einleitung gezeigt; danach dieselben Inhalte als aufklappbarer
 * "Worum geht's?"-Block. Die Texte hier sind erste Entwürfe in der warmen,
 * informellen AIC-Stimme ("du") und können frei editiert werden — die
 * Komponente bleibt generisch.
 *
 * Slugs gegen lib/utils/recipes.ts geprüft: "values", "bill-of-rights",
 * "overthinking" und "things-got-messy" sind die aktuell verfügbaren Rezepte.
 * Weitere Rezepte (wants, saying-no, shadow) bekommen ihre Intro, sobald sie
 * verfügbar sind.
 */

export type IntroCard = { title: string; body: string };

export const RECIPE_INTROS: Record<string, IntroCard[]> = {
  values: [
    {
      title: "Schon mal das Gefühl gehabt?",
      body: "Du triffst eine Entscheidung — einen Job, eine Beziehung, eine Bitte von jemandem — und irgendwas fühlt sich dabei komisch an. Nicht weil du falsch entschieden hast. Sondern weil du dich von etwas entfernt hast, das dir tief innen wichtig ist. Gleichzeitig gibt es diese anderen Momente, in denen du einfach in deinem Element bist — voll Energie, klar im Kopf, einfach gut. In beiden Momenten greifst du unbewusst auf dasselbe zurück:",
    },
    {
      title: "Deine Werte.",
      body: "Werte sind dein innerer Kompass — die Prinzipien und Überzeugungen, die deine Entscheidungen, Gedanken und Gefühle leiten, auch wenn du dir dessen gar nicht bewusst bist. Das Problem ist: Die meisten Menschen wissen gar nicht, was ihre eigentlich sind. Und wer seinen Kompass nicht kennt, navigiert auf gut Glück.",
    },
    {
      title: "Was dich erwartet",
      body: "In diesem Rezept findest du deine Werte nicht durch stundenlange Selbstreflexion — sondern durch echte Beobachtung von dir selbst. Wie ein Wissenschaftler. Du startest mit deiner Hypothese: 5 Werte, von denen du vermutest, dass sie deine sind — ohne zu viel nachzudenken. Dann beobachtest du dich selbst für 7 Tage mit kurzen Tagebuch-Einträgen: Was hat dich heute wirklich bewegt? Was hat dich genervt? Was hat dir Energie gegeben oder gekostet? Und vor allem: warum? Am Ende wertest du aus, ob deine Hypothese stimmt — oder ob du dich selbst überrascht hast. Pro Tag brauchst du dafür nur 2–3 Minuten. Bist du dabei?",
    },
  ],
  "bill-of-rights": [
    {
      title: "Da war doch was.",
      body: "Du hast heute Ja gesagt, obwohl du eigentlich Nein wolltest. Oder etwas nicht gesagt, obwohl du es gedacht hast. Oder wieder dieser Moment hinterher, in dem du dich fragst: Warum habe ich das nicht einfach gesagt? Das ist kein Zufall. Das ist kein Charakterfehler. Das ist dein Autopilot — und der läuft seit Jahren auf demselben Programm:",
    },
    {
      title: "Deine inneren Regeln.",
      body: "Psychologen nennen diese automatischen Muster Heuristiken: vorgefertigte innere Regeln, die dein Verhalten steuern, bevor du überhaupt bewusst entschieden hast. „Sag bloß nicht Nein.“, „Mach keinen Aufstand.“, „Was werden die anderen denken?“. Solche Regeln können dich leise kleinhalten. Das Gute daran: Regeln sind nur Regeln. Und Regeln kann man umschreiben.",
    },
    {
      title: "Was dich erwartet",
      body: "In diesem Rezept reflektierst du konkrete Momente aus deinem Alltag, in denen dich eine innere Regel zuletzt ausgebremst hat — Situationen, in denen du Ja gesagt hast obwohl du Nein wolltest, oder geschwiegen hast obwohl du hättest sprechen sollen. Aus jedem solchen Moment formulierst du ein Recht für dich: „Ich habe das Recht zu…“. Mindestens drei solcher Rechte bilden zusammen dein persönliches Bill of Rights. Und dann kommt der entscheidende Teil: Dein Bill of Rights verschwindet nicht in der Schublade. Es begleitet dich danach täglich in der App — denn nur durch Wiederholung reprogrammierst du echte neue innere Muster. Und wenn die Dinge mal messy werden (und das werden sie), hast du auch dafür hier einen Platz. Bist du dabei?",
    },
  ],
  overthinking: [
    {
      title: "Kennst du das?",
      body: "Ein böser Gedanke schießt dir in den Kopf. Einfach so aus dem Nichts. Deine Brust wird eng, dein Kopf malt ein Worst-Case-Szenario nach dem anderen, du starrst wie versteinert in die Leere und kommst in eine Gedankenspirale, die niemals enden zu scheint. In solchen Momenten hilft eine simple Wahrheit:",
    },
    {
      title: "Nicht alles, was Du denkst, ist Realität.",
      body: "Während Dein Unterbewusstsein ein Meister darin ist, Worst-Case-Szenarios auszumalen, hat es ein entscheidenes Manko: Dein Unterbewusstsein kann Realität und Fiktion nicht unterscheiden. Sprich, die Horror-Filme, die sich beim Overthinking in deinem Kopf abspielen, mögen sich echt anfühlen — sind es aber fast nie. Wie Matthew McConaughey mal sinngemäß sagte: „I have had many crises in my life. Most of them never happened.“",
    },
    {
      title: "Was dich erwartet",
      body: "Die Folgende Übung soll Dir dabei helfen, dieses Manko deines Unterbewusstseins zu händeln und aus deinen Gedankenspiralen auszubrechen. Ziel ist es zuerst durch ein sogenanntes „Pattern Interrupt“ dein Unterbewusstsein bei seiner kreativen Schwarzmalerei zu unterbrechen indem du von 5 runterzählts oder laut „Stop“ sagst (ja das meine ich ernst). Dann gräbst du dich mit ein paar ehrlichen „Warum?“-Fragen zur Wurzel des Problems durch, das deine Gedankenspirale ausgelöst hat. Am Ende der Frage-Runde werde ich dich dazu challengen, das Problem aus einer anderen Perspektive zu betrachten, die der Schwarzmalerei deines Unterbewusstseins entgegensteht. Auf der Basis sollst Du dann in der Lage sein, einen klaren nächsten Schritt festzulegen, wie Du mit dem Problem umgehst - und zwar gemessen daran, was das Problem wirklich ist, nicht gemessen daran was Dein Unterbewusstsein dir vormacht. Bist Du bereit?",
    },
  ],
  "things-got-messy": [
    {
      title: "Es ist passiert.",
      body: "Du arbeitest an deinen neuen inneren Regeln — und dann kommt so ein Tag: Du hast wieder Ja gesagt, obwohl du Nein meintest. Oder du hast Nein gesagt und dich danach schrecklich gefühlt. Jetzt sitzt da dieses nagende Gefühl in deiner Brust: Schuld. Bevor du dich dafür verurteilst, lohnt sich ein genauer Blick. Denn Schuld ist nicht gleich Schuld:",
    },
    {
      title: "Gesunde und ungesunde Schuld.",
      body: "Gesunde Schuld ist ein Kompass. Sie meldet sich, wenn du gegen deine eigenen Werte gehandelt hast — und sie zeigt dir den Weg zur Wiedergutmachung. Sie will nicht, dass du dich schlecht fühlst, sondern dass du etwas in Ordnung bringst. Ungesunde Schuld dagegen ist ein altes People-Pleaser-Programm: Sie bestraft dich ausgerechnet dann, wenn du dich geschützt hast — für ein Nein, eine Grenze, eine ehrliche Meinung. Sie zeigt nicht auf einen Fehler, sondern auf eine alte Regel, die du gar nicht mehr leben willst.",
    },
    {
      title: "Was dich erwartet",
      body: "Du erzählst kurz, was passiert ist — mehr musst du nicht tun. Dein Begleiter schaut dann mit dir drauf: Welche Art von Schuld hat sich da vermutlich gemeldet? Welche zwei Regeln haben in dir gerungen? Und er wirft einen Blick in dein Bill of Rights: Vielleicht hast du dir das passende Recht schon gegeben und musst dich nur daran erinnern — vielleicht formulieren wir zusammen ein neues, das dich beim nächsten Mal schützt. Das Ganze dauert 2–3 Minuten. Bist du dabei?",
    },
  ],
};

/**
 * Liefert die Intro-Karten für ein Rezept anhand seines Slugs.
 * Gibt null zurück, wenn für den Slug keine Intro hinterlegt ist.
 */
export function getRecipeIntro(slug: string): IntroCard[] | null {
  return RECIPE_INTROS[slug] ?? null;
}
