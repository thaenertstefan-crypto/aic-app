import { PAGE_TITLES } from "@/lib/content/labels";

export default function BoosterPage() {
  return (
    <div className="space-y-6 p-4">
      <header className="space-y-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          {PAGE_TITLES.booster}
        </h1>
        <p className="text-sm text-muted-foreground">Kommt gleich.</p>
      </header>
    </div>
  );
}
