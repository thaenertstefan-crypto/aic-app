import { cn } from "@/lib/utils";

type LogoSize = "sm" | "default" | "lg";

interface LogoProps {
  className?: string;
  size?: LogoSize;
}

const sizeClasses: Record<LogoSize, string> = {
  sm: "text-lg tracking-wide",
  default: "text-2xl tracking-wider",
  lg: "text-4xl tracking-widest",
};

export function Logo({ className, size = "default" }: LogoProps) {
  return (
    <p
      className={cn(
        "inline-flex items-baseline gap-1.5 font-heading font-semibold leading-none",
        sizeClasses[size],
        className,
      )}
      aria-label="Anti Imposter Club"
    >
      <span className="hidden sm:inline">Anti Imposter Club</span>
      <span className="sm:hidden">AIC</span>
    </p>
  );
}