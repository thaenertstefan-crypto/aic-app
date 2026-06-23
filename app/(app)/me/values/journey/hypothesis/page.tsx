import { SubPageHeader } from "@/components/layout/sub-page-header";
import { getHypothesisData } from "@/app/(app)/recipes/values/actions";
import { HypothesisForm } from "./hypothesis-form";

export default async function ValuesHypothesisPage() {
  const initialValues = await getHypothesisData();
  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader backHref="/me/values/journey" title="Werte" />
      <HypothesisForm initialValues={initialValues} />
    </div>
  );
}
