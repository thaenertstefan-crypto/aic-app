/**
 * Gedimmter, lebendiger Nachthimmel als Hintergrund des Wants-Fokus.
 *
 * Eine tief abgedunkelte, opake Kopie der SkyBackdrop-Sprache: solide
 * bg-background-Basis (verdeckt Nav + verblasste Karte), darüber der gemalte
 * Abdunkel-Wash und eine Handvoll leise funkelnder Sterne. Rein gemalte
 * Gradienten + Spans, kein backdrop-filter (Glass-Is-Rare, iOS-freundlich).
 *
 * Ohne eigene Positionierung/Transform (nur inset-0-Füllung), damit die
 * Fokus-Ebene den ganzen Himmel als eine Einheit skalieren kann (Parallax-Push).
 * Sanft lebendig: die Sterne behalten ihre Twinkle-Klassen, insgesamt tiefer
 * gedimmt als die Sternenkarte, damit Titel + Text die Bühne behalten.
 */
export function FocusSky() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-background">
      {/* Abdunkel-Wash nach oben — wie SkyBackdrop, etwas tiefer gezogen. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.28) 20%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.04) 58%, transparent 72%)",
        }}
      />
      {/* Gedimmte, leise funkelnde Sterne (SkyBackdrop-Sprache, tiefer gedimmt). */}
      <div className="absolute inset-0" style={{ opacity: 0.55 }}>
        <span className="sky-light sky-light-twinkle absolute left-[14%] top-[16%]" />
        <span
          className="sky-light sky-light-twinkle absolute right-[18%] top-[10%]"
          style={{ animationDelay: "1.6s" }}
        />
        <span className="sky-light absolute left-[8%] top-[30%]" style={{ opacity: 0.3 }} />
        <span
          className="sky-light sky-light-twinkle absolute right-[12%] top-[24%]"
          style={{ animationDelay: "0.8s" }}
        />
        <span
          className="sky-light sky-light-twinkle absolute left-[40%] top-[8%]"
          style={{ animationDelay: "2.3s" }}
        />
        <span className="sky-light absolute right-[36%] top-[40%]" style={{ opacity: 0.3 }} />
        <span
          className="sky-light sky-light-twinkle absolute left-[24%] top-[54%]"
          style={{ animationDelay: "2.9s" }}
        />
        <span
          className="sky-light sky-light-twinkle absolute right-[26%] top-[62%]"
          style={{ animationDelay: "4.2s" }}
        />
        <span className="sky-light absolute left-[68%] top-[48%]" style={{ opacity: 0.3 }} />
        <span
          className="sky-light sky-light-twinkle absolute left-[80%] top-[30%]"
          style={{ animationDelay: "3.7s" }}
        />
        <span
          className="sky-light sky-light-twinkle absolute left-[12%] top-[74%]"
          style={{ animationDelay: "1.9s" }}
        />
        <span className="sky-light absolute right-[10%] top-[80%]" style={{ opacity: 0.3 }} />
      </div>
    </div>
  );
}
