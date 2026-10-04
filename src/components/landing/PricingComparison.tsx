import { Check, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { trackFireAndForget } from '@/lib/analytics';

const features = [
  { name: 'Alle Fächer Klasse 1–10', free: true, premium: true },
  { name: 'Bildschirmzeit verdienen', free: true, premium: true },
  { name: 'KI-Lernplan für Klassenarbeiten', free: false, premium: true },
  { name: 'Schwerpunktfächer festlegen', free: false, premium: true },
  { name: 'Belohnung pro Fach anpassen', free: false, premium: true },
  { name: 'Individuelle Zeitlimits', free: false, premium: true },
  { name: 'Erweiterte Lernanalyse', free: false, premium: true },
];

const PricingComparison = () => {
  const navigate = useNavigate();

  // In the native app (iOS/Android) we must not show web pricing or link to
  // the Stripe checkout. Purchases go exclusively through the RevenueCat
  // paywall inside the app (opened from the dashboard after sign-in).
  if (Capacitor.isNativePlatform()) {
    return null;
  }

  return (
    <section data-abschnitt="preise" id="preise" className="scroll-mt-20 bg-[var(--lp-heft)] py-24 lg:py-32">
      <div className="lp-container">
        <div className="max-w-2xl">
          <h2 className="text-[2.25rem] font-extrabold sm:text-5xl">
            Jetzt starten, jederzeit upgraden
          </h2>
          <p className="mt-5 text-lg leading-relaxed">
            Nach der Anmeldung stehen dir 4 Wochen lang alle Premium-Funktionen kostenlos zur Verfügung.
          </p>
          <p className="mt-2 font-semibold text-[var(--lp-tinte)]">
            4 Wochen alle Funktionen kostenlos – keine Zahlungsdaten nötig.
          </p>
        </div>

        <div className="mt-12 grid max-w-4xl gap-5 md:grid-cols-2 lg:mt-14 lg:gap-6">
          {/* Kostenlos */}
          <div className="flex flex-col rounded-[24px] bg-white p-8 ring-1 ring-[var(--lp-karo)] sm:p-10">
            <h3 className="text-xl font-bold">Kostenlos</h3>
            <p className="mt-1 text-[0.9375rem] text-[var(--lp-leise)]">Für immer gratis</p>
            <p className="mt-8 flex items-baseline gap-1.5">
              <span className="text-5xl font-extrabold tracking-[-0.03em] text-[var(--lp-tinte)]">0 €</span>
              <span className="text-[0.9375rem] text-[var(--lp-leise)]">/Monat</span>
            </p>
            <ul className="mt-8 space-y-3.5 border-t border-[var(--lp-karo)] pt-8">
              {features.map((f) => (
                <li key={f.name} className={`flex items-center gap-3 text-[0.9375rem] ${f.free ? 'text-[var(--lp-text)]' : 'text-[var(--lp-leise)]'}`}>
                  {f.free ? (
                    <Check className="h-[18px] w-[18px] shrink-0 text-[var(--lp-gruen)]" strokeWidth={2.5} />
                  ) : (
                    <Minus className="h-[18px] w-[18px] shrink-0 text-[#c9d3f2]" strokeWidth={2.5} />
                  )}
                  {f.name}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                trackFireAndForget('landing_cta_click', { position: 'pricing_free' });
                navigate('/?auth=true');
              }}
              className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-white text-[0.9375rem] font-bold text-[var(--lp-tinte)] ring-1 ring-[var(--lp-karo)] transition hover:bg-[var(--lp-heft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-blau)]"
            >
              Jetzt starten
            </button>
          </div>

          {/* Premium */}
          <div className="lp-band lp-karo relative flex flex-col overflow-hidden rounded-[24px] p-8 shadow-[0_30px_60px_-30px_rgba(26,43,109,0.6)] sm:p-10">
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">Premium</h3>
                <p className="mt-1 text-[0.9375rem] text-[#aab6e3]">Volle Kontrolle über Zeit und Fächer</p>
              </div>
              <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[0.8125rem] font-semibold text-white ring-1 ring-inset ring-white/15">
                4 Wochen gratis
              </span>
            </div>
            <div className="relative mt-8">
              <p className="flex items-baseline gap-1.5">
                <span className="text-5xl font-extrabold tracking-[-0.03em] text-white">2,99 €</span>
                <span className="text-[0.9375rem] text-[#aab6e3]">/Monat</span>
              </p>
              <p className="mt-2 text-[0.9375rem] text-[#aab6e3]">
                oder <span className="font-semibold text-white">29,99 € /Jahr</span> (spare ~16 %)
              </p>
            </div>
            <ul className="relative mt-8 space-y-3.5 border-t border-white/10 pt-8">
              {features.map((f) => (
                <li key={f.name} className="flex items-center gap-3 text-[0.9375rem] text-[#e4e9fb]">
                  <Check className="h-[18px] w-[18px] shrink-0 text-[var(--lp-gruen-hell)]" strokeWidth={2.75} />
                  {f.name}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                trackFireAndForget('landing_cta_click', { position: 'pricing_premium' });
                navigate('/?auth=true');
              }}
              className="relative mt-10 inline-flex h-12 items-center justify-center rounded-full bg-white text-[0.9375rem] font-bold text-[var(--lp-tinte)] transition-colors hover:bg-[#e8eeff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Jetzt testen
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingComparison;
