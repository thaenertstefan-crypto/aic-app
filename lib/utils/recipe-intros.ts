/**
 * Intro-Sequenzen für die Rezepte (Schritt 6.10).
 *
 * Beim ersten Besuch eines Rezepts werden diese Karten als durchklickbare
 * Einleitung gezeigt; danach dieselben Inhalte als aufklappbarer
 * "Worum geht's?"-Block. Die Texte hier sind erste Entwürfe in der warmen,
 * informellen AIC-Stimme ("du") und können frei editiert werden — die
 * Komponente bleibt generisch.
 *
 * Slugs gegen lib/utils/recipes.ts geprüft: "values", "bill-of-rights" und
 * "overthinking" sind die aktuell verfügbaren Rezepte. Weitere Rezepte
 * (wants, saying-no, shadow) bekommen ihre Intro, sobald sie verfügbar sind.
 */

export type IntroCard = { title: string; body: string };
export type RecipeIntro = { slug: string; cards: IntroCard[] };

export const RECIPE_INTROS: Record<string, IntroCard[]> = {
  values: [
    {
      title: "Warum das wichtig ist",
      body: "Es gibt eine Frage, die über fast jede Entscheidung in deinem Leben mitbestimmt, ob sie sich später gut oder falsch anfühlt: Was sind eigentlich deine Werte? Werte sind dein innerer Kompass — die Dinge, die dir wirklich wichtig sind, oft ohne dass du es bewusst merkst.",
    },
    {
      title: "Die Idee dahinter",
      body: "Wir gehen das wie ein kleines Experiment an: Du stellst eine Hypothese auf (5 Werte, die du vermutest), sammelst eine Woche lang Daten über dich selbst und wertest dann aus. Test, Auswerten, Verbessern — wie ein Wissenschaftler, nur dass das Forschungsobjekt du bist.",
    },
    {
      title: "Was dich erwartet",
      body: "Zuerst wählst du 5 Werte. Dann begleitest du dich 7 Tage mit kurzen Tagebuch-Einträgen. Am Ende schaust du, welche Muster sich zeigen. Nimm dir pro Tag nur 2–3 Minuten — mehr braucht es nicht.",
    },
  ],
  "bill-of-rights": [
    {
      title: "Warum das wichtig ist",
      body: "Vieles, was wir tun, läuft automatisch ab — gesteuert von inneren Regeln, die wir uns irgendwann unbewusst angeeignet haben. „Sag bloß nicht Nein.“ „Mach keinen Aufstand.“ Solche Regeln können dich leise klein halten.",
    },
    {
      title: "Die Idee dahinter",
      body: "Die gute Nachricht: Regeln sind nur Regeln — und die kannst du neu schreiben. Was du dir selbst zugestehst, ist deine Entscheidung. Genau das machen wir hier: aus einschränkenden inneren Regeln werden bewusste, stärkende Grundrechte.",
    },
    {
      title: "Was dich erwartet",
      body: "Du reflektierst kurz, wo dich eine innere Regel zuletzt zurückgehalten hat. Dann formulierst du daraus deine eigenen Rechte — mindestens drei, um dein persönliches Bill of Rights abzuschließen. Sie begleiten dich danach jeden Tag.",
    },
  ],
  overthinking: [
    {
      title: "Kennst du das?",
      body: "Dein Kopf malt ein Worst-Case-Szenario nach dem anderen, die Brust wird eng, und du kommst keinen Schritt voran. Eine echte Gedankenspirale.",
    },
    {
      title: "Die Idee dahinter",
      body: "Hier hilft eine simple Wahrheit: Dein Unterbewusstsein kann Realität und Fiktion nicht unterscheiden. Die Horror-Filme in deinem Kopf fühlen sich echt an — sind es aber fast nie. Wie Matthew McConaughey mal sinngemäß sagte: „Ich hatte viele Krisen in meinem Leben. Die meisten sind nie passiert.“",
    },
    {
      title: "Was dich erwartet",
      body: "In wenigen Schritten brichst du die Spirale: erst ein bewusster Stopp, dann gräbst du dich mit ein paar ehrlichen „Warum?“-Fragen zur Wurzel durch, und am Ende triffst du eine klare, faktenbasierte Entscheidung. Dauert nur ein paar Minuten.",
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
