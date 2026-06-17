import { Logo } from "@/components/brand/logo";
import { BrandPanel } from "@/components/auth/brand-panel";
import { AuthReveal } from "@/components/auth/auth-reveal";

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
        </>
      }
    >
      {children}
    </AuthReveal>
  );
}
