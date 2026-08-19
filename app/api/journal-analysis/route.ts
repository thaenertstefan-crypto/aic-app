import { withAiRoute } from "@/lib/anthropic/ask-model";
import { parseAnalysisResult } from "@/lib/anthropic/journal-analysis-result";
import { SYSTEM_PROMPT } from "@/lib/anthropic/prompts/journal-analysis";
import {
  patchJournalContent,
  readJournalContent,
} from "@/lib/utils/journal-content";
import { recipeSlugFor } from "@/lib/utils/journal-recipe-slug";
import { cycleJournal, cycleOfEntry } from "@/lib/recipes/values/cycle";
import { VALUES_BANK, getValueLabel } from "@/lib/utils/values-bank";

// Warm German fallback shown when the AI call fails for any reason.
const FALLBACK_INSIGHTS =
  "Wir konnten diesmal leider keine Beobachtungen für dich erstellen. Schau einfach selbst noch einmal auf deine Woche zurück – was hat sich für dich besonders stimmig angefühlt?";

// Entries come from the user's own DB, so defensively truncate (no 400) to keep
// input-token costs bounded — max_tokens only bounds the OUTPUT.
const MAX_ENTRY_LEN = 2000;

function clampEntryText(value: string): string {
  return value.slice(0, MAX_ENTRY_LEN);
}

/**
 * Analyse the user's last 7 daily journal entries (Recipe #1) and surface a few
 * gentle value-theme observations. Accepts { entryId } des value_eval-Eintrags
 * — Rückblick und Werte werden serverseitig über den RLS-Client nachgeladen.
 * Das Ergebnis wird auf denselben Eintrag persistiert (ai_insights +
 * content.ai_confirmed/ai_suggested) und als { insights, confirmed, suggested }
 * zurückgegeben.
 *
 * Die Route suchte die Zeile vorher selbst und übersprang das Speichern still,
 * wenn es sie noch nicht gab — der Reihenfolge-Zwang war damit unsichtbar UND
 * folgenlos-aussehend, obwohl die Auswertung dabei verloren ging. Jetzt ist
 * das ein 404 wie bei den Schwesterrouten; wer den Beleg nicht hat, kommt
 * schon typseitig nicht hierher (s. lib/recipes/saved-entry.ts).
 *
 * Die eine Route, die nicht mit einem Fehler antwortet, wenn das MODELL
 * ausfällt: dann bekommt die Person den Fallback-Text und eine leere
 * Auswertung. Nur das Limit wird hart durchgereicht — sonst wäre die Bremse
 * wirkungslos.
 */
