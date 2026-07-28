import { Fragment } from "react";

/**
 * Winziger Inline-Renderer für Content-Strings: löst genau zwei Auszeichnungen
 * auf — `**fett**` und `*kursiv*`. Bewusst KEIN Markdown-Parser: keine Links,
 * kein verschachteltes Markup. Damit bleiben die Texte in
 * [onboarding-intro.ts](../../lib/content/onboarding-intro.ts) lesbar und
 * editierbar, ohne dass Copy-Änderungen JSX anfassen müssen.
 *
 * Fraunces hat einen echten Italic-Schnitt (siehe app/layout.tsx,
 * `style: ["normal", "italic"]`) — `<em>` ist also kein synthetisches Kursiv.
 */
const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
