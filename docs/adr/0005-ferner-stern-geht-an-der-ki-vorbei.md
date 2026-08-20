# Der ferne Stern geht an der KI vorbei

Die Sternensuche destillierte bislang **alle** Sterne aus dem Modell, auch die fernen — und
verlor sie dabei still. Seit KAN-34 baut der Client jeden fernen Stern selbst: ein ausgefülltes
Antwortfeld der Tagtraum-Frage ergibt genau einen Entwurf, dessen `text` der Wortlaut des
Nutzers ist. Die KI liefert dazu nur noch den `title`.

Der Grund ist die Bauart, nicht der einzelne Fehler. Auf dem Weg vom Formular zum fernen Stern
hatten sich vier Engstellen angesammelt, von denen jede einmal vernünftig war und jede still
Daten fraß: das zeilenweise Zusammenfügen der Antwortfelder beim Speichern, eine Kappung bei
2000 Zeichen vor dem Modellaufruf, das „maximal 3" samt Urteil über „klar" im System-Prompt und
eine Obergrenze von 9 beim Einlesen der Antwort. Ein Prompt ist eine Bitte, keine Garantie.
Läuft der Wortlaut nie durch das Modell, kann kein späterer Prompt-Regress ihn mehr kürzen,
zusammenlegen oder für unklar halten.

## Verworfen

**Den Prompt reparieren** („aus jedem Feld genau einen, keine Obergrenze") und die KI auf dem
Weg lassen. Billiger im Moment, aber es schreibt die Garantie wieder an die Stelle, an der sie
schon einmal verloren ging — und die Feldgrenzen kann ein Prompt gar nicht wiederherstellen.

## Folgen

- **Nahe Sterne bleiben destilliert.** Dort ist das Muster hinter vielen Antworten der Wert,
  nicht der Wortlaut. Die Regel gilt ausdrücklich nur für die fernen.
- **Ein Ausfall kostet nur noch die Namen.** Fällt der Destillier-Aufruf aus, existieren die
  fernen Sterne trotzdem — sie sind vom Client gebaut, ihnen fehlt bloß der Titel. Vorher hieß
  ein Fehlschlag: gar keine fernen Sterne.
- **`distance: "fern"` wird zur Herkunftsmarke.** Siehe [CONTEXT.md](../../CONTEXT.md), Stern.
- Die Antwortfelder werden als Liste gespeichert, nicht mehr als ein zusammengefügter String.
  Alte Einträge ohne Liste sind der Normalfall der Lesefunktion, kein Sonderfall — ein
  Migrations-Backfill findet nicht statt.
