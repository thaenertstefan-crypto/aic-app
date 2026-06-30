import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  align?: "left" | "center";
}

export function PageHeader({
  title,
  description,
  className,
  align = "left",
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "space-y-2",
        align === "center" && "text-center",
        className,
      )}
    >
      <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      {description && (
        <p className="max-w-prose text-lg text-muted-foreground">
          {description}
        </p>
      )}
    </header>
  );
}