import { BookOpen, Check, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { trackFireAndForget } from '@/lib/analytics';
import LoopVideo from './LoopVideo';
import { Button } from '@/components/ui/button';

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

      <div className="lp-container relative grid items-center gap-10 pb-16 pt-6 sm:pt-10 lg:grid-cols-12 lg:gap-10 lg:pb-20 lg:pt-12">
        <div className="min-w-0 lg:col-span-7">
          <div className="lp-logo mb-5 grid h-12 w-12 place-items-center rounded-xl" aria-hidden="true"><BookOpen className="h-6 w-6 text-primary-foreground" /></div>
          <h1
            className="lp-auftritt text-[2.25rem] font-extrabold leading-[1.02] tracking-normal sm:text-[3.5rem] lg:text-[3rem] xl:text-[3.5rem]"
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

          <p className="lp-auftritt mt-5 max-w-[31rem] text-[1.1875rem] leading-relaxed sm:text-xl" style={verzug(120)}>
            Kinder lösen Aufgaben und verdienen pro richtige Antwort Bildschirmzeit
            – wie viel, bestimmen die Eltern.
          </p>

          <div className="lp-auftritt mt-6 flex flex-col gap-3 sm:flex-row sm:items-center" style={verzug(220)}>
            <Button
              type="button"
              onClick={() => {
                trackFireAndForget('landing_cta_click', { position: 'hero' });
                navigate('/?auth=true');
              }}
              className="lp-hero-cta h-[54px] rounded-full px-8 text-[1.0625rem] font-bold"
            >
              Kostenlos registrieren
            </Button>
            {!isNative && (
              <Button
                type="button"
                onClick={() => {
                  trackFireAndForget('demo_started', { position: 'hero' });
                  navigate('/?demo=true');
                }}
                variant="ghost"
                className="lp-demo-cta h-[54px] gap-3 rounded-full px-6 text-[1.0625rem] font-bold"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--lp-tinte)]">
                  <Play className="ml-[2px] h-3.5 w-3.5 fill-primary-foreground text-primary-foreground" />
                </span>
                Demo ausprobieren
              </Button>
            )}
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

        <div className="mx-auto w-full max-w-[320px] lg:col-span-5 lg:max-w-[420px]" data-parallax>
          <div className="lp-loop-float">
            <LoopVideo name="kind" className="lp-loop-hero" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
