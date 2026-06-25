import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/brand/page-header";
import { Button } from "@/components/ui/button";
import { JournalHub } from "@/components/journal/journal-hub";
import { getJournalPage } from "@/app/(app)/journal/actions";

export default async function JournalPage() {
  // Nur die erste, schlanke Seite laden (id/typ/datum/vorschau) — content und
  // ai_insights bleiben draußen und werden pro Eintrag beim Öffnen nachgeladen.
  const { items, hasMore } = await getJournalPage();

  return (
    <div className="p-4">
      <PageHeader
        title="Journal"
        description="Deine gesammelten Reflexionen — jeder Eintrag ein Schritt zu mehr Klarheit."
      />
      <Button
        className="mt-4 w-full gap-2"
        render={<Link href="/journal/new" />}
      >
        <Plus className="size-4" />
        Neuer Eintrag
      </Button>
      <JournalHub initialEntries={items} initialHasMore={hasMore} />
    </div>
  );
}
