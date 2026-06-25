"use client";

import { useEffect } from "react";

/**
 * Fängt Fehler im Root-Layout ab (greift, wenn selbst app/error.tsx nicht mehr
 * rendern kann). Muss eigene <html>/<body>-Tags rendern, da diese Datei das
 * Root-Layout ersetzt (Next-16-Anforderung). Bewusst minimal und ohne externe
 * Abhängigkeiten, damit die Boundary auch bei kaputter App-Shell funktioniert.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="de">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "3rem 1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            Da ist was schiefgelaufen
          </h1>
          <p style={{ marginTop: "0.5rem", maxWidth: "24rem", opacity: 0.7 }}>
            Tut uns leid — das lag an uns, nicht an dir. Versuch es gleich
            nochmal, oft hilft das schon.
          </p>
        </div>

        <button
          onClick={reset}
          style={{
            borderRadius: "0.75rem",
            padding: "0.75rem 1.5rem",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            background: "#1B1726",
            color: "#fff",
          }}
        >
          Nochmal versuchen
        </button>
      </body>
    </html>
  );
}
