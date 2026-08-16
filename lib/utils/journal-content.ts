/**
 * `template_type` als geprüfte Diskriminante.
 *
 * In der Datenbank ist `template_type` ein nackter `string` und `content` ein
 * nackter `Json`. Welcher String welchen Shape bedeutet, stand bisher nur in
 * Kommentaren — und an jeder Lesestelle als `as MessyMomentContent`, also als
 * Behauptung ohne Prüfung. Dieses Modul macht die Zuordnung zu einer
 * diskriminierten Union und prüft sie zur Laufzeit.
 *
 * Es gibt GENAU EINEN Ausfall: das Union-Glied `"unknown"`. Es wirft nicht und
 * wirft nichts weg — es trägt den rohen `template_type` und den rohen `content`
 * weiter, damit der Aufrufer generisch rendern kann. `getContentSections` tut
 * heute schon genau das, wenn es keinen Formatter für einen `template_type`
 * gibt; dieses Glied ist derselbe Fall, nur benannt.
 *
 * Die Regel im Detail: **Pflichtfelder entscheiden, optionale Felder
 * degradieren.** Fehlt ein Pflichtfeld oder hat es den falschen Typ, ist der
 * ganze Eintrag `"unknown"` — der Shape ist dann nicht der, für den er sich
 * ausgibt. Ein optionales Feld mit falschem Typ verschwindet dagegen einfach,
 * der Eintrag bleibt lesbar.
 *
 * Felder, die in `lib/types/db-json.ts` gar nicht deklariert sind, überleben
 * die Verengung nicht. Das ist Absicht: der deklarierte Shape ist ab hier die
 * Wahrheit, und eine Lücke fällt beim Lesen auf statt still weiterzuleben.
 * Genau so sind die drei Alt-Felder von `overthinking` in den Typ gekommen.
 *
 * Nichts in dieser Datei zählt Werte selbst auf. Die zehn `template_type` und
 * jede Enum-Liste werden aus den Typen von `db-json.ts` bzw. `journal.ts`
 * abgeleitet, und die Tabellen sind so getypt, dass ein fehlender Wert den
 * Build bricht. Eine nachgebaute Werteliste würde bei einer Erweiterung
 * weitertypechecken und den neuen Wert still verwerfen — das wäre derselbe
 * lautlose Datenverlust, den dieses Modul verhindern soll.
 *
 * Bewusst ohne Wert-Imports: alles kommt als `import type` herein und
 * verschwindet beim Type-Stripping. So bleibt die Datei mit purem Node prüfbar
 * (`npm test`), obwohl `journal.ts` nebenan lucide-react zieht.
 *
 * Zwei Richtungen, zwei Regeln:
 * - **Lesen** (`readJournalContent`) prüft und verengt. Was nicht deklariert
 *   ist, gibt es beim Lesen nicht.
 * - **Schreiben** (`patchJournalContent`) prüft nur, was NEU hineingeht, und
 *   reicht den Bestand roh durch. Ein Merge, der auf dem geprüften Shape
 *   aufsetzt, würde jedes undeklarierte Feld beim nächsten Speichern
 *   wegschreiben — derselbe lautlose Datenverlust, nur auf der Schreibseite.
 */

import type { Json } from "../supabase/database.types.ts";
import type {
  BillOfRightsContent,
  DailyValueContent,
  FreeEntryContent,
  LittleBetContent,
  MessyMomentContent,
  OverthinkingContent,
  SayingNoChecklist,
  SayingNoContent,
  ShadowContent,
  ValueEvalContent,
  YinYangContent,
} from "../types/db-json.ts";
import type { TemplateType } from "./journal.ts";

/** Ein rohes JSON-Objekt aus einer JSONB-Spalte: Schlüssel bekannt, Werte nur
 *  als `Json`. Alles in diesem Modul beginnt hier — und `patchJournalContent`
 *  endet hier, weshalb `Json` und nicht `unknown` der Werttyp ist: das Ergebnis
 *  muss ohne Cast in die Spalte zurückgeschrieben werden können. */
type JsonObject = { [key: string]: Json | undefined };

/* ------------------------------------------------------------------ */
/*  Die Union                                                         */
/* ------------------------------------------------------------------ */

/** Ein Eintrag, dessen Shape geprüft ist. `template` ist die Diskriminante —
 *  ein `switch` darüber verengt `content` ohne jede Behauptung. */
