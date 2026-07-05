import { SubPageHeader } from "@/components/layout/sub-page-header";
import { serverTodayKey } from "@/lib/server/timezone";
import { getJournalData } from "@/app/(app)/recipes/values/actions";
import { JournalForm } from "./journal-form";

export default async function JournalPage() {
  const data = await getJournalData();

  // Titel = der Reflexionstag, auf dem man gerade steht (gleiche Logik wie das
  // Journey-Gating): heutiger Eintrag existiert → der gerade ausgefüllte Tag,
  // sonst der nächste offene. Nach Tag 7 bleibt der Titel bei "Tag 7".
  const today = await serverTodayKey();
  const days = new Set(data.entries.map((e) => e.entry_date));
  const dayNumber = Math.min(days.has(today) ? days.size : days.size + 1, 7);

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader
        backHref="/me/values/journey"
        title={`Tag ${dayNumber} — Reflexion`}
      />
      <JournalForm initialData={data} />
    </div>
  );
}
