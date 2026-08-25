"use client";

import { useEffect, useReducer, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  advanceMomentWall,
  canSubmitMomentWall,
  editedMomentId,
  initialMomentWall,
  momentDateLabel,
  type MomentComposer,
} from "@/lib/recipes/wants/moment-wall";
import { MOMENT_MAX, type StarMoment } from "@/lib/recipes/wants/moments";

/**
 * Die **Belegwand** unter einem Stern (KAN-59, Variante A aus KAN-37).
 *
 * Die Momente stehen untereinander in der Fokus-Spalte, ältester oben,
 * **vollständig und ungekürzt**, getrennt durch Haarlinien statt in Kästen —
 * das Beschreibungs-Panel darüber ist schon eine Fläche, ein Kasten je Moment
 * wäre eine Karte in der Karte. Am Fuß liegt dauerhaft eine ruhige gestrichelte
 * Zeile, die an Ort und Stelle aufklappt: kein Sheet, kein Dialog, der Stern
 * bleibt im Blick.
 *
 * **Warum kein `line-clamp`:** Das Abschneide-Problem der Sternentitel überträgt
 * sich hier ausdrücklich nicht. Ein Titel muss in einen engen Kartenslot, ein
 * Beleg hat die ganze Spaltenbreite und darf sie brauchen — auch alle 800
 * Zeichen.
 *
 * **Bearbeiten und Löschen** (in KAN-59 offen gelassen) sind dieselbe Geste wie
 * das Hinzufügen: die Datumszeile eines Moments klappt an genau seiner Stelle in
 * denselben Composer auf, mit dem Löschen als leisem Fuß darin. Damit bezahlt
 * die Ruhe der Wand nichts — keine dauerhaft sichtbare Icon-Reihe, keine
 * zusätzliche Zeile, und die Fläche kennt nur eine einzige Öffnen-Bewegung.
 *
 * **Die Herkunft (`origin`) wird nie gerendert** (ADR-0007): ein aus der
 * Sternensuche übernommener Moment sieht aus wie ein selbst eingetragener und
 * ist gleich änderbar und löschbar. Sichtbar zu markieren hieße „diesen hier
 * hast du nicht wirklich erlebt“ — die falsche Botschaft an einer Wand aus
 * Belegen, zumal es die eigenen Worte der Person sind.
 *
 * Der Zustand liegt als reines Modul in `lib/recipes/wants/moment-wall.ts`.
 */
