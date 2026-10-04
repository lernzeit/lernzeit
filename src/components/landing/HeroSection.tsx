import { Button } from '@/components/ui/button';
import { BookOpen, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { trackFireAndForget } from '@/lib/analytics';
import LoopVideo from './LoopVideo';

const HeroSection = () => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('animate-in')),
      { threshold: 0.1 }
    );
    sectionRef.current?.querySelectorAll('.scroll-fade').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} data-abschnitt="hero" className="relative min-h-[90vh] flex items-center overflow-hidden pt-safe-top">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
      <div data-parallax="0.25" className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div data-parallax="-0.2" className="absolute bottom-20 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />
      <div data-parallax="0.12" className="absolute top-1/3 right-1/3 w-64 h-64 bg-accent/10 rounded-full blur-[80px] animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-16 grid lg:grid-cols-[1.35fr_0.65fr] gap-12 lg:gap-16 items-center">
        <div className="text-center lg:text-left">
          {/* Trust badge */}
          <div className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 inline-flex items-center gap-2 bg-card/80 backdrop-blur-sm border rounded-full px-4 py-2 mb-8 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">Lehrplanorientiert · Klasse 1–10</span>
          </div>

          {/* Logo */}
          <div className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 delay-100 flex justify-center lg:justify-start mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-secondary rounded-3xl flex items-center justify-center shadow-xl">
              <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-5xl xl:text-[3.5rem] font-extrabold mb-6 leading-[1.1] tracking-tight lg:whitespace-nowrap">
            Lernen belohnen.{' '}
            <br />
            <span className="lz-verlauf bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              Handyzeit verdienen.
            </span>
          </h1>

          <p className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 delay-300 text-lg sm:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            Kinder lösen Aufgaben und verdienen pro richtige Antwort Bildschirmzeit
            – wie viel, bestimmen die Eltern.
          </p>

          <p className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 delay-300 -mt-8 mb-10 text-sm sm:text-base font-medium text-foreground">
            4 Wochen alle Funktionen kostenlos – keine Zahlungsdaten nötig.
          </p>

          <div className="scroll-fade opacity-0 translate-y-4 transition-all duration-700 delay-500 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Button
              onClick={() => {
                trackFireAndForget('landing_cta_click', { position: 'hero' });
                navigate('/?auth=true');
              }}
              size="lg"
              className="h-14 px-10 text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              Jetzt starten
              <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
            {!isNative && (
              <Button
                onClick={() => {
                  trackFireAndForget('demo_started', { position: 'hero' });
                  navigate('/?demo=true');
                }}
                variant="ghost"
                size="lg"
                className="h-14 px-8 text-base font-medium rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-300"
              >
                Demo ausprobieren
              </Button>
            )}
          </div>
        </div>

        {/* Motion-Loop: Aufgaben loesen, Zeit sammeln */}
        <div className="scroll-fade opacity-0 translate-y-4 transition-all duration-1000 delay-300 flex justify-center">
          <div className="relative w-full max-w-[260px] sm:max-w-[320px] lg:max-w-[360px]">
            <div data-parallax="-0.06">
              <div className="lz-schweben relative">
                <div className="absolute -inset-6 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/20 rounded-[3rem] blur-3xl pointer-events-none" />
                <div className="relative rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-foreground/5 bg-card">
                  <LoopVideo name="kind" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .animate-in { opacity: 1 !important; transform: translateY(0) !important; }
      `}</style>
    </section>
  );
};

export default HeroSection;
