import { Check, Minus, ArrowRight } from 'lucide-react';
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
    <section data-abschnitt="preise" id="preise" className="scroll-mt-20 border-t border-slate-200/80 bg-[var(--lp-soft)] py-24 lg:py-32">
      <div className="lp-container">
        <div data-zeigen className="mx-auto max-w-2xl text-center">
          <p className="lp-eyebrow">Preise</p>
          <h2 className="mt-4 text-[2.125rem] font-extrabold leading-[1.08] sm:text-5xl">
            Jetzt starten, jederzeit upgraden
          </h2>
          <p className="mt-5 text-lg leading-relaxed">
            Nach der Anmeldung stehen dir 4 Wochen lang alle Premium-Funktionen kostenlos zur Verfügung.
          </p>
          <p className="mt-2 text-[0.9375rem] font-medium text-[var(--lp-ink)]">
            4 Wochen alle Funktionen kostenlos – keine Zahlungsdaten nötig.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-5 md:grid-cols-2 lg:mt-16 lg:gap-6">
          {/* Kostenlos */}
          <div data-zeigen className="flex flex-col rounded-[28px] bg-white p-8 ring-1 ring-slate-200 sm:p-10">
            <h3 className="text-xl font-bold">Kostenlos</h3>
            <p className="mt-1 text-[0.9375rem] text-slate-500">Für immer gratis</p>
            <p className="mt-8 flex items-baseline gap-1.5">
              <span className="lp-display text-5xl font-extrabold tracking-[-0.03em] text-[var(--lp-ink)]">0 €</span>
              <span className="text-[0.9375rem] text-slate-500">/Monat</span>
            </p>
            <ul className="mt-8 space-y-3.5 border-t border-slate-100 pt-8">
              {features.map((f) => (
                <li key={f.name} className={`flex items-center gap-3 text-[0.9375rem] ${f.free ? 'text-slate-700' : 'text-slate-400'}`}>
                  {f.free ? (
                    <Check className="h-[18px] w-[18px] shrink-0 text-[var(--lp-green)]" strokeWidth={2.5} />
                  ) : (
                    <Minus className="h-[18px] w-[18px] shrink-0 text-slate-300" strokeWidth={2.5} />
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
              className="mt-10 inline-flex h-12 items-center justify-center rounded-full bg-white text-[0.9375rem] font-semibold text-[var(--lp-ink)] ring-1 ring-slate-300 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-blue)]"
            >
              Jetzt starten
            </button>
          </div>

          {/* Premium */}
          <div
            data-zeigen
            style={{ '--lp-verzug': '120ms' } as React.CSSProperties}
            className="lp-dunkel relative flex flex-col overflow-hidden rounded-[28px] bg-[var(--lp-ink)] p-8 text-slate-300 shadow-[0_30px_60px_-30px_rgba(11,18,32,0.6)] sm:p-10"
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_100%_0%,rgba(59,130,246,0.35),transparent_70%)]" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">Premium</h3>
                <p className="mt-1 text-[0.9375rem] text-slate-400">Volle Kontrolle über Zeit und Fächer</p>
              </div>
              <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[0.8125rem] font-semibold text-white ring-1 ring-inset ring-white/15">
                4 Wochen gratis
              </span>
            </div>
            <div className="relative mt-8">
              <p className="flex items-baseline gap-1.5">
                <span className="lp-display text-5xl font-extrabold tracking-[-0.03em] text-white">2,99 €</span>
                <span className="text-[0.9375rem] text-slate-400">/Monat</span>
              </p>
              <p className="mt-2 text-[0.9375rem] text-slate-400">
                oder <span className="font-semibold text-white">29,99 € /Jahr</span> (spare ~16 %)
              </p>
            </div>
            <ul className="relative mt-8 space-y-3.5 border-t border-white/10 pt-8">
              {features.map((f) => (
                <li key={f.name} className="flex items-center gap-3 text-[0.9375rem] text-slate-200">
                  <Check className="h-[18px] w-[18px] shrink-0 text-blue-300" strokeWidth={2.5} />
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
              className="group relative mt-10 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--lp-blue)] text-[0.9375rem] font-semibold text-white transition-colors hover:bg-[#1d4ed8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Jetzt testen
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingComparison;
