import { Clock, Shield, Brain, GraduationCap, Trophy, BarChart3 } from 'lucide-react';

// Titel und Erklaerungen wie bisher (vorher Vorder- und Rueckseite der Kacheln).
const usps = [
  {
    icon: Clock,
    title: 'Bildschirmzeit als Belohnung',
    text: 'Pro richtige Antwort gibt es Bildschirmzeit – Eltern legen pro Fach fest, wie viele Sekunden eine Aufgabe wert ist.',
  },
  {
    icon: Shield,
    title: 'Eltern behalten die Kontrolle',
    text: 'Eltern setzen ein tägliches Zeitlimit (Wochentag/Wochenende), schalten Fächer sichtbar oder unsichtbar und setzen individuelle Schwerpunkte.',
  },
  {
    icon: Brain,
    title: 'KI-Lernplan für Klassenarbeiten',
    text: 'Eltern geben Fach, Thema und Termin an – LernZeit erstellt daraus einen Übungsplan, dessen Aufgaben direkt im Spiel des Kindes auftauchen.',
  },
  {
    icon: BarChart3,
    title: 'Lernanalyse für Eltern',
    text: 'Eltern sehen Lerntrends, Erfolgsquoten und Fehlerschwerpunkte – mit individuellen Empfehlungen für jedes Kind.',
  },
  {
    icon: GraduationCap,
    title: 'Lehrplanorientiert',
    text: 'Inhalte orientieren sich an deutschen Lehrplänen und werden passend zur Klassenstufe ausgespielt.',
  },
  {
    icon: Trophy,
    title: 'Achievements & Streaks',
    text: 'Kinder sammeln Achievements und halten Lern-Streaks aufrecht – das motiviert zum regelmäßigen Lernen.',
  },
];

const USPSection = () => (
  <section className="border-t border-slate-200/80 bg-[var(--lp-soft)] py-24 lg:py-32">
    <div className="lp-container">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div data-zeigen className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <p className="lp-eyebrow">Unsere Stärken</p>
            <h2 className="mt-4 text-[2.125rem] font-extrabold leading-[1.08] sm:text-5xl">
              Was LernZeit besonders macht
            </h2>
          </div>
        </div>

        <div className="grid gap-px overflow-hidden rounded-[28px] bg-slate-200/70 ring-1 ring-slate-200/70 sm:grid-cols-2 lg:col-span-8">
          {usps.map((u, i) => (
            <div
              key={u.title}
              data-zeigen
              style={{ '--lp-verzug': `${(i % 2) * 90}ms` } as React.CSSProperties}
              className="bg-white p-7 sm:p-8"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--lp-ink)] text-white">
                <u.icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
              </span>
              <h3 className="mt-5 text-lg font-bold">{u.title}</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed">{u.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default USPSection;
