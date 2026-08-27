"use client";

import { useMemo, useReducer, useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LogbookArt } from "@/components/brand/logbook-art";
import { JournalDetailDialog } from "@/components/journal/journal-detail-dialog";
import { JournalListSkeleton } from "@/components/journal/journal-list-skeleton";
import { getJournalPage } from "@/app/(app)/journal/actions";
import {
  ALL_FILTER,
  advanceJournalHub,
  initialJournalHub,
  journalCursor,
  recipeSlugForFilter,
  type JournalPage,
} from "@/lib/journal/hub-state";
import { getFilterTabs, getJournalConfig } from "@/lib/utils/journal-chrome";
import type { JournalListItem } from "@/lib/utils/journal-format";
import { formatDateDE } from "@/lib/utils/date";

type Props = {
  /** Die erste, ungefilterte Seite — vom Server geladen. */
  initialPage: JournalPage;
};

export function JournalHub({ initialPage }: Props) {
  const [state, dispatch] = useReducer(
    advanceJournalHub,
    initialPage,
    initialJournalHub,
  );
  const [selectedEntry, setSelectedEntry] = useState<JournalListItem | null>(
    null,
  );

  const filterTabs = useMemo(() => getFilterTabs(), []);

  const filterLabel =
    state.filter === ALL_FILTER
      ? "Alle"
      : filterTabs.find((t) => t.value === state.filter)?.label ?? state.filter;

  // Ob das Logbuch überhaupt etwas enthält, entscheidet die ERSTE, ungefilterte
  // Antwort — und nur sie. Bewusst außerhalb des Reducers: an den gefilterten
  // Bestand gehängt, würde ein Tab ohne Treffer die Tabs wegnehmen, mit denen
  // man wieder herauskäme. KAN-63 hängt an dieser einen Zeile.
  const journalIsEmpty = initialPage.total === 0;

  // Jeder Ladeweg braucht sein eigenes `catch`. Der Wurf, den die Action
  // ausdrücklich stehen lässt, erreicht die Fehlergrenze der Route von hier
  // aus **nicht** — sie liegt oberhalb, der Aufruf kommt aus einem Ereignis
  // darunter. Am Dev- wie am Prod-Build geprüft: ohne `catch` (auch in
  // `startTransition`) bleibt `loading` stehen und das Skelett steht für
  // immer. Genau die Sackgasse, gegen die dieses Ticket geschrieben ist.
  function loadFirstPage(filter: string) {
    void getJournalPage({ recipeSlug: recipeSlugForFilter(filter) }).then(
      // Der Reducer verwirft die Antwort, wenn inzwischen ein anderer Tab
      // gewählt wurde — deshalb reist der Filter mit, für den sie geholt wurde.
      (page) => dispatch({ type: "pageLoaded", filter, page }),
      () => dispatch({ type: "loadFailed", filter }),
    );
  }

  function selectFilter(filter: string) {
    if (filter === state.filter) return;
    dispatch({ type: "filterChosen", filter });
    loadFirstPage(filter);
  }

  function retry() {
    dispatch({ type: "retryRequested" });
    loadFirstPage(state.filter);
  }

  function loadMore() {
    const cursor = journalCursor(state);
    if (!cursor || state.loadingMore) return;
    const filter = state.filter;
    dispatch({ type: "moreRequested" });
    void getJournalPage({
      recipeSlug: recipeSlugForFilter(filter),
      beforeCreatedAt: cursor,
    }).then(
      (page) => dispatch({ type: "pageAppended", filter, page }),
      () => dispatch({ type: "loadFailed", filter }),
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* ---- Filter tabs ---- */}
      {/* Sie verschwinden, solange nichts zu filtern ist (KAN-63): sieben Tabs,
          die alle ins Leere führen, sind Möbel — und sie sind die vertikale
          Fracht, an der „ein leerer Zustand scrollt nie" bei 375 px scheitert.
          Nebenwirkung, und zwar die gewollte: die ruhige Zeile weiter unten ist
          damit nur noch erreichbar, wenn es Einträge gibt — also genau dann,
          wenn sie das Richtige sagt. */}
      <Tabs value={state.filter} onValueChange={selectFilter}>
        {!journalIsEmpty && (
          <TabsList
            // data-e2e: der E2E-Account hat Einträge, also müssen die Tabs da
            // sein. Der Marker fängt die eine Art, wie diese Bedingung kaputt
            // geht — verdreht —, und die ließe sich sonst nicht von „hat
            // gerendert" unterscheiden.
            data-e2e="journal-tabs"
            variant="line"
            className="w-full justify-start overflow-x-auto overflow-y-hidden overscroll-x-contain [touch-action:pan-x]"
          >
            {filterTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-1.5"
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        )}

        {/* Single content panel — we manage rendering ourselves */}
        {/* Der Abstand gehört den Tabs; ohne sie fällt er weg, sonst schiebt er
            die Spalte, deren Höhe sich an ihrer Oberkante berechnet. */}
        <div className={journalIsEmpty ? undefined : "mt-4"}>
          {/* ---- Der Tab-Wechsel lädt ---- */}
          {/* Zeilen-Maßstab, nicht Bühne: hier tauscht sich eine Liste aus, es
              wartet niemand auf die KI. Deshalb dieselben Karten-Platzhalter
              wie in `journal/loading.tsx` und ausdrücklich KEIN Funkenflug
              (KAN-52 ist der Maßstab für das andere Warten). */}
          {state.loading && (
            // data-e2e: nach dem Vorbild von `funkenflug` ein reiner
            // reject-Marker. Der E2E-Lauf tippt keine Tabs an; was er zusichern
            // kann, ist die andere Richtung — im Ruhezustand darf dieser
            // Ladezustand nicht stehen, sonst ist er in die fertige Liste
            // geleckt.
            <div data-e2e="journal-liste-laedt">
              <JournalListSkeleton />
            </div>
          )}

          {/* ---- Die Abfrage kam nicht durch ---- */}
          {/* Derselbe ruhige Maßstab wie die Zeile ohne Treffer — und ein Weg
              heraus: der Knopf holt die erste Seite des aktiven Filters neu.
              Die Tabs stehen ohnehin daneben, der Knopf erspart nur den Umweg
              über einen fremden Tab und zurück. */}
          {state.failed && (
            <div data-e2e="journal-liste-fehler" className="py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Das hat gerade nicht geklappt.
              </p>
              <Button variant="outline" className="mt-4" onClick={retry}>
                Nochmal versuchen
              </Button>
            </div>
          )}

          {!state.loading && !state.failed && (
            <>
              {/* ---- Entry count ---- */}
              {/* Die Zahl aus dem Bestand, nicht die der geladenen Zeilen
                  (KAN-69) — unter jedem Tab und auch unter „Alle". */}
              {state.total !== null && state.total > 0 && (
                <p className="mb-3 text-xs text-muted-foreground">
                  {state.total} {state.total === 1 ? "Eintrag" : "Einträge"}
                </p>
              )}

              {/* ---- Card list ---- */}
              {state.items.length > 0 && (
                <div className="space-y-3">
                  {state.items.map((entry) => {
                    const config = getJournalConfig(entry.template_type);
                    const Icon = config.icon;
                    const preview = entry.preview;

                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setSelectedEntry(entry)}
                        aria-label={`Eintrag „${config.label}“ vom ${formatDateDE(entry.entry_date)} öffnen`}
                        className="block w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <Card
                          size="sm"
                          className="transition-colors hover:bg-muted/40"
                        >
                          <CardContent className="pt-(--card-spacing)">
                            <div className="flex items-start gap-3">
                              {/* Icon */}
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <Icon className="size-4 text-primary" />
                              </div>

                              {/* Text */}
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <CardTitle>{config.label}</CardTitle>
                                  <span className="shrink-0 text-xs text-muted-foreground">
                                    {formatDateDE(entry.entry_date)}
                                  </span>
                                </div>

                                {preview ? (
                                  <p className="line-clamp-2 text-sm text-muted-foreground">
                                    {preview}
                                  </p>
                                ) : (
                                  <p className="text-sm italic text-muted-foreground">
                                    Keine Vorschau verfügbar
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ---- Load more ---- */}
              {/* Hängt jetzt an `hasMore` allein. Vorher stand davor noch „die
                  gefilterte Liste ist nicht leer" — und genau das machte den
                  leeren Filter zur Sackgasse: der einzige Knopf, der zu den
                  Treffern geführt hätte, wurde ausgerechnet dann nicht
                  gezeichnet (KAN-69). */}
              {state.hasMore && (
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={loadMore}
                  disabled={state.loadingMore}
                >
                  {state.loadingMore ? "Lädt …" : "Mehr laden"}
                </Button>
              )}

              {/* ---- Das leere Journal ---- */}
              {/* Oben das Motiv der Fläche — das Logbuch, die Sammlung statt der
                  Einheit (KAN-55). Kein CTA-Band: der goldene „Neuer Eintrag“ steht
                  schon über den Tabs, das Band ist erfüllt, bevor es gezeichnet
                  wird. Damit lädt das leere Journal zum Schreiben ein, nicht zum
                  Üben — was als Nächstes zu üben wäre, sagt die Empfehlungskarte
                  auf dem Dashboard. */}
              {journalIsEmpty && (
                // data-e2e: der Gegenpol zu `journal-tabs`. Der bestückte
                // E2E-Account darf das Logbuch NICHT zeigen — zusammen sichern die
                // beiden Marker beide Richtungen derselben Bedingung ab. Den
                // leeren Zustand selbst sieht der Lauf naturgemäß nie; dass er
                // nicht ins volle Journal leckt, sieht er sehr wohl.
                <div data-e2e="journal-logbuch">
                  <EmptyState
                    motiv={<LogbookArt />}
                    satz="Dein Logbuch wartet auf seinen ersten Eintrag."
                    nachsatz="Was ist dir heute durch den Kopf gegangen?"
                  />
                </div>
              )}

              {/* ---- Abfrage ohne Treffer ---- */}
              {/* Keine Leer-Grammatik: der Nutzer wollte nachsehen, nicht anfangen.
                  Eine ruhige Zeile, ohne Motiv, ohne CTA, ohne Gold (KAN-55).
                  Sie steht seit KAN-69 auf einer Null aus dem Bestand, nicht auf
                  einer leeren Seite — sie sagt also wirklich, was sie behauptet,
                  und es gibt dann auch nichts mehr, wohin sie den Weg versperren
                  könnte. */}
              {!journalIsEmpty && state.total === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  In „{filterLabel}“ liegt noch nichts.
                </p>
              )}
            </>
          )}
        </div>
      </Tabs>

      {/* ---- Detail dialog ---- */}
      <JournalDetailDialog
        entry={selectedEntry}
        open={!!selectedEntry}
        onOpenChange={(open) => {
          if (!open) setSelectedEntry(null);
        }}
      />
    </div>
  );
}
