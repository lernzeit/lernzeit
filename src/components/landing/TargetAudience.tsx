import { Clock, Settings, Eye, BarChart3, Gamepad2, Lightbulb } from 'lucide-react';
import Handy from './Handy';

const childFeatures = [
  { icon: Gamepad2, text: 'Spielerisch lernen mit Achievements und Streaks' },
  { icon: Clock, text: 'Eigene Bildschirmzeit verdienen – pro richtige Antwort' },
  { icon: Lightbulb, text: 'KI-Erklärungen bei Fehlern – mit Vorlese-Funktion' },
];

const parentFeatures = [
  { icon: Clock, text: 'Tägliches Zeitlimit festlegen (Wochentag / Wochenende)' },
  { icon: Settings, text: 'Belohnung pro Aufgabe je Fach individuell einstellen' },
  { icon: Eye, text: 'Fächer sichtbar/unsichtbar schalten und Schwerpunkte setzen' },
  { icon: BarChart3, text: 'Lernfortschritte verfolgen' },
];

const Liste = ({ punkte, farbe }: { punkte: typeof parentFeatures; farbe: string }) => (
  <ul className="mt-8 space-y-4">
    {punkte.map((f) => (
      <li key={f.text} className="flex items-start gap-3.5">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${farbe}`}>
          <f.icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
        </span>
        <span className="pt-[7px] text-[0.9375rem] leading-snug text-slate-700">{f.text}</span>
      </li>
    ))}
  </ul>
);

const TargetAudience = () => (
  <section className="py-24 lg:py-32">
    <div className="lp-container">
      <div data-zeigen className="mx-auto max-w-2xl text-center">
        <p className="lp-eyebrow">Für Eltern und Kinder</p>
        <h2 className="mt-4 text-[2.125rem] font-extrabold leading-[1.08] sm:text-5xl">
          Eine App. <span className="text-slate-400">Zwei Ansichten.</span>
        </h2>
      </div>

      <div className="mt-14 grid gap-5 lg:mt-16 lg:grid-cols-2 lg:gap-6">
        {/* Eltern */}
        <article data-zeigen className="rounded-[28px] bg-white p-8 ring-1 ring-slate-200 sm:p-10">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[0.8125rem] font-semibold text-[var(--lp-blue)]">
            Elternmodus
          </span>
          <p className="lp-display mt-5 text-xl font-semibold leading-snug text-[var(--lp-ink)] sm:text-2xl">
            Deine Eltern-Ansicht mit voller Kontrolle.
          </p>
          <p className="mt-3 text-[0.9375rem] leading-relaxed">
            Stelle Zeitlimits, Belohnungen und Fächersichtbarkeit individuell ein.
          </p>
          <Liste punkte={parentFeatures} farbe="bg-blue-50 text-[var(--lp-blue)]" />
        </article>

        {/* Kinder, mit echtem Bildschirm */}
        <article
          data-zeigen
          style={{ '--lp-verzug': '120ms' } as React.CSSProperties}
          className="relative overflow-hidden rounded-[28px] bg-[var(--lp-soft)] p-8 ring-1 ring-blue-100 sm:p-10"
        >
          <div className="relative z-10 sm:max-w-[55%] lg:max-w-[54%]">
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[0.8125rem] font-semibold text-emerald-700 ring-1 ring-emerald-100">
              Kindermodus
            </span>
            <p className="lp-display mt-5 text-xl font-semibold leading-snug text-[var(--lp-ink)] sm:text-2xl">
              Spielerisch und motivierend.
            </p>
            <p className="mt-3 text-[0.9375rem] leading-relaxed">
              In der Kinder-Ansicht können Aufgaben gelöst und Bildschirmzeit verdient werden.
            </p>
            <Liste punkte={childFeatures} farbe="bg-white text-[var(--lp-green)] ring-1 ring-emerald-100" />
          </div>
          <div className="-mb-10 mt-10 flex h-[300px] justify-center overflow-hidden sm:absolute sm:-bottom-24 sm:right-7 sm:mb-0 sm:mt-0 sm:h-auto sm:overflow-visible lg:-bottom-20">
            <Handy bild="/landing/klasse.webp" alt="Kinder-Ansicht: Klassenwahl von Klasse 1 bis 10" className="text-[2.2px] sm:text-[2px]" />
          </div>
        </article>
      </div>
    </div>
  </section>
);

export default TargetAudience;
