import { SubPageHeader } from "@/components/layout/sub-page-header";
import { getHypothesisData } from "@/lib/recipes/values/actions";
import { HypothesisForm } from "./hypothesis-form";

export default async function ValuesHypothesisPage() {
  const { values, stage } = await getHypothesisData();
  return (
    <div className="flex min-h-svh flex-col">
      <SubPageHeader backHref="/me/values/journey" title="Werte" />
      <HypothesisForm initialValues={values} stage={stage} />
    </div>
  );
}
