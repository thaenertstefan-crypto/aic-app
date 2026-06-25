"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Error-Boundary für die App-Shell. Rendert innerhalb von (app)/layout.tsx,
 * sodass die Bottom-Nav erhalten bleibt, wenn eine (app)-Server-Component wirft.
 * Wurzel-Layout-Fehler fängt stattdessen app/global-error.tsx.
 */
export default function AppError({
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
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
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
    </div>
  );
}
