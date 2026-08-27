import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ALL_FILTER,
  advanceJournalHub,
  initialJournalHub,
  journalCursor,
  loadingFilter,
  recipeSlugForFilter,
  type JournalHubState,
  type JournalPage,
} from "./hub-state.ts";
import type { JournalListItem } from "../utils/journal-format.ts";

/** Ein Listen-Item mit sprechender id; `created_at` trägt den Cursor. */
function item(id: string, createdAt = `2026-08-${id.padStart(2, "0")}T10:00:00Z`): JournalListItem {
  return {
    id,
    template_type: "daily_value",
    recipe_slug: "values",
    entry_date: "2026-08-27",
    created_at: createdAt,
    preview: `Eintrag ${id}`,
  };
}

function page(
  items: JournalListItem[],
  { hasMore = false, total = items.length }: { hasMore?: boolean; total?: number } = {},
): JournalPage {
  return { items, hasMore, total };
}

/** Der Zustand direkt nach dem Tippen auf einen anderen Tab. */
function switchedTo(filter: string): JournalHubState {
  return advanceJournalHub(
    initialJournalHub(page([item("1"), item("2")], { hasMore: true, total: 42 })),
    { type: "filterChosen", filter },
  );
}

describe("recipeSlugForFilter", () => {
  it("liefert für „Alle“ keine Bedingung", () => {
    assert.equal(recipeSlugForFilter(ALL_FILTER), undefined);
  });

  it("reicht jeden anderen Tab-Wert als recipe_slug durch", () => {
    assert.equal(recipeSlugForFilter("bill-of-rights"), "bill-of-rights");
  });
});

describe("journalCursor", () => {
  it("ist der älteste geladene Eintrag", () => {
    const state = initialJournalHub(page([item("1"), item("2")]));
    assert.equal(journalCursor(state), item("2").created_at);
  });

  it("ist undefined, solange nichts geladen ist", () => {
    assert.equal(journalCursor(switchedTo("wants")), undefined);
  });
});

/**
 * Ein Zustand, in dem JEDES Feld benutzt ist. Bewusst als Literal und nicht
 * über Übergänge gebaut: `loadingMore` und `failed` schließen einander im
 * echten Ablauf aus, hier müssen aber beide verschmutzt sein. Wer dem Zustand
 * ein Feld hinzufügt, muss es hier setzen — sonst schlägt der Test unten an.
 */
function dirtyState(): JournalHubState {
  return {
    filter: ALL_FILTER,
    items: [item("1"), item("2")],
    total: 42,
    hasMore: true,
    loading: false,
    loadingMore: true,
    failed: true,
  };
}

describe("Filterwechsel — Zurücksetzen ist eine Stelle, keine Feldliste", () => {
  it("nimmt aus dem alten Filter nichts mit", () => {
    const dirty = dirtyState();
    const fresh = loadingFilter("wants");

    const next = advanceJournalHub(dirty, { type: "filterChosen", filter: "wants" });

    // Kein Feld überlebt: der Filter selbst kommt aus dem Ereignis, alles
    // andere gehört der alten Abfrage. Deshalb hier keine Ausnahmeliste.
    for (const key of Object.keys(fresh) as (keyof JournalHubState)[]) {
      // Erst die Testdaten prüfen — ein Feld, das gar nicht verschmutzt ist,
      // könnte den Wechsel unbemerkt überleben.
      assert.notDeepEqual(
        dirty[key],
        fresh[key],
        `Testdaten unvollständig: ${key} ist im Ausgangszustand nicht verschmutzt`,
      );
      assert.deepEqual(next[key], fresh[key], `${key} leckt in den neuen Filter`);
    }
  });

  it("lässt keinen Cursor des alten Filters stehen", () => {
    assert.equal(journalCursor(switchedTo("wants")), undefined);
  });

  it("ist ein No-op, wenn derselbe Tab noch einmal getippt wird", () => {
    const state = initialJournalHub(page([item("1")], { total: 42 }));
    assert.equal(advanceJournalHub(state, { type: "filterChosen", filter: ALL_FILTER }), state);
  });

  it("nimmt die Gesamtzahl des neuen Filters aus der Antwort, nicht aus der Liste", () => {
    const loaded = advanceJournalHub(switchedTo("wants"), {
      type: "pageLoaded",
      filter: "wants",
      page: page([item("9")], { hasMore: true, total: 80 }),
    });

    assert.equal(loaded.total, 80, "80 im Bestand, obwohl nur einer geladen ist");
    assert.equal(loaded.items.length, 1);
    assert.equal(loaded.loading, false);
  });

  it("ersetzt die Liste, statt anzuhängen", () => {
    const loaded = advanceJournalHub(switchedTo("wants"), {
      type: "pageLoaded",
      filter: "wants",
      page: page([item("9")]),
    });

    assert.deepEqual(
      loaded.items.map((e) => e.id),
      ["9"],
    );
  });
});

