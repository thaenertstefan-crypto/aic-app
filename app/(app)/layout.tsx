import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/get-user";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";
import { OfflineBanner } from "@/components/offline/offline-banner";
import { AppBackdrop } from "@/components/ui/app-backdrop";
import { TimezoneSync } from "@/components/timezone-sync";
import { ZoneTheme } from "@/components/layout/zone-theme";

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
      <ZoneTheme />
      <OfflineBanner />
      {/* overflow-x-clip fängt horizontale Overflows (z. B. seitlich aus dem
          Bild fliegende Dekor-Wolken) am echten Viewport-Rand ab, ohne einen
          Scroll-Container zu erzeugen — verhindert das Seiten-Scrollen.

          `flex flex-col` ist die Höhen-Weitergabe (KAN-64): dieser Knoten ist
          das einzige Element, das weiß, was Safe-Area oben und Bottom-Nav
          unten vom Viewport übrig lassen — die Nav ist `sticky`, also im
          Fluss, und zählt hier mit. Eine Seite darin fordert ihre Höhe mit
          `flex-1` an und ERBT sie damit. Wer stattdessen selbst am Viewport
          misst (`min-h-svh`/`min-h-lvh`), verlangt die volle Höhe, bekommt sie
          auch — `main` ist ein Flex-Item mit `min-height: auto` und kann nicht
          unter seinen Inhalt schrumpfen — und schiebt das Dokument um genau
          diese Differenz über den Viewport hinaus. Ausnahme bleiben
          Full-bleed-Bühnen, die den ganzen Schirm füllen sollen. */}
      <main className="flex flex-1 flex-col overflow-x-clip">{children}</main>
      <BottomNav />
    </div>
  );
}