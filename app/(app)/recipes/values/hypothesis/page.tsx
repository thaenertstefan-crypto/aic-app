import { getHypothesisData } from "../actions";
import { HypothesisForm } from "./hypothesis-form";

export default async function ValuesHypothesisPage() {
  const initialValues = await getHypothesisData();
  return <HypothesisForm initialValues={initialValues} />;
}
