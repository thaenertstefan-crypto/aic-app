import { Logo } from "@/components/brand/logo";
import { PageHeader } from "@/components/brand/page-header";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Hero section */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 sm:py-32">
        <div className="flex max-w-xl flex-col items-center gap-10 text-center">
          <Logo size="lg" className="text-primary" />

          <PageHeader
            title="Willkommen im Anti Imposter Club"
            description="Du bist hier, weil du mehr kannst, als du dir zutraust.
            Dies ist dein Raum, um das Imposter-Syndrom Schritt für Schritt zu entkräften —
            mit Übungen, die wirklich wirken."
            align="center"
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg">Erste Schritte</Button>
            <Button variant="outline" size="lg">
              Mehr erfahren
            </Button>
          </div>
        </div>
      </section>

      {/* Values bar */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>Gemeinsam wachsen. Ohne Vergleich. In deinem Tempo.</p>
      </footer>
    </div>
  );
}