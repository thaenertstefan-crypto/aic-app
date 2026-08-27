"use client";

import { useState, useMemo, useTransition } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LogbookArt } from "@/components/brand/logbook-art";
import { JournalDetailDialog } from "@/components/journal/journal-detail-dialog";
import { getJournalPage } from "@/app/(app)/journal/actions";
import { getFilterTabs, getJournalConfig } from "@/lib/utils/journal-chrome";
import type { JournalListItem } from "@/lib/utils/journal-format";
import { formatDateDE } from "@/lib/utils/date";

type Props = {
  initialEntries: JournalListItem[];
  initialHasMore: boolean;
};

export function JournalHub({ initialEntries, initialHasMore }: Props) {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState<JournalListItem | null>(
    null,
  );
  const [entries, setEntries] = useState<JournalListItem[]>(initialEntries);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();

  const filterTabs = useMemo(() => getFilterTabs(), []);

  const filteredEntries = useMemo(() => {
    if (selectedFilter === "all") return entries;
    return entries.filter((e) => {
      // Match by recipe_slug directly
      if (e.recipe_slug === selectedFilter) return true;
      // Also check via template config
      const config = getJournalConfig(e.template_type);
      return config.recipeSlug === selectedFilter;
    });
  }, [entries, selectedFilter]);

  const filterLabel =
    selectedFilter === "all"
      ? "Alle"
      : filterTabs.find((t) => t.value === selectedFilter)?.label ??
        selectedFilter;

  const isEmpty = filteredEntries.length === 0;

  // Zwei verschiedene Leeren: „das Logbuch ist noch leer" (kein einziger
  // Eintrag) und „diese Abfrage hat keine Treffer". `isEmpty` allein
  // unterscheidet sie nicht — dafür steht hier der Blick auf den ungefilterten
  // Bestand (KAN-55).
  const hasEntries = entries.length > 0;

  function loadMore() {
    const last = entries[entries.length - 1];
    if (!last) return;
    startTransition(async () => {
      const { items, hasMore: more } = await getJournalPage(last.created_at);
      setEntries((prev) => [...prev, ...items]);
      setHasMore(more);
    });
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
      <Tabs value={selectedFilter} onValueChange={setSelectedFilter}>
        {hasEntries && (
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
        <div className={hasEntries ? "mt-4" : undefined}>
          {/* ---- Entry count ---- */}
          {!isEmpty && (
            <p className="mb-3 text-xs text-muted-foreground">
              {filteredEntries.length}{" "}
              {filteredEntries.length === 1 ? "Eintrag" : "Einträge"}
            </p>
          )}

          {/* ---- Card list ---- */}
          {!isEmpty && (
            <div className="space-y-3">
              {filteredEntries.map((entry) => {
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
          {!isEmpty && hasMore && (
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={loadMore}
              disabled={isPending}
            >
              {isPending ? "Lädt …" : "Mehr laden"}
            </Button>
          )}

          {/* ---- Das leere Journal ---- */}
          {/* Oben das Motiv der Fläche — das Logbuch, die Sammlung statt der
              Einheit (KAN-55). Kein CTA-Band: der goldene „Neuer Eintrag“ steht
              schon über den Tabs, das Band ist erfüllt, bevor es gezeichnet
              wird. Damit lädt das leere Journal zum Schreiben ein, nicht zum
              Üben — was als Nächstes zu üben wäre, sagt die Empfehlungskarte
              auf dem Dashboard. */}
          {!hasEntries && (
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
              Eine ruhige Zeile, ohne Motiv, ohne CTA, ohne Gold (KAN-55). */}
          {hasEntries && isEmpty && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              In „{filterLabel}“ liegt noch nichts.
            </p>
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
