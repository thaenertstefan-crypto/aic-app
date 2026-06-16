import { SubPageHeader } from "@/components/layout/sub-page-header";
import { getJournalData } from "../actions";
import { JournalForm } from "./journal-form";

export default async function JournalPage() {
  const data = await getJournalData();

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader backHref="/recipes/values" title="Tagebuch" />
      <JournalForm initialData={data} />
    </div>
  );
}