export type KnownJournalContent =
  | { template: "daily_value"; content: DailyValueContent }
  | { template: "value_eval"; content: ValueEvalContent }
  | { template: "yin_yang"; content: YinYangContent }
  | { template: "little_bet"; content: LittleBetContent }
  | { template: "bill_of_rights"; content: BillOfRightsContent }
  | { template: "messy_moment"; content: MessyMomentContent }
  | { template: "overthinking"; content: OverthinkingContent }
  | { template: "saying_no"; content: SayingNoContent }
  | { template: "shadow"; content: ShadowContent }
  | { template: "free"; content: FreeEntryContent };

/**
 * Der einzige Ausfall: unbekannter `template_type` ODER ein `content`, dem ein
 * Pflichtfeld fehlt. Beides ist derselbe Befund — „ich kann für diesen Shape
 * nicht geradestehen“ — und wird deshalb nicht unterschieden.
 */
export type UnknownJournalContent = {
  template: "unknown";
  /** Der rohe `template_type`; leer, wenn es nicht einmal ein String war. */
  templateType: string;
  /** Der rohe `content`, unverändert. Nicht-Objekte werden zu `{}`. */
  content: JsonObject;
};

/** Elf Glieder, erschöpfend per `switch` behandelbar. */
export type JournalContent = KnownJournalContent | UnknownJournalContent;

/** Das Union-Glied zu einem `template_type` — spart die `Extract`-Zeile an
 *  jedem der zehn Leser. */
type Member<K extends TemplateType> = Extract<
  KnownJournalContent,
  { template: K }
>;

/**
 * Der `content`-Shape zu einem `template_type`. Damit hängt an jeder Stelle,
 * die einen Eintrag verarbeitet, nur noch der Schlüssel — der Shape kommt aus
 * `db-json.ts` nach. Eine Änderung dort weckt den Compiler hier.
 */
export type JournalContentFor<K extends TemplateType> = Member<K>["content"];

/* ------------------------------------------------------------------ */
/*  Eingang                                                           */
/* ------------------------------------------------------------------ */

/**
 * Verengt eine `journal_entries`-Zeile auf ihren geprüften Shape.
 *
 * Nimmt beide Felder als `unknown`, weil genau das aus der Datenbank kommt —
 * der Aufrufer soll nichts vorher behaupten müssen.
 *
 * @returns nie `null`, wirft nie. Im Zweifel das Glied `"unknown"`.
 */
export function readJournalContent(
  templateType: unknown,
  content: unknown,
): JournalContent {
  const source = toJsonObject(content);
  const raw = typeof templateType === "string" ? templateType : "";

  if (!isKnownTemplate(raw)) {
    return { template: "unknown", templateType: raw, content: source };
  }

  return (
    READERS[raw](source) ?? {
      template: "unknown",
      templateType: raw,
      content: source,
    }
  );
}

/**
 * Kennt dieses Modul den `template_type`? Sagt nichts über den `content` —
 * dafür ist `readJournalContent` zuständig.
 */
export function isKnownTemplate(value: string): value is TemplateType {
  return Object.hasOwn(READERS, value);
}

/*
 * Kein `readEntryAs(template, …)`-Kurzschluss hier, obwohl vier Routen dasselbe
 * Muster fahren (`readJournalContent` + Vergleich der Diskriminante gegen ein
 * Literal). Der Versuch scheitert am Typsystem, nicht am Aufwand:
 * `JournalContentFor<K>` ist über `Extract` definiert, also ein aufgeschobener
 * Conditional Type. Innerhalb eines generischen Rumpfs fällt `member.content`
 * auf die Constraint zurück — die Vereinigung ALLER zehn Shapes — und ließe
 * sich nur per Cast zurückholen. Ein Cast ist aber genau das, was dieses Modul
 * abschafft.
 *
 * Auflösbar wäre es, indem die Paarung als Mapped Type statt als Union
 * geschrieben wird. Das ist eine Umstellung an der Wurzel dieses Moduls für
 * vier eingesparte Zeilen — die Duplikation ist hier der billigere Posten.
 * Am Aufrufer ist `template` ein Literal, dort greift die Verengung normal.
 */

/* ------------------------------------------------------------------ */
/*  Ausgang                                                           */
/* ------------------------------------------------------------------ */

