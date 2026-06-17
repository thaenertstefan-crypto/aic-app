import { Logo } from "@/components/brand/logo";
import { BrandPanel } from "@/components/auth/brand-panel";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      {/* Brand-Region: auf Mobile kompakt oben, ab md linke Spalte */}
      <div className="relative md:w-1/2">
        <Logo
          size="default"
          className="absolute left-6 top-6 z-10 md:left-10 md:top-8"
        />
        <BrandPanel className="pt-20 md:flex md:min-h-svh md:flex-col md:justify-center md:pt-0" />
      </div>

      {/* Form-Region: auf Mobile unten, ab md rechte Spalte */}
      <div className="flex min-h-svh flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700">
          {children}
        </div>
      </div>
    </div>
  );
}
