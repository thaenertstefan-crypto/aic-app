import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";
import { OfflineBanner } from "@/components/offline/offline-banner";
import { AppBackdrop } from "@/components/ui/app-backdrop";
import { TimezoneSync } from "@/components/timezone-sync";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <AppBackdrop />
      <TimezoneSync />
      <OfflineBanner />
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}