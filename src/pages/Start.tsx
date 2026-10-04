import { useEffect, useRef } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
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
import LandingNav from '@/components/landing/LandingNav';
import FaktenLeiste from '@/components/landing/FaktenLeiste';
import { trackFireAndForget } from '@/lib/analytics';
import { useAbschnittMessung } from '@/hooks/useAbschnittMessung';
import { useLandingBewegung } from '@/hooks/useLandingBewegung';

const Start = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Welche Abschnitte gesehen wurden (data-abschnitt), seit 04.10.2026
  const seite = useRef<HTMLElement>(null);
  useAbschnittMessung(seite);
  useLandingBewegung(seite);

  // Einladungslink der Eltern (/start?code=123456) → direkt zur Kind-Registrierung
  useEffect(() => {
    const code = (searchParams.get('code') || '').replace(/\D/g, '').slice(0, 6);
    if (code.length === 6) {
      navigate(`/?auth=true&code=${code}`, { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <main ref={seite} className="lp relative min-h-screen pb-safe-bottom px-safe">
      <Seo
        title="LernZeit – Lernen belohnen. Handyzeit verdienen."
        description="Kinder lösen Aufgaben und verdienen pro richtiger Antwort Bildschirmzeit. Lehrplanorientiert für Klasse 1–10. Jetzt starten."
        path="/start"
      />
      <LandingNav />
      <HeroSection />
      <FaktenLeiste />
      <HowItWorks />
      <TargetAudience />
      <USPSection />
      <SetupSteps />
      <PricingComparison />
      <FaqSection />

      {/* Footer CTA und rechtliche Links: Abschnitt "fusszeile" */}
      <div data-abschnitt="fusszeile">
        <section className="px-3 pb-6 sm:px-5 sm:pb-10">
          <div className="lp-dunkel relative overflow-hidden rounded-[28px] bg-[var(--lp-ink)] px-6 py-20 text-center sm:rounded-[36px] lg:py-28">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_60%_at_50%_0%,rgba(59,130,246,0.32),transparent_70%),radial-gradient(30%_40%_at_85%_100%,rgba(18,183,106,0.16),transparent_70%)]"
            />
            <div data-zeigen className="relative mx-auto max-w-xl">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg">
                <BookOpen className="h-7 w-7 text-white" strokeWidth={2.1} />
              </span>
              <h2 className="mt-8 text-[2.375rem] font-extrabold leading-[1.05] sm:text-6xl">Jetzt starten</h2>
              <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-slate-300">
                Melde dich an und teste alle Funktionen – die ersten 4 Wochen sind kostenlos.
              </p>
              <button
                type="button"
                onClick={() => {
                  trackFireAndForget('landing_cta_click', { position: 'footer' });
                  navigate('/?auth=true');
                }}
                className="group mt-10 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-8 text-[1.0625rem] font-semibold text-[var(--lp-ink)] transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Kostenlos registrieren
                <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </section>

        <LegalFooter className="pb-8 pt-6" />
      </div>
    </main>
  );
};

export default Start;
