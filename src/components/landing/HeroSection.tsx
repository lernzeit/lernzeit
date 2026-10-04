import { ArrowRight, Check, Clock, Play, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { trackFireAndForget } from '@/lib/analytics';
import Handy from './Handy';

/** Kurzer Hinweis neben dem Handy. Nur Aussagen aus src/content/faq.ts. */
const Hinweis = ({
  icon: Icon,
  farbe,
  titel,
  text,
  className = '',
  style,
}: {
  icon: typeof Clock;
  farbe: string;
  titel: string;
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <div
    className={`flex items-center gap-3 rounded-2xl bg-white/95 p-3 pr-5 shadow-[0_18px_40px_-16px_rgba(15,23,42,0.3)] ring-1 ring-slate-900/[0.06] backdrop-blur ${className}`}
    style={style}
  >
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${farbe}`}>
      <Icon className="h-5 w-5" strokeWidth={2.2} />
    </span>
    <span className="leading-tight">
      <span className="lp-display block text-[0.9375rem] font-bold">{titel}</span>
      <span className="mt-0.5 block text-[0.8125rem] text-slate-500">{text}</span>
    </span>
  </div>
);

const verzug = (ms: number) => ({ '--lp-verzug': `${ms}ms` }) as React.CSSProperties;

const HeroSection = () => {
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();

  return (
    <section data-abschnitt="hero" className="relative overflow-hidden">
      {/* Hintergrund: feines Punktraster und zwei ruhige Farbflaechen */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(55%_60%_at_78%_35%,rgba(59,130,246,0.13),transparent_70%),radial-gradient(35%_40%_at_92%_80%,rgba(18,183,106,0.10),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(11,18,32,0.07)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(70%_70%_at_70%_40%,#000,transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-white" />
      </div>

      <div className="lp-container relative grid items-center gap-14 pb-20 pt-8 sm:pt-12 lg:grid-cols-12 lg:gap-8 lg:pb-28 lg:pt-14">
        <div className="lg:col-span-7">
          <div
            className="lp-auftritt inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3.5 py-1.5 text-[0.8125rem] font-medium text-slate-600 shadow-sm backdrop-blur"
            style={verzug(0)}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--lp-green)]" />
            Lehrplanorientiert · Klasse 1–10
          </div>

          <h1
            className="lp-auftritt mt-6 text-[2.875rem] font-extrabold leading-[1.04] tracking-[-0.035em] sm:text-6xl lg:whitespace-nowrap lg:text-[3.375rem] xl:text-[3.875rem]"
            style={verzug(80)}
          >
            {/* Punkt nachgeruekt: In Plus Jakarta steht er nach "n" sonst sichtbar ab */}
            Lernen belohnen<span className="-ml-[0.05em]">.</span>
            <br />
            <span className="text-[var(--lp-blue)]">
              Handyzeit verdienen<span className="-ml-[0.05em]">.</span>
            </span>
          </h1>

          <p className="lp-auftritt mt-6 max-w-[33rem] text-lg leading-relaxed sm:text-xl" style={verzug(160)}>
            Kinder lösen Aufgaben und verdienen pro richtige Antwort Bildschirmzeit
            – wie viel, bestimmen die Eltern.
          </p>

          <div className="lp-auftritt mt-9 flex flex-col gap-3 sm:flex-row" style={verzug(240)}>
            <button
              type="button"
              onClick={() => {
                trackFireAndForget('landing_cta_click', { position: 'hero' });
                navigate('/?auth=true');
              }}
              className="group inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-[var(--lp-blue)] px-7 text-[1.0625rem] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(37,99,235,0.6)] transition-colors hover:bg-[#1d4ed8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-blue)]"
            >
              Jetzt starten
              <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
            </button>
            {!isNative && (
              <button
                type="button"
                onClick={() => {
                  trackFireAndForget('demo_started', { position: 'hero' });
                  navigate('/?demo=true');
                }}
                className="inline-flex h-[52px] items-center justify-center gap-2.5 rounded-full bg-white px-6 text-[1.0625rem] font-semibold text-[var(--lp-ink)] ring-1 ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-blue)]"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--lp-ink)]">
                  <Play className="ml-[1px] h-3 w-3 fill-white text-white" />
                </span>
                Demo ausprobieren
              </button>
            )}
          </div>

          <ul className="lp-auftritt mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-[0.9375rem] text-slate-600" style={verzug(320)}>
            {['4 Wochen alle Funktionen kostenlos', 'Keine Zahlungsdaten nötig', 'Server in der EU'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[var(--lp-green)]" strokeWidth={2.75} />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Echte App im Demo-Modus: Video vorne, Fachwahl dahinter */}
        <div className="relative mx-auto w-full max-w-[520px] lg:col-span-5 lg:mr-0">
          <div className="relative flex justify-center lg:justify-end lg:pr-2">
            <div data-tiefe="0.05" className="absolute -left-6 top-16 hidden lg:block">
              <div className="lp-auftritt-handy" style={verzug(420)}>
                <Handy bild="/landing/fach.webp" alt="LernZeit: Fachwahl in der Kinder-Ansicht" className="text-[2.25px]" />
              </div>
            </div>
            <div data-tiefe="-0.025" className="relative z-10">
              <div className="lp-auftritt-handy" style={verzug(250)}>
                <Handy
                  bild="/landing/demo-aufgaben.webp"
                  video="/landing/demo-aufgaben"
                  alt="LernZeit: Ein Kind löst Mathe-Aufgaben der 3. Klasse"
                  className="text-[2.4px] sm:text-[2.8px]"
                />
              </div>
            </div>

            <Hinweis
              icon={Clock}
              farbe="bg-emerald-50 text-[var(--lp-green)]"
              titel="+30 Sekunden"
              text="pro richtig gelöster Aufgabe"
              className="lp-auftritt absolute -left-1 bottom-[14%] z-20 sm:left-2 lg:-left-16 lg:bottom-[42%]"
              style={verzug(800)}
            />
            <Hinweis
              icon={ShieldCheck}
              farbe="bg-blue-50 text-[var(--lp-blue)]"
              titel="Du entscheidest"
              text="ob dein Kind die Zeit bekommt"
              className="lp-auftritt absolute -right-1 bottom-[12%] z-20 hidden sm:flex lg:-right-8"
              style={verzug(950)}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
