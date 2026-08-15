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

/** Segmente eines Rich-Text-Strings — reine Funktion, ohne React, damit die
 *  Tokenisierung ohne Renderer prüfbar bleibt. */
export type RichTextPart = string | { strong: string } | { em: string };

export function splitRichText(text: string): RichTextPart[] {
  return text.split(TOKEN).map((part) => {
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return { strong: part.slice(2, -2) };
    }
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
      return { em: part.slice(1, -1) };
    }
    return part;
  });
}

export function RichText({
  text,
  /** Auszeichnung für `**fett**`. Der Default trägt das Onboarding; die
   *  Werte-Auswertung setzt zusätzlich `italic`, damit die Werte-Themen in der
   *  KI-Prosa als solche lesbar sind. */
  strongClassName = "font-semibold text-foreground",
}: {
  text: string;
  strongClassName?: string;
}) {
  return (
    <>
      {splitRichText(text).map((part, i) => {
        if (typeof part === "string") return <Fragment key={i}>{part}</Fragment>;
        if ("strong" in part) {
          return (
            <strong key={i} className={strongClassName}>
              {part.strong}
            </strong>
          );
        }
        return <em key={i}>{part.em}</em>;
      })}
    </>
  );
}
