import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  icon: LucideIcon;
  value: number | string;
  label: string;
  accentClass?: string;
}

export function StatCard({
  icon: Icon,
  value,
  label,
  accentClass = "text-primary",
}: StatCardProps) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col items-center gap-1 py-1 text-center">
        <Icon className={`size-4 ${accentClass}`} />
        <span className="font-heading text-2xl font-bold tabular-nums text-foreground">
          {value}
        </span>
        <span className="text-[11px] leading-tight text-muted-foreground">
          {label}
        </span>
      </CardContent>
    </Card>
  );
}