/**
 * Ein Merge-Update auf `content`: legt `patch` über den bestehenden Stand und
 * gibt das fertige Objekt für die Spalte zurück.
 *
 * `template` steht nur da, um `patch` an seinen Shape zu binden — zur Laufzeit
 * passiert damit nichts. Genau das ist der Gewinn: `patchJournalContent(
 * "yin_yang", …, { ai_wants })` schlägt fehl, sobald sich `ai_wants` in
 * `db-json.ts` ändert.
 *
 * Der Bestand wird bewusst NICHT verengt, sondern roh durchgereicht. Ein Merge
 * auf dem geprüften Shape würde jedes Feld wegschreiben, das (noch) nicht in
 * `db-json.ts` steht — beim Lesen ist dieses Vergessen Absicht, beim
 * Zurückschreiben wäre es Datenverlust.
 *
 * `undefined` im Patch heißt „nicht setzen“, nicht „löschen“: ein Feld auf
 * `undefined` zu spreaden würde es aus dem JSON kippen und damit den
 * bestehenden Wert still entfernen.
 */
export function patchJournalContent<K extends TemplateType>(
  template: K,
  current: unknown,
  patch: Partial<JournalContentFor<K>>,
): Json {
  const merged = toJsonObject(current);

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    setJsonKey(merged, key, value);
  }

  return merged;
}

/* ------------------------------------------------------------------ */
/*  Dispatcher                                                        */
/* ------------------------------------------------------------------ */

/** Ein Leser gibt das FERTIGE Union-Glied zurück, nicht nur den content — so
 *  prüft `tsc` in einem Zug, dass Schlüssel und Rückgabe zusammenpassen. */
type ContentReader<K extends TemplateType> = (
  source: JsonObject,
) => Member<K> | null;

/**
 * Die einzige Liste der zehn Werte im Modul — Tabelle und Wertevorrat in
 * einem. Der Mapped Type bindet jeden Schlüssel an SEINEN Leser: `daily_value`
 * auf `readFree` zu legen ist ein Typfehler, kein stiller Bug. Wächst
 * `TemplateType` in `journal.ts`, scheitert der Build hier.
 */
const READERS: { [K in TemplateType]: ContentReader<K> } = {
  daily_value: readDailyValue,
  value_eval: readValueEval,
  yin_yang: readYinYang,
  little_bet: readLittleBet,
  bill_of_rights: readBillOfRights,
  messy_moment: readMessyMoment,
  overthinking: readOverthinking,
  saying_no: readSayingNo,
  shadow: readShadow,
  free: readFree,
};

/* ------------------------------------------------------------------ */
/*  Enum-Tabellen                                                     */
/* ------------------------------------------------------------------ */

/**
 * Der Wertevorrat einer String-Union als Tabelle: jeder Schlüssel muss sich
 * selbst als Wert tragen. Damit prüft `tsc` beide Richtungen — kein Wert
 * fehlt, keiner ist erfunden, keiner sitzt auf dem falschen Schlüssel.
 *
 * Eine `readonly T[]`-Liste könnte das nicht: eine Teilmenge ist zuweisbar,
 * ein neuer Wert in `db-json.ts` bliebe also unbemerkt und würde beim Lesen
 * still verworfen.
 */
type EnumTable<T extends string> = { [K in T]: K };

const VIBES: EnumTable<NonNullable<LittleBetContent["vibe"]>> = {
  energized: "energized",
  neutral: "neutral",
  drained: "drained",
};

const GUILT_TYPES: EnumTable<NonNullable<MessyMomentContent["guilt_type"]>> = {
  healthy: "healthy",
  unhealthy: "unhealthy",
  unsure: "unsure",
};

const GUILT_GUESSES: EnumTable<
  NonNullable<MessyMomentContent["ai_guilt_guess"]>
> = {
  healthy: "healthy",
  unhealthy: "unhealthy",
};

const GUILT_FEEDBACKS: EnumTable<
  NonNullable<MessyMomentContent["guilt_feedback"]>
> = {
  agree: "agree",
  disagree: "disagree",
};

const NO_MODES: EnumTable<SayingNoContent["mode"]> = {
  real: "real",
  practice: "practice",
};

const SCENARIO_SOURCES: EnumTable<
  NonNullable<SayingNoContent["scenario_source"]>
> = {
  ai: "ai",
  static: "static",
};

