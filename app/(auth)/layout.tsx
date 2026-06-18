import { Logo } from "@/components/brand/logo";
import { BrandPanel } from "@/components/auth/brand-panel";
import { AuthReveal } from "@/components/auth/auth-reveal";
import { MascotPeek } from "@/components/brand/mascot-peek";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthReveal
      hero={
        <>
          {/* Logo oben, mit Abstand zur Notch/Statusleiste */}
          <div
            className="px-6 pt-6 md:px-10 md:pt-8"
            style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))" }}
          >
            <Logo size="default" />
          </div>

          {/* Headline / Subline / Reframe mittig im Hero */}
          <div className="flex flex-1 items-center">
            <BrandPanel className="bg-none" />
          </div>

          {/* Maskottchen lugt von unten rechts halb über den Bildschirmrand
              herein, gekippt, Blick nach links oben zur Headline. Positioniert
              relativ zum Vollbild-Hero-Panel (wird dort am Rand geclippt). */}
          <MascotPeek
            from="right"
            size="lg"
            rotate={-45}
            gazeX={0}
            gazeY={-3}
            expression="curious"
            className="pointer-events-none absolute bottom-0 right-0 -mb-3 -mr-12 z-10"
          />
        </>
      }
    >
      {children}
    </AuthReveal>
  );
}
