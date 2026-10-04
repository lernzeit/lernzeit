import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import HeroSection from '@/components/landing/HeroSection';
import HowItWorks from '@/components/landing/HowItWorks';
import ZweiAnsichten from '@/components/landing/ZweiAnsichten';
import SetupSteps from '@/components/landing/SetupSteps';
import PricingComparison from '@/components/landing/PricingComparison';
import LegalFooter from '@/components/layout/LegalFooter';
import Seo from '@/components/Seo';
import FaqSection from '@/components/landing/FaqSection';
import LandingNav from '@/components/landing/LandingNav';
import { trackFireAndForget } from '@/lib/analytics';
import { useAbschnittMessung } from '@/hooks/useAbschnittMessung';
import { useLandingMotion } from '@/components/landing/useLandingMotion';

const Start = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Welche Abschnitte gesehen wurden (data-abschnitt), seit 04.10.2026
  const seite = useRef<HTMLElement>(null);
  useAbschnittMessung(seite);
  useLandingMotion(seite);

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
      <HowItWorks />
      <ZweiAnsichten />
      <SetupSteps />
      <PricingComparison />
      <FaqSection />

      {/* Footer CTA und rechtliche Links: Abschnitt "fusszeile" */}
      <div data-abschnitt="fusszeile">
        <section className="px-3 sm:px-5">
          <div className="lp-band lp-karo rounded-[28px] py-20 sm:rounded-[36px] lg:py-28">
            <div className="lp-container">
              <h2 className="text-[2.5rem] font-extrabold sm:text-6xl">Jetzt starten</h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed">
                Melde dich an und teste alle Funktionen – die ersten 4 Wochen sind kostenlos.
              </p>
              <button
                type="button"
                onClick={() => {
                  trackFireAndForget('landing_cta_click', { position: 'footer' });
                  navigate('/?auth=true');
                }}
                className="mt-10 inline-flex h-14 items-center justify-center rounded-full bg-white px-8 text-[1.0625rem] font-bold text-[var(--lp-tinte)] transition-colors hover:bg-[#e8eeff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Kostenlos registrieren
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
