import { getCachedUser } from "@/lib/supabase/get-user";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { SkyBackdrop } from "@/components/backdrops/sky-backdrop";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCachedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh flex-col">
      {/* Nachthimmel wie auf Dashboard / Me / Kopfwetter (fixed -z-10). Der
          Login→Onboarding-Cover (z-40, opak) verdeckt ihn während der Sprung-
          Sequenz und gibt ihn beim Faden frei. */}
      <SkyBackdrop />
      <div
        className="flex justify-center pt-8"
        style={{ paddingTop: "calc(2rem + env(safe-area-inset-top, 0px))" }}
      >
        <Logo size="lg" />
      </div>
      {children}
    </div>
  );
}