describe("Wettlauf beim schnellen Tab-Tippen", () => {
  it("verwirft die Antwort eines abgewählten Filters", () => {
    // A → B, dann trifft die Antwort für A ein.
    const inB = advanceJournalHub(switchedTo("wants"), {
      type: "filterChosen",
      filter: "shadow",
    });

    const spaet = advanceJournalHub(inB, {
      type: "pageLoaded",
      filter: "wants",
      page: page([item("9")], { total: 9 }),
    });

    assert.equal(spaet, inB, "die späte Antwort darf die Liste nicht anfassen");
    assert.equal(spaet.loading, true, "und den Ladezustand nicht beenden");
  });

  it("verwirft die zweite Antwort desselben Filters, auf die niemand mehr wartet", () => {
    const einmal = advanceJournalHub(switchedTo("wants"), {
      type: "pageLoaded",
      filter: "wants",
      page: page([item("9")], { total: 9 }),
    });

    const nochmal = advanceJournalHub(einmal, {
      type: "pageLoaded",
      filter: "wants",
      page: page([item("9")], { total: 9 }),
    });

    assert.equal(nochmal, einmal);
  });

  it("hängt keine Folgeseite an, die zu einem anderen Filter gehört", () => {
    const wartetAufMehr = advanceJournalHub(
      initialJournalHub(page([item("1")], { hasMore: true, total: 42 })),
      { type: "moreRequested" },
    );
    const inB = advanceJournalHub(wartetAufMehr, {
      type: "filterChosen",
      filter: "wants",
    });

    const spaet = advanceJournalHub(inB, {
      type: "pageAppended",
      filter: ALL_FILTER,
      page: page([item("2")]),
    });

    assert.deepEqual(spaet.items, [], "die Seite von „Alle“ darf nicht in „Wants“ landen");
  });
});

describe("Mehr laden", () => {
  it("hängt die Folgeseite an und schreibt hasMore fort", () => {
    const wartet = advanceJournalHub(
      initialJournalHub(page([item("1")], { hasMore: true, total: 42 })),
      { type: "moreRequested" },
    );
    assert.equal(wartet.loadingMore, true);

    const angehaengt = advanceJournalHub(wartet, {
      type: "pageAppended",
      filter: ALL_FILTER,
      page: page([item("2")], { hasMore: false, total: 42 }),
    });

    assert.deepEqual(
      angehaengt.items.map((e) => e.id),
      ["1", "2"],
    );
    assert.equal(angehaengt.hasMore, false);
    assert.equal(angehaengt.loadingMore, false);
    assert.equal(angehaengt.total, 42, "die Gesamtzahl bleibt die Gesamtzahl");
  });

  it("fragt nicht nach, solange es nichts mehr gibt", () => {
    const state = initialJournalHub(page([item("1")], { hasMore: false, total: 1 }));
    assert.equal(advanceJournalHub(state, { type: "moreRequested" }), state);
  });

  it("fragt nicht doppelt nach", () => {
    const wartet = advanceJournalHub(
      initialJournalHub(page([item("1")], { hasMore: true, total: 42 })),
      { type: "moreRequested" },
    );
    assert.equal(advanceJournalHub(wartet, { type: "moreRequested" }), wartet);
  });

  it("fragt nicht nach, während der Filterwechsel noch lädt", () => {
    const laedt = switchedTo("wants");
    assert.equal(advanceJournalHub(laedt, { type: "moreRequested" }), laedt);
  });
});

describe("Wenn die Abfrage nicht durchkommt", () => {
  it("beendet das Warten und sagt es, statt im Skelett zu hängen", () => {
    const laedt = switchedTo("wants");
    assert.equal(laedt.loading, true);

    const kaputt = advanceJournalHub(laedt, { type: "loadFailed", filter: "wants" });

    assert.equal(kaputt.loading, false, "sonst steht das Skelett für immer");
    assert.equal(kaputt.failed, true);
  });

  it("beendet auch ein gescheitertes Mehr-laden", () => {
    const wartet = advanceJournalHub(
      initialJournalHub(page([item("1")], { hasMore: true, total: 42 })),
      { type: "moreRequested" },
    );

    const kaputt = advanceJournalHub(wartet, { type: "loadFailed", filter: ALL_FILTER });

    assert.equal(kaputt.loadingMore, false);
    assert.equal(kaputt.failed, true);
    assert.deepEqual(kaputt.items.map((e) => e.id), ["1"], "das Geladene bleibt stehen");
  });

  it("verwirft den Fehler eines abgewählten Filters", () => {
    const inB = advanceJournalHub(switchedTo("wants"), {
      type: "filterChosen",
      filter: "shadow",
    });

    assert.equal(advanceJournalHub(inB, { type: "loadFailed", filter: "wants" }), inB);
  });

  it("führt über „Nochmal“ zurück ins Laden desselben Filters", () => {
    const kaputt = advanceJournalHub(switchedTo("wants"), {
      type: "loadFailed",
      filter: "wants",
    });

    const nochmal = advanceJournalHub(kaputt, { type: "retryRequested" });

    assert.deepEqual(nochmal, loadingFilter("wants"));
  });

  it("lässt den Fehler mit der nächsten geglückten Antwort verschwinden", () => {
    const kaputt = advanceJournalHub(switchedTo("wants"), {
      type: "loadFailed",
      filter: "wants",
    });
    const nochmal = advanceJournalHub(kaputt, { type: "retryRequested" });

    const geglueckt = advanceJournalHub(nochmal, {
      type: "pageLoaded",
      filter: "wants",
      page: page([item("9")], { total: 9 }),
    });

    assert.equal(geglueckt.failed, false);
  });
});

describe("Die ruhige Zeile", () => {
  it("hat als Bedingung eine echte Null im Bestand — nicht eine leere Seite", () => {
    const leer = advanceJournalHub(switchedTo("shadow"), {
      type: "pageLoaded",
      filter: "shadow",
      page: page([], { hasMore: false, total: 0 }),
    });

    assert.equal(leer.total, 0);
    assert.equal(leer.hasMore, false, "keine Sackgasse: es gibt nichts zu blättern");
    assert.equal(leer.loading, false);
  });
});