const FINAL_SOURCES: EnumTable<NonNullable<SayingNoContent["final_source"]>> = {
  own: "own",
  ai: "ai",
  edited: "edited",
};

const SHADOW_MODES: EnumTable<NonNullable<ShadowContent["mode"]>> = {
  journal: "journal",
  walk: "walk",
};

/* ------------------------------------------------------------------ */
/*  Leser pro Template                                                */
/* ------------------------------------------------------------------ */

function readDailyValue(source: JsonObject): Member<"daily_value"> | null {
  const happenings = readString(source, "happenings");
  if (happenings === undefined) return null;

  const content: DailyValueContent = { happenings };

  // Alt-Einträge vor der 1-Feld-Zusammenlegung tragen noch ein eigenes Feld.
  setIfPresent(content, "response", readString(source, "response"));

  return { template: "daily_value", content };
}

function readValueEval(source: JsonObject): Member<"value_eval"> | null {
  const positive = readString(source, "positive_reflection");
  const negative = readString(source, "negative_reflection");
  if (positive === undefined || negative === undefined) return null;

  const content: ValueEvalContent = {
    positive_reflection: positive,
    negative_reflection: negative,
  };

  // Die beiden KI-Felder trägt /api/journal-analysis nach; Alt-Einträge und
  // frisch gespeicherte Einträge haben sie nicht.
  setIfPresent(content, "ai_confirmed", readStringArray(source, "ai_confirmed"));
  setIfPresent(
    content,
    "ai_suggested",
    readObjectArray(source, "ai_suggested", (item) => {
      const id = readString(item, "id");
      const reason = readString(item, "reason");
      return id !== undefined && reason !== undefined ? { id, reason } : null;
    }),
  );

  return { template: "value_eval", content };
}

function readYinYang(source: JsonObject): Member<"yin_yang"> | null {
  const yin = readString(source, "yin");
  const yang = readString(source, "yang");
  if (yin === undefined || yang === undefined) return null;

  const content: YinYangContent = { yin, yang };

  setIfPresent(content, "principles", readString(source, "principles"));
  setIfPresent(content, "tagtraum", readString(source, "tagtraum"));
  setIfPresent(
    content,
    "ai_wants",
    readObjectArray(source, "ai_wants", (item) => {
      const text = readString(item, "text");
      if (text === undefined) return null;
      // Ohne Passung steht dort null — ein fehlendes Feld heißt dasselbe.
      return { text, value_id: readString(item, "value_id") ?? null };
    }),
  );

  return { template: "yin_yang", content };
}

function readLittleBet(source: JsonObject): Member<"little_bet"> | null {
  const betText = readString(source, "bet_text");
  const experience = readString(source, "experience");
  if (betText === undefined || experience === undefined) return null;

  const content: LittleBetContent = { bet_text: betText, experience };

  setIfPresent(content, "liked", readString(source, "liked"));
  setIfPresent(content, "disliked", readString(source, "disliked"));
  setIfPresent(content, "vibe", readEnum(source, "vibe", VIBES));
  setIfPresent(content, "changed_wants", readString(source, "changed_wants"));

  return { template: "little_bet", content };
}

function readBillOfRights(source: JsonObject): Member<"bill_of_rights"> | null {
  // Kein Pflichtfeld: neue Einträge tragen prompt1 + ai_analysis + old_rule,
  // Alt-Einträge stattdessen prompt2/prompt3. Beides ist gültig, und ein
  // Eintrag ohne jedes Feld bleibt eine leere Reflexion statt "unknown".
  const content: BillOfRightsContent = {};

  setIfPresent(content, "prompt1", readString(source, "prompt1"));
  setIfPresent(content, "ai_analysis", readString(source, "ai_analysis"));
  setIfPresent(content, "old_rule", readString(source, "old_rule"));
  setIfPresent(content, "prompt2", readString(source, "prompt2"));
  setIfPresent(content, "prompt3", readString(source, "prompt3"));

  return { template: "bill_of_rights", content };
}

