import { UserPlus, Share2, Smartphone } from 'lucide-react';

// Die Einrichtung besteht aus ZWEI Konten – deinem und dem deines Kindes.
// Genau das stand bisher nirgends auf der Seite, und genau daran ist ein Teil
// der Eltern haengengeblieben: neun von sechzehn haben nie ein Kind verknuepft.
const steps = [
  {
    icon: UserPlus,
    title: 'Du legst dein Elternkonto an',
    text: 'Registrierung in unter einer Minute – 4 Wochen alle Funktionen kostenlos, keine Zahlungsdaten nötig.',
  },
  {
    icon: Share2,
    title: 'Du lädst dein Kind ein',
    text: 'Du erzeugst eine Einladung und schickst sie als Link – oder liest den 6-stelligen Code vor. Beides ist dasselbe, nur anders verpackt.',
  },
  {
    icon: Smartphone,
    title: 'Dein Kind meldet sich damit an',
    text: 'Mit Klassenstufe, auf seinem eigenen Gerät – danach seid ihr verknüpft. Geht auch andersherum: erst anmelden, später verbinden.',
  },
];

const SetupSteps = () => (
  <section className="py-24 lg:py-32">
    <div className="lp-container grid gap-12 lg:grid-cols-12 lg:gap-8">
      <div data-zeigen className="lg:col-span-5">
        <p className="lp-eyebrow">Einrichtung</p>
        <h2 className="mt-4 text-[2.125rem] font-extrabold leading-[1.08] sm:text-5xl">
          So richtest du es in 3 Minuten ein
        </h2>
        <p className="mt-6 max-w-md text-[0.9375rem] leading-relaxed">
          Dein Kind kann die App auch auf deinem Gerät nutzen. Der Sinn der verdienten
          Bildschirmzeit entfaltet sich aber erst, wenn es ein eigenes Gerät hat.
        </p>
      </div>

      <ol className="relative lg:col-span-7 lg:pl-8">
        {steps.map((step, i) => (
          <li
            key={step.title}
            data-zeigen
            style={{ '--lp-verzug': `${i * 110}ms` } as React.CSSProperties}
            className="relative flex gap-5 pb-10 last:pb-0 sm:gap-7"
          >
            {/* Verbindungslinie zum naechsten Schritt */}
            {i < steps.length - 1 && (
              <span aria-hidden="true" className="absolute left-[23px] top-14 bottom-2 w-px bg-gradient-to-b from-slate-300 to-slate-200" />
            )}
            <span className="lp-display relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-[0.9375rem] font-bold text-[var(--lp-ink)] ring-1 ring-slate-200 shadow-sm">
              {i + 1}
            </span>
            <div className="min-w-0 pt-1.5">
              <div className="flex items-center gap-2.5">
                <step.icon className="h-[18px] w-[18px] text-[var(--lp-blue)]" strokeWidth={2.1} />
                <h3 className="text-lg font-bold">{step.title}</h3>
              </div>
              <p className="mt-2 max-w-xl text-[0.9375rem] leading-relaxed">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default SetupSteps;
