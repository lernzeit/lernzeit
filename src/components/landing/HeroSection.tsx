import { Check, Play } from 'lucide-react';
import { StoreLinks } from '@/components/landing/StoreLinks';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { trackFireAndForget } from '@/lib/analytics';
import Handy from './Handy';
import Randnotiz from './Randnotiz';

const verzug = (ms: number) => ({ '--lp-verzug': `${ms}ms` }) as React.CSSProperties;

// Fakten aus src/content/faq.ts und dem bisherigen Seitentext
const FAKTEN = ['Klasse 1 bis 10, nach Lehrplan', '4 Wochen alle Funktionen kostenlos', 'Keine Zahlungsdaten nötig', 'Server in der EU'];

const HeroSection = () => {
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();

  return (
    <section data-abschnitt="hero" className="relative overflow-hidden">
      {/* Karo wie im Rechenheft, zu den Raendern hin ausgeblendet */}
      <div
        aria-hidden="true"
        className="lp-karo pointer-events-none absolute inset-0 [mask-image:radial-gradient(75%_80%_at_72%_40%,#000_30%,transparent_80%)]"
      />

      <div className="lp-container relative grid items-center gap-16 pb-20 pt-10 sm:pt-14 lg:grid-cols-12 lg:gap-6 lg:pb-28 lg:pt-12">
        <div className="lg:col-span-7">
          <h1
            className="lp-auftritt text-[2.75rem] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-[3.5rem] lg:whitespace-nowrap lg:text-[3rem] xl:text-[3.5rem]"
            style={verzug(0)}
          >
            {/* Punkt nachgerueckt: In Plus Jakarta steht er nach "n" sonst sichtbar ab */}
            Lernen belohnen<span className="-ml-[0.05em]">.</span>
            <br />
            Handyzeit verdienen<span className="-ml-[0.05em]">.</span>
            {/* Haken wie unter einer richtigen Aufgabe */}
            <svg
              aria-hidden="true"
              viewBox="0 0 60 44"
              className="ml-2 inline-block h-[0.62em] w-[0.85em] -translate-y-[0.06em] align-baseline text-[var(--lp-gruen-hell)]"
              fill="none"
              stroke="currentColor"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path className="lp-strich" pathLength={1} d="M5 24 L21 39 L55 5" style={verzug(650)} />
            </svg>
          </h1>

          <p className="lp-auftritt mt-6 max-w-[31rem] text-[1.1875rem] leading-relaxed sm:text-xl" style={verzug(120)}>
            Kinder lösen Aufgaben und verdienen pro richtige Antwort Bildschirmzeit
            – wie viel, bestimmen die Eltern.
          </p>

          <div className="lp-auftritt mt-9 flex flex-col gap-3 sm:flex-row sm:items-center" style={verzug(220)}>
            <button
              type="button"
              onClick={() => {
                trackFireAndForget('landing_cta_click', { position: 'hero' });
                navigate('/?auth=true');
              }}
              className="inline-flex h-[54px] items-center justify-center rounded-full bg-[var(--lp-blau)] px-8 text-[1.0625rem] font-bold text-white shadow-[0_10px_24px_-10px_rgba(37,99,235,0.7)] transition-colors hover:bg-[#1d4ed8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-blau)]"
            >
              Kostenlos registrieren
            </button>
            {!isNative && (
              <button
                type="button"
                onClick={() => {
                  trackFireAndForget('demo_started', { position: 'hero' });
                  navigate('/?demo=true');
                }}
                className="inline-flex h-[54px] items-center justify-center gap-3 rounded-full px-6 text-[1.0625rem] font-bold text-[var(--lp-tinte)] ring-1 ring-inset ring-[var(--lp-karo)] transition hover:bg-[var(--lp-heft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-blau)] sm:ring-0"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--lp-tinte)]">
                  <Play className="ml-[2px] h-3.5 w-3.5 fill-white text-white" />
                </span>
                Demo ausprobieren
              </button>
            )}
          </div>

          <p className="lp-auftritt mt-4 text-[0.9375rem] text-[var(--lp-leise)]" style={verzug(260)}>
            Schon ein Konto?{' '}
            <button
              type="button"
              onClick={() => navigate('/?auth=true&anmelden=1')}
              className="font-bold text-[var(--lp-blau)] underline-offset-4 hover:underline"
            >
              Anmelden
            </button>
          </p>

          <div className="lp-auftritt mt-4" style={verzug(280)}>
            <StoreLinks stelle="hero" />
          </div>

          <ul className="lp-auftritt mt-9 grid max-w-[40rem] gap-x-8 gap-y-2.5 text-[0.9375rem] sm:grid-cols-2" style={verzug(320)}>
            {FAKTEN.map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-[var(--lp-gruen)]" strokeWidth={3} />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Zwei echte Bildschirme: Kind loest Aufgaben, Eltern sehen die Anfrage */}
        <div className="relative lg:col-span-5">
          {/* Bis 1024 px: nur das Kind */}
          <div className="relative mx-auto w-max pt-20 lg:hidden">
            <Randnotiz farbe="gruen" pfeil="unten" drehung={-4} verzug={900} className="absolute -left-2 top-0 w-[12rem] text-[1.125rem] sm:-left-16">
              +30 Sek. für jede richtige Aufgabe
            </Randnotiz>
            <div className="lp-auftritt-handy" style={verzug(250)}>
              <Handy bild="/landing/demo-aufgaben.webp" video="/landing/demo-aufgaben" alt="Kind-Ansicht: Mia löst Mathe-Aufgaben der 3. Klasse" className="text-[2.35px]" />
            </div>
          </div>

          {/* Ab 1024 px: Kind vorne, Eltern dahinter, Notizen darueber */}
          <div className="relative ml-auto hidden h-[600px] w-[400px] lg:block xl:h-[680px] xl:w-[480px]">
            <div className="lp-auftritt-handy absolute left-0 top-[84px] z-10" style={verzug(250)}>
              <Handy bild="/landing/demo-aufgaben.webp" video="/landing/demo-aufgaben" alt="Kind-Ansicht: Mia löst Mathe-Aufgaben der 3. Klasse" className="text-[2.1px] xl:text-[2.45px]" />
            </div>
            <div className="lp-auftritt-handy absolute right-0 top-[150px] xl:top-[170px]" style={verzug(450)}>
              <Handy bild="/landing/eltern-anfrage.webp" alt="Eltern-Ansicht: Anfrage von Mia über 8 Minuten mit Genehmigen und Ablehnen" className="text-[1.8px] xl:text-[2.1px]" />
            </div>
            <Randnotiz farbe="gruen" pfeil="unten" drehung={-4} verzug={1000} className="absolute left-0 top-0 z-20 w-[11rem] text-[1.1875rem] xl:text-[1.3125rem]">
              +30 Sek. für jede richtige Aufgabe
            </Randnotiz>
            <Randnotiz pfeil="unten" drehung={3} verzug={1300} className="absolute right-0 top-[38px] z-20 w-[11.5rem] text-[1.1875rem] xl:top-[48px] xl:w-[12.5rem] xl:text-[1.3125rem]">
              Du entscheidest, ob Mia die Zeit bekommt.
            </Randnotiz>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
