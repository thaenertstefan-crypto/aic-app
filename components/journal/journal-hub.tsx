"use client";

import { useState, useMemo, useTransition } from "react";
import { Notebook } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { JournalDetailDialog } from "@/components/journal/journal-detail-dialog";
import { getJournalPage } from "@/app/(app)/journal/actions";
import {
  getFilterTabs,
  getJournalConfig,
  formatDateDE,
  type JournalListItem,
} from "@/lib/utils/journal";
import { cn } from "@/lib/utils";

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
      <Tabs value={selectedFilter} onValueChange={setSelectedFilter}>
        <TabsList
          variant="line"
          className="w-full justify-start overflow-x-auto"
        >
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Single content panel — we manage rendering ourselves */}
        <div className="mt-4">
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
                  <Card
                    key={entry.id}
                    size="sm"
                    onClick={() => setSelectedEntry(entry)}
                    className={cn(
                      "cursor-pointer transition-shadow hover:shadow-md",
                    )}
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

          {/* ---- Empty state ---- */}
          {isEmpty && (
            <EmptyState
              icon={Notebook}
              title="Noch keine Einträge"
              description={
                selectedFilter === "all"
                  ? "Starte ein Rezept, um deine ersten Reflexionen festzuhalten. Jeder Eintrag ist ein Schritt zu mehr Klarheit."
                  : `Noch keine Einträge in "${filterLabel}". Starte ein Rezept, um deine ersten Reflexionen zu sammeln.`
              }
              action={{ href: "/recipes", label: "Zu den Rezepten" }}
            />
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
