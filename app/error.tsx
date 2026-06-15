"use client";

import { useEffect } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for debugging without showing internals to the user.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <Logo size="default" className="text-muted-foreground" />

      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Da ist was schiefgelaufen
        </h1>
        <p className="mx-auto max-w-sm text-muted-foreground">
          Tut uns leid — das lag an uns, nicht an dir. Versuch es gleich nochmal,
          oft hilft das schon.
        </p>
      </div>

      <Button size="lg" onClick={reset}>
        Nochmal versuchen
      </Button>
    </main>
  );
}
