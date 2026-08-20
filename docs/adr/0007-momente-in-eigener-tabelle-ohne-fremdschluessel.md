# Momente liegen in einer eigenen Tabelle, ohne Fremdschlüssel

Ein **Moment** ist ein Beleg an einem **Stern**. Er liegt seit KAN-36 in einer eigenen Tabelle
`star_moments`, deren `star_id` eine schlichte `text`-Spalte ist — **kein Fremdschlüssel**.

Das sieht aus wie ein vergessener Constraint und ist keiner. Ein Stern ist kein Datensatz: die
Tabelle `wants` hat genau eine Zeile je Nutzer, und die Sterne stehen darin als JSONB-Array
(`wants.wants`). Eine Stern-ID ist ein vom Client erzeugter String **innerhalb** eines
JSONB-Arrays; darauf kann Postgres nichts referenzieren. Wer einen Fremdschlüssel will, muss
zuerst die Sterne normalisieren — ein Umbau, der die halbe Übung anfasst und den ein
Beleg-Feature nicht rechtfertigt.

## Verworfen

**Momente in den Stern hineinlegen** (`WantItem.moments` als verschachteltes Array). Der lose
Verweis verschwindet damit ganz, und ein gelöschter Stern nimmt seine Momente von selbst mit —
das ist die ehrliche Stärke dieser Variante. Sie scheitert am Schreibweg: die Übung postet bei
jedem Speichern **den ganzen Himmel** als ein JSON-Feld. Jeder neue Moment lüde alle Sterne und
alle übrigen Momente mit hoch, und weil der Merge auf Stern-Ebene greift und nicht darunter,
überschrieben sich zwei parallel eingetragene Momente am selben Stern. Ein Preis, der bei jedem
Eintrag anfällt, auf einem Handy, für immer — gegen einen Waisen-Fall, der billig zu ertragen
ist.

## Folgen

- **Waisen sind erlaubt.** Wird ein Stern gelöscht, bleiben seine Momente als Zeilen zurück. Das
  ist unsichtbarer Müll, kein Defekt: Momente werden **nie** über Sterne hinweg gelesen, jede
  Abfrage lautet „die Momente dieses Sterns". Der Löschpfad räumt sie best-effort mit weg; tut
  er es einmal nicht, merkt es niemand. Wer je eine Fläche baut, die Momente global auflistet,
  bricht genau diese Annahme — dann braucht es zuerst eine Aufräum-Garantie.
- **IDs kommen vom Client.** Stern und Momente entstehen im selben Schreibvorgang, aber in zwei
  Anweisungen. Weil beide Seiten ihre IDs mitbringen, ist jede Wiederholung nach einem
  Teilfehler idempotent — nichts verdoppelt sich.
- **`origin` ist intern.** Ein Moment, der beim Anlegen des Sterns aus einem Antwortfeld
  übernommen wurde (`"audit"`), unterscheidet sich für den Nutzer in nichts von einem selbst
  eingetragenen (`"own"`): gleiche Darstellung, gleich änderbar, gleich löschbar. Die Marke
  existiert, damit die Oberfläche erkennen kann, ob an einem Stern noch **kein** eigener Moment
  hängt.
