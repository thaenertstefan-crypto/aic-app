import { getBillOfRightsData } from "@/app/(app)/recipes/bill-of-rights/actions";

import { BillOfRightsMe } from "./bill-of-rights-me";

export default async function MeBillOfRightsPage() {
  const { data } = await getBillOfRightsData();

  return (
    <BillOfRightsMe
      initialRights={data?.rights ?? []}
      introSeen={data?.introSeen ?? true}
    />
  );
}
