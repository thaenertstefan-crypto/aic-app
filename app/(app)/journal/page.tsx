import Link from "next/link";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/brand/page-header";
import { Button } from "@/components/ui/button";
import { JournalHub } from "@/components/journal/journal-hub";
import type { JournalEntryRow } from "@/lib/utils/journal";

export default async function JournalPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The (app) layout already enforces auth; this is a defensive guard so we
  // never run the query with an empty user id.
  if (!user) return null;

  const { data: entries } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

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
      <JournalHub entries={(entries as JournalEntryRow[]) ?? []} />
    </div>
  );
}