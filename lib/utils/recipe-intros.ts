/**
 * Intro-Sequenzen für die Rezepte (Schritt 6.10).
 *
 * Beim ersten Besuch eines Rezepts werden diese Karten als durchklickbare
 * Einleitung gezeigt; danach dieselben Inhalte als aufklappbarer
 * "Worum geht's?"-Block. Die Texte hier sind erste Entwürfe in der warmen,
 * informellen AIC-Stimme ("du") und können frei editiert werden — die
 * Komponente bleibt generisch.
 *
 * Slugs gegen lib/utils/recipes.ts geprüft: "values", "wants",
 * "bill-of-rights", "overthinking", "things-got-messy", "saying-no" und
 * "shadow" — damit haben alle Rezepte ihre Intro.
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
  wants: [
    {
      title: "Wessen Ziele jagst du eigentlich?",
      body: "Der Job, der auf LinkedIn gut aussieht. Das Hobby, das gerade alle anfangen. Die Reise, die man „mal gemacht haben muss“. Wir werden täglich mit Zielen bombardiert, die wir wollen sollen — von Werbung, Trends und den Leuten um uns herum. Psychologen nennen das mimetisches Begehren: Wir übernehmen ganz automatisch die Wünsche unseres Umfelds, ohne es zu merken. Das Problem: Wenn andere bestimmen, was du willst — wer bestimmt dann, wer du bist?",
    },
    {
      title: "Du bist, was du willst.",
      body: "Was du wirklich willst, entscheidet viel mehr als deine nächste Essensbestellung: Es bestimmt, welche Ziele du dir setzt, mit welchen Menschen du dich umgibst, wofür du morgens aufstehst — und damit, wer du wirst. Die gute Nachricht: Deine echten, intrinsischen Wants sind längst da. Sie liegen nur begraben unter dem Berg an Erwartungen, den die Welt auf dir abgeladen hat. Wir müssen sie nur freilegen.",
    },
    {
      title: "Yin & Yang: die zwei ehrlichen Fragen",
      body: "Statt der langweiligen Frage „Was magst du denn so?“ stellen wir zwei ehrlichere: Yin — Wofür nimmst du freiwillig Mühsal in Kauf? Denn wofür du bereit bist zu leiden, das ist dir wirklich wichtig. Und Yang — Was bringt dich in Flow? Bei welchen Aktivitäten vergisst du die Zeit, blendest die Welt aus und gehst ganz in dem auf, was du tust? Deine Antworten auf diese zwei Fragen verraten mehr über deine echten Wants als jede Grübelnacht.",
    },
    {
      title: "Was dich erwartet",
      body: "Zuerst machst du das Yin-&-Yang-Audit: zwei Fragen, ehrliche Antworten, etwa 10 Minuten. Daraus destilliere ich gemeinsam mit dir deine Wants-Hypothesen — verknüpft mit den Werten, die du schon entdeckt hast. Aber eine Hypothese ist nur eine Vermutung. Deshalb kommt danach der wichtigste Teil: Little Bets. Kleine, risikofreie Experimente — eine Schnupperstunde, ein Event, ein Abend — mit denen du im echten Leben testest, ob das, was du zu wollen glaubst, wirklich das ist, was du willst. Bist du dabei?",
    },
  ],
  "bill-of-rights": [
    {
      title: "Da war doch was.",
      body: "Du hast heute Ja gesagt, obwohl du eigentlich Nein wolltest. Oder etwas nicht gesagt, obwohl du es gedacht hast. Oder wieder dieser Moment hinterher, in dem du dich fragst: Warum habe ich das nicht einfach gesagt? Das ist kein Zufall. Das ist kein Charakterfehler. Das ist ein innerer Autopilot, den wir alle in uns tragen, der für uns Entscheidungen trifft, ob wir wollen oder nicht.",
    },
    {
      title: "Deine inneren Regeln.",
      body: "Psychologen nennen diese automatischen Muster Heuristiken: vorgefertigte innere Regeln, die dein Verhalten steuern, bevor du überhaupt bewusst entschieden hast: „Sag bloß nicht Nein.“, „Mach keinen Aufstand.“, „Die anderen dürfen niemals schlecht über mich denken.“ Solche Regeln können dich leise kleinhalten. Das Gute daran: Regeln sind nur Regeln. Und die kann man umschreiben. Genau das machen wir jetzt.",
    },
    {
      title: "Was dich erwartet",
      body: "Das Ziel dieser Übung ist es, jene inneren Regeln herauszufinden, die dich ausbremsen. Die dich automatisiert Ja sagen lassen, obwohl du Nein wolltest, oder die dich schweigen lassen obwohl du hättest sprechen wollen. Und dann schreiben wir diese Regeln um. Und zwar nicht irgendwie, sondern in ein persönliches Recht, das du dir selbst verleihst: „Ich habe das Recht zu…“. Zusammen ergeben diese Rechte deine persönliche Bill of Rights, die dir fortan als Erinnerung dient, was du dir erlauben und nach welchen inneren Regeln du leben willst. Und da die Entdeckung der inneren Regeln, nach denen man leben will, nicht ganz trivial ist, findest du in dieser Übung eine entscheidende Funktion:",
    },
    {
      title: "Vorschlag generieren - Wie du deine Regeln entdeckst",
      body: "Am Ende Deiner bill of rights findest du die „Vorschlag generieren“-Funktion: eine Hilfe, mit der du in Ruhe Situationen reflektierst, in denen du einen inneren Konflikt gespürt hast. Denn die Regeln, nach denen du leben willst, zeigen sich häufig genau in solchen Konflikt-Momenten. Stell dir vor: Dein Manager fragt dich kurz vor Feierabend, ob du noch eine extra Aufgabe erledigen kannst, die heute fertig werden muss — und du haderst, schon in deinen Laufschuhen vor dem Laptop sitzend, ob du Ja oder Nein sagst. Auf Basis dieser Situationsbeschreibung helfe ich dir dann, herauszufinden welche zwei inneren Regeln in diesem Moment gegeneinander kämpfen, z.B.: „Stell deinen Chef immer zufrieden.“ gegen „Ich habe das Recht, meiner Freizeit dieselbe Wichtigkeit zuzumessen wie meiner Arbeit — und nach Feierabend meine persönlichen Ziele wie eine bessere Fitness zu priorisieren.“ Und dann stell ich dir die Frage: Nach welcher Regel willst du leben? Und du entscheidest. Bist du dabei?",
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
  "saying-no": [
    {
      title: "Kennst du das?",
      body: "„Klar, mach ich!“ — das Ja ist schon draußen, bevor du überhaupt nachgedacht hast. Auf dem Heimweg merkst du dann: Du wolltest eigentlich Nein sagen. Schon wieder. Und jetzt sitzt du da mit einem vollen Kalender, einem leeren Akku und diesem leisen Frust auf dich selbst. Das liegt nicht daran, dass du zu nett bist. Es liegt daran, dass Nein sagen eine Fähigkeit ist — und die hat dir einfach noch niemand beigebracht.",
    },
    {
      title: "Wenn es kein „Hell yes!“ ist, ist es ein Nein.",
      body: "Diese simple Regel (nach Dr. Aziz Gazipura) ist dein neuer Kompass: Spürst du bei einer Anfrage kein klares, freudiges „Hell yes!“, dann ist die ehrliche Antwort ein Nein. Das ist kein Egoismus — im Gegenteil: Dein Ja ist nur so viel wert wie dein Nein. Wer zu allem Ja sagt, sagt in Wahrheit zu nichts richtig Ja. Jedes ehrliche Nein macht Platz für die Dinge und Menschen, die dir wirklich wichtig sind.",
    },
    {
      title: "Die vier Schichten eines guten Neins",
      body: "Ein gutes Nein ist kein hartes Nein — es hat vier Schichten: Erstens: „Nein.“ ist ein vollständiger Satz — du schuldest niemandem einen Rechtfertigungs-Marathon. Zweitens: keine Entschuldigungen — ein Nein ist kein Vergehen, du füllst nur zuerst dein eigenes Glas. Drittens: Wärme zuerst — „Danke, dass du an mich denkst“ nimmt dem Nein die Härte, ohne es aufzuweichen. Und viertens: das sanfte Nein — beginne mit „Leider …“ und lass das Wort „aber“ weg, denn es radiert deine Wärme wieder aus.",
    },
    {
      title: "Was dich erwartet",
      body: "Du hast zwei Wege: Bei einer echten Anfrage, die gerade auf deinem Tisch liegt, formulieren wir dein Nein gemeinsam — Wort für Wort, bis du es abschicken kannst. Oder du trainierst im Übungsmodus an realistischen Szenarien, so oft du magst. In beiden Fällen lege ich deinen Entwurf auf den Blueprint: Welche Schichten sitzen schon, wo verschenkst du Kraft? Du bekommst eine verbesserte Version zum Anpassen — und wenn dein Nein eine Grenze zeigt, die in dein Bill of Rights gehört, schlage ich dir ein neues Recht vor. Das Ganze dauert 5–10 Minuten. Bist du dabei?",
    },
  ],
  shadow: [
    {
      title: "Da ist etwas, das du nicht zeigst.",
      body: "Der Kollege, der sich mit deiner Arbeit schmückt. Die Freundin, die immer nur nimmt. Der Satz von damals, der immer noch brennt. Du bist doch nicht nachtragend, du bist doch nicht so — also lächelst du und schluckst es runter. Das Problem: Runtergeschluckte Wut verschwindet nicht. Sie sammelt sich, wächst im Dunkeln und frisst dich leise von innen auf — als Groll, als Erschöpfung, als dieses Gefühl, ständig kurz vorm Platzen zu sein.",
    },
    {
      title: "Deine Schattenseite darf mal raus.",
      body: "In dir wohnt nicht nur die vernünftige, freundliche Version von dir. Da ist auch ein Teil, der wütend ist, verletzt, ungerecht, kleinlich — Psychologen nennen ihn das Es, den inneren Urmenschen. Dieser Teil ist nicht dein Feind. Er braucht nur ab und zu ein Ventil: einen sicheren Ort, an dem er alles sagen darf, ungefiltert und unzensiert. Denn was ausgesprochen ist, verliert seine Macht — und oft zeigt sich dahinter erst das eigentliche Problem.",
    },
    {
      title: "Hier liest niemand mit. Versprochen.",
      body: "Dieses Ventil ist der privateste Ort der App. Was du hier schreibst oder sagst, bekommt die KI nie zu sehen — kein Feedback, keine Analyse, kein Mitlesen. Und du entscheidest am Ende selbst, was mit deinen Worten passiert: privat behalten, mit Schloss im Journal, nur für dich. Oder verbrennen — dann wird nichts gespeichert, kein einziges Zeichen. Rauslassen und loslassen.",
    },
    {
      title: "Was dich erwartet",
      body: "Zwei Wege, such dir aus, was heute passt: Das Shadow Journal ist eine leere, dunkle Seite — kipp alles drauf, was sich angestaut hat, so hässlich und unfertig es sein darf. Oder du gehst auf einen Rage Walk: Raus an die Luft (oder im Kreis um den Küchentisch), und sprich deinen Groll laut aus, wo dich niemand hört — die App begleitet dich mit einem Timer und sanften Fragen. Danach entscheidest du: behalten oder verbrennen. Das Ganze dauert so lange, wie es eben braucht. Bereit?",
    },
  ],
  "things-got-messy": [
    {
      title: "Es ist passiert.",
      body: "Du arbeitest an deinen neuen inneren Regeln — und dann kommt so ein Tag: Du hast wieder Ja gesagt, obwohl du Nein meintest. Oder du hast Nein gesagt und dich danach schrecklich gefühlt. Jetzt sitzt da dieses nagende Gefühl in deiner Brust: Schuld. Doch bevor du dich dafür verurteilst, lass uns einmal die Lupe auf deinen inneren Tumult richten. Denn Schuld ist nicht gleich Schuld:",
    },
    {
      title: "Gesunde und ungesunde Schuld.",
      body: "Schuld kann gesund oder ungesund sein. Wenn sie sich meldet, weil du gegen deine eigenen Werte gehandelt hast, z.B. weil du schon wieder ja statt nein zu mehr Arbeit gesagt hast, und deshalb dein Feierabendbierchen mit Freunden absagen musstest, ist sie gesund. Denn in dem Fall ist sie ein Zeichen, dass du dich gegen etwas entschieden hast, dass dir eigentlich wichtig ist, z.B. Zeit mit deinen Freunden zu verbringen. Gesunde Schuld will nicht unbedingt, dass du dich schlecht fühlst, sondern dass du entlang der inneren Regeln lebst, die im Einklang mit deinen Werten sind. Ungesunde Schuld dagegen ist ein Gefühl von Strafe, wenn du etwas eigentlich etwas gutes für dich selbst getan hast, z.B. wenn du dich dazu durchgerungen hast, Nein zu sagen, eine von dir gesetzte Grenze einzuhalten, eine unangenehme aber ehrliche Meinung zu äußern und dafür vermeintlich jemanden enttäuscht hast. Sie zeigt nicht auf einen Fehler, sondern, dass du eine alte Regel gebrochen hast, die du eigentlich gar nicht mehr leben willst z.B. Sag niemlas nein, um niemanden zu enttäuschen oder Verschweige deine Meinung, wenn sie jemanden verletzen könnte.",
    },
    {
      title: "Was dich erwartet",
      body: "Die folgende Übung ist im Prinzip ganz einfach. Du erzählst kurz von einer Situation, in der du dich schuldig gefühlt hast — mehr musst du nicht tun. Und ich schaue dann gemeinsam mit dir drauf: Welche Art von Schuld hat sich da vermutlich gemeldet? Welche zwei Regeln haben in dir miteinander gerungen? Und wie passt deine Bill of Rights dazu? Vielleicht hast du in der von dir beschriebenen Situation eins deiner Rechte verteidigt (Super!), und musst dich nur daran erinnern, dass du etwas getan hast, dass du dir erlauben darfst, ohne dich dafür entschuldigen zu müssen — vielleicht zeigt die Situation, dass dir noch etwas anderes wichtig ist und wir formulieren zusammen ein neues Recht, das dir zukünftig hilft noch mehr entlang deiner Werte zu leben. Das Ganze dauert 2–3 Minuten. Bist du dabei?",
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
