import { Button } from '@/components/ui/button';
import { BookOpen, ArrowRight, Sparkles, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-accent/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        {/* Trust badge */}
        <div className="inline-flex items-center gap-2 bg-card/80 backdrop-blur-sm border rounded-full px-4 py-2 mb-8 shadow-sm">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-accent text-accent" />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">Lehrplanorientiert · Klasse 1–10</span>
        </div>

        {/* Logo */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-3xl mb-8 shadow-xl animate-scale-in">
          <BookOpen className="w-10 h-10 text-primary-foreground" />
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold mb-6 leading-[1.1] tracking-tight">
          Lernen belohnen.{' '}
          <br />
          <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
            Handyzeit verdienen.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
          Kinder lösen Aufgaben und verdienen pro richtige Antwort Bildschirmzeit
          – wie viel, bestimmen die Eltern.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Button
            onClick={() => navigate('/?auth=true')}
            size="lg"
            className="h-14 px-10 text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            Kostenlos starten
            <ArrowRight className="w-5 h-5 ml-1" />
          </Button>
          <Button
            onClick={() => navigate('/?demo=true')}
            variant="outline"
            size="lg"
            className="h-14 px-10 text-lg font-semibold rounded-full border-2 hover:bg-muted/50 transition-all duration-300 hover:scale-105"
          >
            Demo ausprobieren
          </Button>
        </div>

        {/* Visual flow */}
        <div className="flex items-center justify-center gap-3 sm:gap-6">
          {[
            { icon: Sparkles, label: 'Fach wählen', color: 'text-primary' },
            { icon: Sparkles, label: 'Aufgabe lösen', color: 'text-secondary' },
            { icon: Sparkles, label: 'Zeit verdient!', color: 'text-accent' },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center gap-3 sm:gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-card border-2 rounded-2xl flex items-center justify-center shadow-sm">
                  <step.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${step.color}`} />
                </div>
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">{step.label}</span>
              </div>
              {i < 2 && <ArrowRight className="w-4 h-4 text-muted-foreground/40 mb-6" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
