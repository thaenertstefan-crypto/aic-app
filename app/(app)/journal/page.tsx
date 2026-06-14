import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/brand/page-header";
import { JournalHub } from "@/components/journal/journal-hub";
import type { JournalEntryRow } from "@/lib/utils/journal";

export default async function JournalPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: entries } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="p-4">
      <PageHeader
        title="Journal"
        description="Deine gesammelten Reflexionen — jeder Eintrag ein Schritt zu mehr Klarheit."
      />
      <JournalHub entries={(entries as JournalEntryRow[]) ?? []} />
    </div>
  );
}