function readMessyMoment(source: JsonObject): Member<"messy_moment"> | null {
  const messyWhen = readString(source, "messy_when");
  if (messyWhen === undefined) return null;

  const content: MessyMomentContent = { messy_when: messyWhen };

  // Alt-Einträge (Formular bis Juli 2026): Selbst-Einordnung des Users.
  setIfPresent(
    content,
    "conflicting_rules",
    readString(source, "conflicting_rules"),
  );
  setIfPresent(
    content,
    "guilt_type",
    readEnum(source, "guilt_type", GUILT_TYPES),
  );

  // Neue Einträge: die KI-Felder. Sie dürfen explizit null tragen, wenn die KI
  // keinen validen Wert lieferte — null ist hier eine Aussage, kein Fehler.
  setIfPresent(
    content,
    "ai_guilt_guess",
    readNullableEnum(source, "ai_guilt_guess", GUILT_GUESSES),
  );
  setIfPresent(
    content,
    "ai_rules_conflict",
    readNullableString(source, "ai_rules_conflict"),
  );
  setIfPresent(
    content,
    "guilt_feedback",
    readNullableEnum(source, "guilt_feedback", GUILT_FEEDBACKS),
  );

  return { template: "messy_moment", content };
}

function readOverthinking(source: JsonObject): Member<"overthinking"> | null {
  const problem = readString(source, "problem");
  const whyLevels = readStringArray(source, "why_levels");
  const whatIfWrong = readString(source, "what_if_wrong");
  const reframed = readString(source, "reframed_problem");
  const decision = readString(source, "decision");
  if (
    problem === undefined ||
    whyLevels === undefined ||
    whatIfWrong === undefined ||
    reframed === undefined ||
    decision === undefined
  ) {
    return null;
  }

  const content: OverthinkingContent = {
    problem,
    why_levels: whyLevels,
    what_if_wrong: whatIfWrong,
    reframed_problem: reframed,
    decision,
  };

  setIfPresent(
    content,
    "challenger_question",
    readString(source, "challenger_question"),
  );

  // Alt-Einträge mit dem früheren Vergleichsblock (nur noch lesend).
  setIfPresent(
    content,
    "what_it_would_mean",
    readString(source, "what_it_would_mean"),
  );
  setIfPresent(content, "current_problem", readString(source, "current_problem"));
  setIfPresent(content, "new_problem", readString(source, "new_problem"));

  return { template: "overthinking", content };
}

function readSayingNo(source: JsonObject): Member<"saying_no"> | null {
  const mode = readEnum(source, "mode", NO_MODES);
  const situation = readString(source, "situation");
  const draft = readString(source, "draft");
  if (mode === undefined || situation === undefined || draft === undefined) {
    return null;
  }

  const content: SayingNoContent = { mode, situation, draft };

  setIfPresent(
    content,
    "scenario_source",
    readEnum(source, "scenario_source", SCENARIO_SOURCES),
  );
  setIfPresent(content, "hell_yes", readBoolean(source, "hell_yes"));
  setIfPresent(content, "draft2", readString(source, "draft2"));
  setIfPresent(content, "ai_checklist", readChecklist(source, "ai_checklist"));
  setIfPresent(
    content,
    "ai_improved",
    readNullableString(source, "ai_improved"),
  );
  setIfPresent(content, "final_no", readString(source, "final_no"));
  setIfPresent(
    content,
    "final_source",
    readEnum(source, "final_source", FINAL_SOURCES),
  );

  return { template: "saying_no", content };
}

function readShadow(source: JsonObject): Member<"shadow"> | null {
  const body = readString(source, "body");
  // `private: true` ist Pflicht, nicht Zierde: daran hängen die
  // Vorschau-Unterdrückung und der KI-Ausschluss. Ein Eintrag ohne den Marker
  // ist kein Shadow-Eintrag, egal was der template_type behauptet.
  if (body === undefined || source["private"] !== true) return null;

  const content: ShadowContent = { body, private: true };

  setIfPresent(content, "mode", readEnum(source, "mode", SHADOW_MODES));

  return { template: "shadow", content };
}

function readFree(source: JsonObject): Member<"free"> | null {
  const body = readString(source, "body");
  if (body === undefined) return null;

  const content: FreeEntryContent = { body };

  setIfPresent(content, "title", readString(source, "title"));

  return { template: "free", content };
}

/* ------------------------------------------------------------------ */
/*  Feld-Leser                                                        */
/* ------------------------------------------------------------------ */

/**
 * Setzt ein optionales Feld nur, wenn der Leser etwas gefunden hat.
 *
 * `undefined` heißt bei jedem Leser dasselbe — „nicht da oder falscher Typ“ —
 * und wird verschluckt. Ein explizites `null` ist dagegen eine Aussage und
 * landet im Ergebnis.
 */
