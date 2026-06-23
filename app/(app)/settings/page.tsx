import { NAV_LABELS } from "@/lib/content/labels";

export default function SettingsPage() {
  return (
    <div className="space-y-6 p-4">
      <header className="space-y-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          {NAV_LABELS.settings}
        </h1>
        <p className="text-sm text-muted-foreground">Kommt gleich.</p>
      </header>
    </div>
  );
}
