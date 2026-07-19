import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
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
  const user = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
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
      {/* overflow-x-clip fängt horizontale Overflows (z. B. seitlich aus dem
          Bild fliegende Dekor-Wolken) am echten Viewport-Rand ab, ohne einen
          Scroll-Container zu erzeugen — verhindert das Seiten-Scrollen. */}
      <main className="flex-1 overflow-x-clip">{children}</main>
      <BottomNav />
    </div>
  );
}