function setIfPresent<O, K extends keyof O>(
  target: O,
  key: K,
  value: O[K] | undefined,
): void {
  if (value !== undefined) target[key] = value;
}

function readString(source: JsonObject, key: string): string | undefined {
  const value = source[key];
  return typeof value === "string" ? value : undefined;
}

function readBoolean(source: JsonObject, key: string): boolean | undefined {
  const value = source[key];
  return typeof value === "boolean" ? value : undefined;
}

/** Für Felder, die laut Shape explizit `null` tragen dürfen. `null` ist eine
 *  Aussage („die KI lieferte nichts Valides“) und wird nicht verschluckt. */
function readNullableString(
  source: JsonObject,
  key: string,
): string | null | undefined {
  if (source[key] === null) return null;
  return readString(source, key);
}

/** Der Index-Zugriff auf die Tabelle IST die Prüfung: liegt der Wert nicht
 *  drin, gibt es nichts zurückzugeben — kein Cast nötig. */
function readEnum<T extends string>(
  source: JsonObject,
  key: string,
  allowed: Record<string, T>,
): T | undefined {
  const value = source[key];
  if (typeof value !== "string" || !Object.hasOwn(allowed, value)) {
    return undefined;
  }
  return allowed[value];
}

function readNullableEnum<T extends string>(
  source: JsonObject,
  key: string,
  allowed: Record<string, T>,
): T | null | undefined {
  if (source[key] === null) return null;
  return readEnum(source, key, allowed);
}

/** Ganz oder gar nicht: ein einziges Nicht-String-Element verwirft die Liste.
 *  Eine still gefilterte Liste wäre schlimmer als keine — bei `why_levels`
 *  hinge daran, welche Warum-Ebene als die tiefste gilt. */
function readStringArray(
  source: JsonObject,
  key: string,
): string[] | undefined {
  const value = source[key];
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((item) => typeof item === "string");
  return strings.length === value.length ? strings : undefined;
}

/** Dasselbe für Objekt-Listen: `read` verengt ein Element oder gibt `null`,
 *  und ein einziges `null` verwirft die ganze Liste. */
function readObjectArray<T>(
  source: JsonObject,
  key: string,
  read: (item: JsonObject) => T | null,
): T[] | undefined {
  const value = source[key];
  if (!Array.isArray(value)) return undefined;

  const items: T[] = [];
  for (const element of value) {
    if (typeof element !== "object" || element === null) return undefined;
    const item = read(toJsonObject(element));
    if (item === null) return undefined;
    items.push(item);
  }
  return items;
}

/** Die vier Schichten sind alle Pflicht — eine halbe Checkliste ergäbe eine
 *  falsche Bilanz („2 von 3 Schichten“), also lieber gar keine. */
function readChecklist(
  source: JsonObject,
  key: string,
): SayingNoChecklist | null | undefined {
  const raw = source[key];
  if (raw === null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;

  const item = toJsonObject(raw);
  const completeSentence = readBoolean(item, "complete_sentence");
  const noApology = readBoolean(item, "no_apology");
  const warmth = readBoolean(item, "warmth");
  const noBut = readBoolean(item, "no_but");
  if (
    completeSentence === undefined ||
    noApology === undefined ||
    warmth === undefined ||
    noBut === undefined
  ) {
    return undefined;
  }

  return {
    complete_sentence: completeSentence,
    no_apology: noApology,
    warmth,
    no_but: noBut,
  };
}

/** Jeder andere JSON-Wert (String, Zahl, Liste, `null`) wird zum leeren
 *  Objekt — so hat jeder Leser dieselbe Eingangsform. */
function toJsonObject(value: unknown): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const record: JsonObject = {};
  for (const [key, item] of Object.entries(value)) {
    setJsonKey(record, key, item);
  }
  return record;
}

/**
 * Setzt einen Schlüssel per `defineProperty` statt per Zuweisung. JSONB darf
 * einen Schlüssel `"__proto__"` tragen, und `record["__proto__"] = …` träfe
 * den Setter statt zu schreiben — das Objekt verlöre still genau das Feld, um
 * das es geht. Beide Wege ins JSONB (kopieren und patchen) gehen hier durch.
 */
function setJsonKey(target: JsonObject, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}
