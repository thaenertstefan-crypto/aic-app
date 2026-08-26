/**
 * Die Bewegungs-Grammatik der App, Teil 1: **der Übergang** (KAN-30).
 *
 * Ein Übergang trägt von A nach B und dauert, was das Design sagt. Es gibt
 * genau zwei Sorten, und die Prüffrage ist immer dieselbe:
 *
 * > Überlebt ein Gegenstand die Reise?
 *
 * - **Ja → Flug.** Ein Icon, ein Stern, ein Funke reist mit. Ein Flug läuft in
 *   beide Richtungen; ein Hinflug ohne Rückflug behauptet eine Beziehung, die
 *   der Rückweg widerruft. Flüge inszenieren sich selbst, über ein Overlay im
 *   gemeinsamen Layout (die iOS-Standalone-PWA rendert die
 *   View-Transitions-API nicht).
 * - **Nein → Einblenden.** ~200 ms Opacity, kein Slide, kein Crossfade. Ein
 *   Slide behauptet eine Richtung, die es zwischen zwei Nav-Tabs nicht gibt.
 *
 * Eine dritte Antwort gibt es nicht, und eine Sonderfall-Liste auch nicht.
 * Dieses Modul hält deshalb nur die eine Tabelle: **welche Routenwechsel einem
 * Flug gehören.** Alles, was nicht drinsteht, blendet ein.
 *
 * Warum überhaupt eine Tabelle? Weil der generische Übergang stillhalten muss,
 * solange ein Flug läuft: beide blenden Opacity, und zwei Blenden übereinander
 * multiplizieren ihre Alphas — der Flug verschwände hinter seiner eigenen
 * Blende.
 */

/** Trailing Slash weg, damit `/booster` und `/booster/` dasselbe sind. */
function normalisiere(pfad: string): string {
  return pfad.length > 1 && pfad.endsWith("/") ? pfad.slice(0, -1) : pfad;
}

/**
 * Flüge, die in **beide** Richtungen laufen — je ein Paar.
 *
 * „Der Sturz": der Blick reist von den Wants hinunter in die Sternschmiede und
 * wieder hinauf (`components/wants/warp-transition.tsx`).
 */
const PAARE: ReadonlyArray<readonly [string, string]> = [
  ["/me/wants", "/me/wants/schmiede"],
];

/**
 * „Der Wurf": das Wetter-Motiv der angetippten Zelle fliegt vom Hub in die
 * Übung und landet dort unter dem Header
 * (`components/booster/booster-flug.tsx`). Als Präfix statt als Paar, weil jede
 * der fünf Übungen dieselbe Bewegung erbt.
 *
 * Warum hier trotzdem nur der **Hinweg** steht, obwohl der Flug seit KAN-60 in
 * beide Richtungen läuft: diese Tabelle beantwortet nicht „fliegt hier etwas?",
 * sondern „inszeniert sich dieser Wechsel schon selbst?".
 *
 * - **Hinweg:** ja. Die Hub-Bühne blendet aus, die Sub-Page blendet mit ihren
 *   eigenen `einblenden`-Flächen ein. Käme der generische Übergang dazu, lägen
 *   auf der Sub-Page zwei Blenden übereinander.
 * - **Rückweg:** nein. Der Hub hat keine eigene Blende — er ist das Ziel und
 *   soll stehen, wenn der Klon landet. Den Wechsel der Seite trägt deshalb der
 *   generische Übergang. Dass er dem Klon nichts anhaben kann, liegt daran,
 *   dass der Klon im Portal am `body` hängt und nicht in `main`.
 *
 * So bleibt auch der Direkt-Load-Fall richtig, ganz ohne Sonderregel: wer ohne
 * Abflug auf einer Sub-Page steht, fliegt nicht zurück — und bekommt genau den
 * generischen Übergang, der hier ohnehin läuft.
 */
const BOOSTER_HUB = "/booster";

/**
 * Trägt ein Flug diesen Routenwechsel? Dann hält der generische Übergang
 * still — der Flug ist die Bewegung.
 */
export function traegtEinFlug(von: string, nach: string): boolean {
  const a = normalisiere(von);
  const b = normalisiere(nach);
  if (a === b) return false;

  const paar = PAARE.some(
    ([eins, zwei]) => (a === eins && b === zwei) || (a === zwei && b === eins),
  );
  if (paar) return true;

  return a === BOOSTER_HUB && b.startsWith(`${BOOSTER_HUB}/`);
}
