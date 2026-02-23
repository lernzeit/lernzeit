import { Button } from '@/components/ui/button';
import { BookOpen, ArrowRight, Star, GraduationCap, Brain, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';

const HeroSection = () => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('animate-in')),
      { threshold: 0.1 }
    );
    sectionRef.current?.querySelectorAll('.scroll-fade').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-accent/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        {/* Trust badge */}
        <div className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 inline-flex items-center gap-2 bg-card/80 backdrop-blur-sm border rounded-full px-4 py-2 mb-8 shadow-sm">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-accent text-accent" />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">Lehrplanorientiert · Klasse 1–10</span>
        </div>

        {/* Logo */}
        <div className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 delay-100 flex justify-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-3xl flex items-center justify-center shadow-xl">
            <BookOpen className="w-10 h-10 text-primary-foreground" />
          </div>
        </div>

        <h1 className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 delay-200 text-5xl sm:text-6xl md:text-7xl font-extrabold mb-6 leading-[1.1] tracking-tight">
          Lernen belohnen.{' '}
          <br />
          <span className="bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
            Handyzeit verdienen.
          </span>
        </h1>

        <p className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 delay-300 text-lg sm:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
          Kinder lösen Aufgaben und verdienen pro richtige Antwort Bildschirmzeit
          – wie viel, bestimmen die Eltern.
        </p>

        <div className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 delay-[400ms] flex flex-col sm:flex-row gap-4 justify-center mb-16">
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

        {/* Visual flow with matching icons */}
        <div className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 delay-500 flex items-center justify-center gap-4 sm:gap-8">
          {[
            { icon: GraduationCap, label: 'Fach wählen', bg: 'bg-primary', color: 'text-primary-foreground' },
            { icon: Brain, label: 'Aufgabe lösen', bg: 'bg-secondary', color: 'text-secondary-foreground' },
            { icon: Clock, label: 'Zeit verdient!', bg: 'bg-accent', color: 'text-accent-foreground' },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center gap-4 sm:gap-8">
              <div className="flex flex-col items-center gap-3">
                <div className={`w-16 h-16 sm:w-20 sm:h-20 ${step.bg} rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-lg`}>
                  <step.icon className={`w-7 h-7 sm:w-9 sm:h-9 ${step.color}`} />
                </div>
                <span className="text-sm sm:text-base font-semibold text-foreground">{step.label}</span>
              </div>
              {i < 2 && <ArrowRight className="w-5 h-5 text-muted-foreground/40 mb-8" />}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .animate-in { opacity: 1 !important; transform: translateY(0) !important; }
      `}</style>
    </section>
  );
};

export default HeroSection;
