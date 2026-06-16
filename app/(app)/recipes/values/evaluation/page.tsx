import { redirect } from "next/navigation";
import { SubPageHeader } from "@/components/layout/sub-page-header";
import { getEvaluationData } from "../actions";
import { EvaluationForm } from "./evaluation-form";

export default async function EvaluationPage() {
  const data = await getEvaluationData();

  // If user hasn't completed 7 journal entries yet, redirect to journal
  if (data.entries.length < 7) {
    redirect("/recipes/values/journal");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader backHref="/recipes/values" title="Auswertung" />
      <EvaluationForm initialData={data} />
    </div>
  );
}
