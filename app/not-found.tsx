import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <Logo size="default" className="text-muted-foreground" />

      <div className="space-y-2">
        <p className="font-heading text-5xl font-bold tracking-tight text-foreground">
          404
        </p>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Diese Seite gibt&apos;s nicht (mehr)
        </h1>
        <p className="mx-auto max-w-sm text-muted-foreground">
          Kein Grund zur Sorge — manchmal verläuft man sich. Lass uns zurück zu
          etwas gehen, das dir guttut.
        </p>
      </div>

      <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
        Zurück zum Start
      </Link>
    </main>
  );
}