export const POST = withAiRoute(
  { endpoint: "journal-analysis", failure: FALLBACK_INSIGHTS },
  async ({ supabase, user, askModel }, request) => {
    const body = (await request.json().catch(() => ({}))) as {
      entryId?: unknown;
    };
    const entryId = typeof body.entryId === "string" ? body.entryId : "";
    if (!entryId) {
      return Response.json(
        { error: "Es fehlt der Eintrag für die Auswertung." },
        { status: 400 },
      );
    }

    // Die value_eval-Zeile zuerst: sie sagt, welcher Durchlauf ausgewertet
    // wird, und ohne sie gibt es ohnehin nichts zu tun (404 unten). Vor KAN-20
    // liefen alle drei Reads parallel und die Tagebuch-Einträge wurden als
    // „die letzten 7" genommen — im zweiten Durchlauf waren das die des ersten.
    const { data: evalRow } = await supabase
      .from("journal_entries")
      .select("id, template_type, content, cycle_number")
      .eq("id", entryId)
      .eq("user_id", user.id)
      .eq("recipe_slug", recipeSlugFor("value_eval"))
      .eq("template_type", "value_eval")
      .maybeSingle();

    if (!evalRow) {
      return Response.json(
        { error: "Wir konnten deinen Rückblick nicht finden." },
        { status: 404 },
      );
    }

    // Der Durchlauf steht auf der eval-Zeile, nicht am Fortschritt: wer den
    // Rückblick eines älteren Durchlaufs erneut auswerten lässt, soll dessen
    // sieben Tage bekommen — nicht die des laufenden.
    const cycle = cycleOfEntry(evalRow);

    // Jetzt die beiden Reads, die vom Durchlauf der eval-Zeile abhängen bzw.
    // unabhängig sind — parallel, bevor der KI-Call startet.
    const [{ data: dailyEntries }, { data: hypothesisRow }] = await Promise.all([
      // Die 7 Tagebuch-Einträge DIESES Durchlaufs.
      cycleJournal(
        { supabase, user },
        cycle,
        "daily_value",
        "template_type, content",
      )
        .eq("recipe_slug", recipeSlugFor("daily_value"))
        .order("created_at", { ascending: false })
        .limit(7),
      // Latest values hypothesis.
      supabase
        .from("values_hypothesis")
        .select("values")
        .eq("user_id", user.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    // Chronological order reads more naturally in the prompt. Einträge, deren
    // content kein Tagebuch-Eintrag ist, fallen raus, statt als leerer Tag im
    // Prompt zu landen — flatMap, weil das Glied die Verengung mitbringt.
    const entries = (dailyEntries ?? [])
      .flatMap((row) => {
        const entry = readJournalContent(row.template_type, row.content);
        return entry.template === "daily_value" ? [entry.content] : [];
      })
      .reverse();

    const values = (hypothesisRow?.values as string[] | undefined) ?? [];

    const evalEntry = readJournalContent(evalRow.template_type, evalRow.content);
    const reflection =
      evalEntry.template === "value_eval" ? evalEntry.content : null;

    const entriesText = entries
      .map(
        (content, i) =>
          `Tag ${i + 1}\nWas ist passiert: ${clampEntryText(content.happenings)}\nGedanken & Gefühle: ${clampEntryText(content.response ?? "") || "(keine Angabe)"}`,
      )
      .join("\n\n");

    const answer = await askModel({
      system: SYSTEM_PROMPT,
      // Generous headroom: die ~200–250-Wörter-Prosa TEILT sich das Budget mit
      // dem JSON-Umschlag, confirmed und bis zu 3 Vorschlägen samt Begründung —
      // 900 reichte dafür nicht zuverlässig (Schwesterrouten mit JSON-Antwort
      // fahren 1200/1600).
      maxTokens: 1400,
      message: `Aktuelle Werte der Person: ${
        values.length > 0
          ? values.map(getValueLabel).join(", ")
          : "(noch keine festgelegt)"
      }

Die Tagebucheinträge der letzten Woche:
<journal_entries>
${entriesText || "(keine Einträge vorhanden)"}
</journal_entries>

Rückblick der Person:
<rueckblick>
Positive Momente: ${clampEntryText(reflection?.positive_reflection ?? "") || "(keine Angabe)"}
Belastende Momente: ${clampEntryText(reflection?.negative_reflection ?? "") || "(keine Angabe)"}
</rueckblick>`,
    });

    if (answer.text === null) {
      // Das Limit ist die eine harte Bremse; alles andere fängt der
      // Fallback-Text auf, damit die Bühne trotzdem etwas zu zeigen hat.
      if (answer.reason === "rate-limit") return answer.failure;
      return Response.json({
        insights: FALLBACK_INSIGHTS,
        confirmed: [],
        suggested: [],
      });
    }

    const result = parseAnalysisResult(answer.text, {
      currentValues: values,
      bankIds: VALUES_BANK.map((v) => v.id),
      fallbackInsights: FALLBACK_INSIGHTS,
    });

    // Persist onto the value_eval entry so it survives reloads and the later
    // read-only revisit. Das content-Update MERGED — sonst gingen die beiden
    // Reflexions-Felder der Person verloren. Ohne Bedingung: die Zeile ist
    // oben nachgewiesen, ein stilles Überspringen kann es nicht mehr geben.
    await supabase
      .from("journal_entries")
      .update({
        ai_insights: result.insights,
        content: patchJournalContent("value_eval", evalRow.content, {
          ai_confirmed: result.confirmed,
          ai_suggested: result.suggested,
        }),
      })
      .eq("id", evalRow.id);

    return Response.json(result);
  },
);
