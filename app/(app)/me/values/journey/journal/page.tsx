import { SubPageHeader } from "@/components/layout/sub-page-header";
import { getJournalData } from "@/app/(app)/recipes/values/actions";
import { JournalForm } from "./journal-form";

export default async function JournalPage() {
  const data = await getJournalData();

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader backHref="/me/values/journey" title="Tagebuch" />
      <JournalForm initialData={data} />
    </div>
  );
}