export function MomentWall({
  moments,
  distance,
  onAdd,
  onUpdate,
  onDelete,
}: {
  /** Die Momente dieses Sterns, ältester zuerst (so liest sie `readMoments`). */
  moments: StarMoment[];
  /** Die Weite des Sterns — sie entscheidet nur den Satz im leeren Zustand. */
  distance: "nah" | "fern";
  /** Legt an; gibt die warme Fehlermeldung zurück oder `null`. */
  onAdd: (text: string) => Promise<string | null>;
  onUpdate: (id: string, text: string) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
}) {
  const [state, dispatch] = useReducer(advanceMomentWall, null, initialMomentWall);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  const editingId = editedMomentId(state);
  const open = state.composer.kind !== "closed";
  // Identität der offenen Zeile: wechselt sie, springt der Fokus mit — auch
  // beim direkten Sprung von einem Moment auf den nächsten, bei dem `open`
  // durchgehend true bleibt.
  const openKey = composerKey(state.composer);

  // Fokus in das frisch aufgeklappte Feld — **`preventScroll`**: die Fokus-Ebene
  // ist ein per Portal an `document.body` gehängtes Overlay, ein gewöhnliches
  // `focus()` scrollt die Seite dahinter ans Dokumentende (KAN-59, Punkt 8).
  useEffect(() => {
    if (!open) return;
    fieldRef.current?.focus({ preventScroll: true });
  }, [open, openKey]);

  // Escape gehört, solange eine Zeile offen ist, **dieser Zeile** — nicht der
  // Fokus-Ebene darüber. Ohne das schlösse ein Tastendruck den ganzen Stern und
  // nähme den getippten Beleg mit; dieselbe Rangfolge, die die Fokus-Ebene für
  // ihren eigenen Edit-Modus schon kennt.
  //
  // `capture: true` läuft vor dem Listener aus `useDialogFocus` (beide hängen am
  // window, Capture-Phase kommt dort zuerst), `stopPropagation` hält ihn an.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      dispatch({ type: "cancel" });
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  async function submit() {
    if (!canSubmitMomentWall(state)) return;
    const text = state.draft.trim();
    dispatch({ type: "submit" });
    const error = editingId
      ? await onUpdate(editingId, text)
      : await onAdd(text);
    dispatch(error ? { type: "failed", message: error } : { type: "done" });
  }

  async function remove() {
    if (!editingId) return;
    if (!state.confirmDelete) {
      dispatch({ type: "askDelete" });
      return;
    }
    dispatch({ type: "submit" });
    const error = await onDelete(editingId);
    dispatch(error ? { type: "failed", message: error } : { type: "done" });
  }

  /** Die eine aufgeklappte Zeile — für die Add-Zeile wie für einen Moment. */
  function composer() {
    return (
      <div className="flex w-full flex-col gap-2 py-2">
        <Textarea
          ref={fieldRef}
          value={state.draft}
          onChange={(e) => dispatch({ type: "type", text: e.target.value })}
          rows={3}
          maxLength={MOMENT_MAX}
          placeholder="Was ist passiert?"
          // Bewusst **nicht** `disabled` während des Speicherns: ein Feld, das
          // unter den Fingern deaktiviert wird, wirft auf iOS die Tastatur weg
          // — bei einem Fehlschlag stünde der Beleg dann ohne Tastatur da. Den
          // Doppel-Abschluss sperrt `canSubmitMomentWall` über `saving`.
          className="resize-y"
          aria-label="Was ist passiert?"
        />
        {state.error && (
          <p className="text-left text-sm text-destructive" aria-live="polite">
            {state.error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={state.saving}
            onClick={() => dispatch({ type: "cancel" })}
          >
            Abbrechen
          </Button>
          {/* Die eine Kerze dieser Fläche: Belege stehen über dem Umbenennen,
              darum ist „Festhalten“ gold und „Bearbeiten“ am Stern Outline. */}
          <Button
            className="flex-1"
            disabled={!canSubmitMomentWall(state)}
            onClick={() => void submit()}
          >
            Festhalten
          </Button>
        </div>
        {editingId && (
          <Button
            variant="ghost"
            className="w-full gap-2 text-destructive hover:text-destructive"
            disabled={state.saving}
            onClick={() => void remove()}
          >
            <Trash2 className="size-4" />
            {state.confirmDelete ? "Wirklich löschen?" : "Moment löschen"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <section className="flex w-full flex-col gap-3 text-left" data-e2e="moment-wall">
      {moments.length > 0 && (
        <div className="flex items-baseline justify-between gap-3 border-b border-foreground/12 pb-1">
          <h4 className="font-heading text-base font-medium text-foreground">
            Momente
          </h4>
          <span className="text-xs tabular-nums text-muted-foreground">
            {moments.length}
          </span>
        </div>
      )}

      {/* Leer-Grammatik (KAN-32) im Kleinen: **zwei** Bänder, nicht drei — das
          Motiv-Band fällt weg, weil der Stern schon 64 px groß darüber steht und
          ein zweites Motiv eine Dublette wäre. Bleibt: Satz, dann die Zeile.
          Ein ferner Stern ist dauerhaft leer, und das ist kein Mangel — er ist
          ein Ziel, das noch vor dir liegt. */}
      {moments.length === 0 && (
        <p className="px-2 pt-1 text-center text-sm leading-relaxed text-balance text-muted-foreground">
          {distance === "fern"
            ? "Diesen Stern greifst du noch. Wenn du ihn erreichst, steht hier, woran du es gemerkt hast."
            : "Diesen Stern lebst du schon. Halt fest, woran du es gemerkt hast."}
        </p>
      )}

      <div className="flex flex-col">
        {moments.map((moment) => {
          const date = momentDateLabel(moment.created_at);
          if (editingId === moment.id) {
            return (
              // `first:pt-0.5` spiegelt das `first:pt-1.5` der ruhenden Zeile
              // (dort plus `py-2` des Composers): ohne das rutscht der oberste
              // Moment beim Aufklappen um ein paar Pixel nach unten.
              <div
                key={moment.id}
                className="border-t border-foreground/12 first:border-t-0 first:pt-0.5"
              >
                {composer()}
              </div>
            );
          }
          return (
            <div
              key={moment.id}
              className="flex w-full flex-col gap-1.5 border-t border-foreground/12 py-3.5 first:border-t-0 first:pt-1.5"
            >
              {/* **Die Datumszeile ist der Knopf**, nicht der Beleg. Der ganze
                  Absatz als Tap-Ziel wäre die chromefreiere Fläche, kostet aber
                  genau das, wofür diese Wand da ist: bei 800 Zeichen ist der
                  halbe Screen ein Knopf, der Text lässt sich nicht markieren,
                  und ein Tap beim Lesen öffnet den Editor. Eine Erinnerung will
                  wiedergelesen werden. Ein leises Wort in einer Zeile, die
                  ohnehin steht — keine neue Zeile, keine Icon-Reihe. */}
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: "edit", id: moment.id, text: moment.text })
                }
                aria-label={
                  date ? `Moment vom ${date} bearbeiten` : "Moment bearbeiten"
                }
                className="-my-1 inline-flex w-fit items-center gap-1.5 py-1 text-xs tracking-wide text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
              >
                {date && (
                  <>
                    <span className="tabular-nums">{date}</span>
                    <span aria-hidden>·</span>
                  </>
                )}
                <span>bearbeiten</span>
              </button>
              {/* Ungekürzt — kein `line-clamp`, kein „weiterlesen“. `break-words`
                  wie beim Sternentitel: 800 Zeichen ohne ein einziges Leerzeichen
                  (eine eingefügte URL genügt) schöben die Spalte sonst seitlich
                  aus den 375 px heraus. */}
              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground">
                {moment.text}
              </p>
            </div>
          );
        })}
      </div>

      {state.composer.kind === "new" ? (
        composer()
      ) : (
        // Leise und gestrichelt, **nicht** gold: golden ist erst „Festhalten“ im
        // geöffneten Zustand. Eine goldene Zeile am Fuß zöge die ganze Wand ins
        // Erledigen — und eine Erinnerung will wiedergelesen, nicht abgehakt
        // werden.
        <Button
          variant="ghost"
          className="w-full justify-start gap-2.5 border border-dashed border-border text-muted-foreground hover:text-foreground"
          onClick={() => dispatch({ type: "compose" })}
        >
          {/* Auch das Plus erbt die stille Farbe der Zeile. Der Prototyp hatte
              es golden; die Regel im Ticket ist die engere und gewinnt —
              golden ist in dieser Fläche nur „Festhalten“. */}
          <Plus className="size-4" />
          Was ist passiert?
        </Button>
      )}
    </section>
  );
}

/** Identität der offenen Zeile — die Add-Zeile und jeder Moment je eine eigene. */
function composerKey(composer: MomentComposer): string {
  return composer.kind === "edit" ? `edit:${composer.id}` : composer.kind;
}
