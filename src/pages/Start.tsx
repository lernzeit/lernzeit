import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import HeroSection from '@/components/landing/HeroSection';
import HowItWorks from '@/components/landing/HowItWorks';
import USPSection from '@/components/landing/USPSection';
import TargetAudience from '@/components/landing/TargetAudience';
import SetupSteps from '@/components/landing/SetupSteps';
import PricingComparison from '@/components/landing/PricingComparison';
import LegalFooter from '@/components/layout/LegalFooter';
import Seo from '@/components/Seo';
import FaqSection from '@/components/landing/FaqSection';
import { Link } from 'react-router-dom';
import { sichtbareArtikel } from '@/content/ratgeber';
import { trackFireAndForget } from '@/lib/analytics';
import { useAbschnittMessung } from '@/hooks/useAbschnittMessung';
import { useScrollEffekte } from '@/hooks/useScrollEffekte';

const Start = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Welche Abschnitte gesehen wurden (data-abschnitt), seit 04.10.2026
  const seite = useRef<HTMLElement>(null);
  useAbschnittMessung(seite);
  useScrollEffekte(seite);

  // Einladungslink der Eltern (/start?code=123456) → direkt zur Kind-Registrierung
  useEffect(() => {
    const code = (searchParams.get('code') || '').replace(/\D/g, '').slice(0, 6);
    if (code.length === 6) {
      navigate(`/?auth=true&code=${code}`, { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <main ref={seite} className="lz-landing relative min-h-screen bg-background pt-safe-top pb-safe-bottom px-safe">
      <Seo
        title="LernZeit – Lernen belohnen. Handyzeit verdienen."
        description="Kinder lösen Aufgaben und verdienen pro richtiger Antwort Bildschirmzeit. Lehrplanorientiert für Klasse 1–10. Jetzt starten."
        path="/start"
      />
      {/* Lesefortschritt (Wert aus useScrollEffekte) */}
      <div
        aria-hidden="true"
        className="fixed left-0 right-0 z-30 h-1 origin-left bg-gradient-to-r from-primary via-secondary to-accent pointer-events-none"
        style={{ top: 'env(safe-area-inset-top, 0px)', transform: 'scaleX(var(--lz-fortschritt, 0))' }}
      />
      {/* Ratgeber-Link nur, wenn es sichtbare Artikel gibt */}
      {sichtbareArtikel().length > 0 && (
        <div className="absolute right-4 top-4 z-20 pt-safe-top">
          <Link to="/ratgeber" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Ratgeber
          </Link>
        </div>
      )}
      <HeroSection />
      <TargetAudience />
      <HowItWorks />
      <USPSection />
      <SetupSteps />
      <PricingComparison />
      <FaqSection />

      {/* Footer CTA und rechtliche Links: Abschnitt "fusszeile" */}
      <div data-abschnitt="fusszeile">
      <section className="py-24 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
        <div data-parallax="0.2" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] max-w-full bg-gradient-to-br from-primary/15 via-secondary/15 to-accent/10 rounded-full blur-[100px] animate-pulse pointer-events-none" />
        <div className="relative">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
            Jetzt starten
          </h2>
          <p className="text-muted-foreground mb-10 max-w-md mx-auto text-lg">
            Melde dich an und teste alle Funktionen – die ersten 4 Wochen sind kostenlos.
          </p>
          <Button
            onClick={() => {
              trackFireAndForget('landing_cta_click', { position: 'footer' });
              navigate('/?auth=true');
            }}
            size="lg"
            className="h-14 px-10 text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            Kostenlos registrieren
            <ArrowRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </section>

      <LegalFooter className="pb-8" />
      </div>
    </main>
  );
};

export default Start;
