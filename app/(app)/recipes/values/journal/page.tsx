import { getJournalData } from "../actions";
import { JournalForm } from "./journal-form";

export default async function JournalPage() {
  const data = await getJournalData();

  return <JournalForm initialData={data} />;
}