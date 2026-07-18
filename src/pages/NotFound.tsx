import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, LifeBuoy, RefreshCw } from "lucide-react";
import Seo from "@/components/Seo";

/**
 * 404 im LernZeit-Look: eine kleine Rechenaufgabe, deren Ergebnis 404 wäre –
 * gäbe es die Seite. Sie ergibt aber immer irgendetwas anderes. Passt zum
 * Kern der App (Lernen belohnt Bildschirmzeit) und ist damit kreativer als
 * ein generisches "Seite nicht gefunden".
 */
const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Fehler: Seite nicht gefunden:", location.pathname);
  }, [location.pathname]);

  // Zufällige Rechenaufgabe, deren Ergebnis nie 404 ist – reload gibt eine neue.
  const [seed, setSeed] = useState(0);
  const puzzle = useMemo(() => {
    // seed nur um deterministisch bei Rerenders zu bleiben, aber neu bei Reroll.
    void seed;
    const a = 40 + Math.floor(Math.random() * 60); // 40–99
    const b = 2 + Math.floor(Math.random() * 8);   // 2–9
    return { a, b, result: a * b };
  }, [seed]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background pt-safe-top pb-safe-bottom px-safe overflow-hidden relative">
      <Seo
        title="404 – Seite nicht gefunden | LernZeit"
        description="Diese Seite gibt es nicht. Zurück zur LernZeit-Startseite oder direkt zum Support."
        path="/404"
      />

      {/* dezente animierte Hintergrund-Blobs im Markenlook */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl animate-pulse"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-accent/10 blur-3xl animate-pulse [animation-delay:1.5s]"
      />

      <section className="relative z-10 w-full max-w-2xl px-6 py-16 text-center">
        {/* Rechen-Zeile mit "Ergebnis" 404 – der Fehler als Aufgabe */}
        <div
          className="mx-auto mb-8 inline-flex items-baseline gap-3 rounded-2xl border border-border/60 bg-card/70 px-5 py-3 shadow-card backdrop-blur"
          aria-hidden
        >
          <span className="font-mono text-2xl text-muted-foreground tabular-nums">
            {puzzle.a} × {puzzle.b}
          </span>
          <span className="text-2xl text-muted-foreground">=</span>
          <span className="font-mono text-2xl font-semibold text-foreground tabular-nums line-through decoration-destructive decoration-[3px]">
            {puzzle.result}
          </span>
          <span className="ml-1 rounded-md bg-destructive/15 px-2 py-0.5 text-sm font-semibold text-destructive">
            falsch
          </span>
        </div>

        <h1 className="text-8xl sm:text-9xl font-black tracking-tight bg-gradient-to-br from-primary via-primary to-accent bg-clip-text text-transparent leading-none">
          404
        </h1>

        <p className="mt-6 text-2xl font-semibold text-foreground">
          Diese Aufgabe geht nicht auf.
        </p>
        <p className="mt-3 text-base text-muted-foreground max-w-md mx-auto">
          Die Seite <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{location.pathname}</code>{" "}
          konnten wir nirgends im Klassenzimmer finden. Kein Grund zur Sorge –
          das gibt trotzdem <span className="font-semibold text-primary">0 Sekunden Bildschirmzeit</span>.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={() => navigate("/")} className="gap-2">
            <Home className="h-4 w-4" />
            Zur Startseite
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Eine Seite zurück
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={() => setSeed((s) => s + 1)}
            className="gap-2"
            aria-label="Neue Rechenaufgabe würfeln"
          >
            <RefreshCw className="h-4 w-4" />
            Neu würfeln
          </Button>
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          Etwas ist echt kaputt?{" "}
          <button
            type="button"
            onClick={() => navigate("/support")}
            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            Support kontaktieren
          </button>
        </p>
      </section>
    </main>
  );
};

export default NotFound;
