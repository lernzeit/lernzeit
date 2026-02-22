import { Button } from '@/components/ui/button';
import { BookOpen, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative py-16 md:py-24 text-center">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full animate-pulse blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/20 rounded-full animate-pulse blur-3xl" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-primary to-secondary rounded-3xl mb-8 shadow-lg animate-scale-in">
          <BookOpen className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-6 leading-tight">
          Lernen belohnen.{' '}
          <br className="hidden sm:block" />
          Handyzeit verdienen.
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          Kinder lösen Aufgaben und verdienen pro richtige Antwort Bildschirmzeit
          – wie viel, bestimmen die Eltern.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate('/?auth=true')}
            size="lg"
            className="h-14 px-8 text-lg font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            Kostenlos starten
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button
            onClick={() => navigate('/?demo=true')}
            variant="outline"
            size="lg"
            className="h-14 px-8 text-lg font-medium border-2 hover:bg-muted/50 transition-all duration-200 hover:scale-105"
          >
            Demo ausprobieren
          </Button>
        </div>

        {/* Visual flow indicator */}
        <div className="mt-16 flex items-center justify-center gap-2 sm:gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5 bg-card/80 backdrop-blur-sm px-3 py-2 rounded-xl shadow-sm border">
            <Sparkles className="w-4 h-4 text-primary" />
            Fach wählen
          </span>
          <ArrowRight className="w-4 h-4 shrink-0 text-muted-foreground/50" />
          <span className="flex items-center gap-1.5 bg-card/80 backdrop-blur-sm px-3 py-2 rounded-xl shadow-sm border">
            <Sparkles className="w-4 h-4 text-secondary" />
            Aufgabe lösen
          </span>
          <ArrowRight className="w-4 h-4 shrink-0 text-muted-foreground/50" />
          <span className="flex items-center gap-1.5 bg-card/80 backdrop-blur-sm px-3 py-2 rounded-xl shadow-sm border">
            <Sparkles className="w-4 h-4 text-accent-foreground" />
            Zeit verdient!
          </span>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
