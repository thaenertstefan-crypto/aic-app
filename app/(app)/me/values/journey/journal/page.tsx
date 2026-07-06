import { SubPageHeader } from "@/components/layout/sub-page-header";
import { serverTodayKey } from "@/lib/server/timezone";
import { getJournalData } from "@/app/(app)/recipes/values/actions";
import { JournalForm } from "./journal-form";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const [data, { day: dayParam }] = await Promise.all([
    getJournalData(),
    searchParams,
  ]);

  // ?day=N zeigt einen bereits abgeschlossenen Reflexionstag: Tag N = N-ter
  // Eintrag nach entry_date aufsteigend. Ungültige Werte fallen aufs heutige
  // Formular zurück.
  const requestedDay = Number(dayParam);
  const viewEntry =
    Number.isInteger(requestedDay) &&
    requestedDay >= 1 &&
    requestedDay <= data.entries.length
      ? data.entries[requestedDay - 1]
      : null;

  // Titel = der Reflexionstag, auf dem man gerade steht (gleiche Logik wie das
  // Journey-Gating): heutiger Eintrag existiert → der gerade ausgefüllte Tag,
  // sonst der nächste offene. Nach Tag 7 bleibt der Titel bei "Tag 7".
  const today = await serverTodayKey();
  const days = new Set(data.entries.map((e) => e.entry_date));
  const dayNumber = viewEntry
    ? requestedDay
    : Math.min(days.has(today) ? days.size : days.size + 1, 7);

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader
        backHref="/me/values/journey"
        title={`Tag ${dayNumber} — Reflexion`}
      />
      <JournalForm
        initialData={data}
        viewEntry={viewEntry}
        viewDay={viewEntry ? requestedDay : undefined}
      />
    </div>
  );
}
