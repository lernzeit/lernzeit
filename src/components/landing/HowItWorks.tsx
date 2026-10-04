import Handy from './Handy';

// Texte unveraendert; die Bilder sind Standbilder der echten Demo
// (public/landing, erzeugt mit `npm run werbung:landing`).
const steps = [
  {
    number: '01',
    title: 'Fach wählen',
    description: 'Mathe, Deutsch, Englisch und viele weitere Fächer – von Klasse 1 bis 10.',
    bild: '/landing/fach.webp',
    alt: 'Fachwahl: Mathe, Deutsch, Sachkunde, Englisch',
  },
  {
    number: '02',
    title: 'Aufgaben lösen',
    description: 'Altersgerechte Fragen beantworten – bei Fehlern hilft der KI-Tutor mit Erklärungen.',
    bild: '/landing/aufgabe.webp',
    alt: 'Aufgabe „Wie viel ist 7 · 6?“ mit eingegebener Antwort',
  },
  {
    number: '03',
    title: 'Zeit verdienen',
    description: 'Pro richtige Antwort erhalten Kinder Bildschirmzeit – Eltern legen die Sekunden pro Fach fest.',
    bild: '/landing/richtig.webp',
    alt: 'Rückmeldung „Super!“ nach der richtigen Antwort',
  },
];

const HowItWorks = () => (
  <section data-abschnitt="so_funktionierts" id="so-funktionierts" className="scroll-mt-20 px-3 py-6 sm:px-5 sm:py-10">
    <div className="lp-dunkel relative overflow-hidden rounded-[28px] bg-[var(--lp-ink)] py-20 text-slate-300 sm:rounded-[36px] lg:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_45%_at_15%_0%,rgba(59,130,246,0.22),transparent_70%),radial-gradient(40%_40%_at_100%_100%,rgba(18,183,106,0.14),transparent_70%)]"
      />
      <div className="lp-container relative">
        <div data-zeigen className="max-w-2xl">
          <p className="lp-eyebrow !text-blue-300">So einfach geht's</p>
          <h2 className="mt-4 text-[2.125rem] font-extrabold leading-[1.08] sm:text-5xl">
            In drei Schritten zur verdienten Zeit
          </h2>
        </div>

        <ol className="mt-14 grid gap-5 md:grid-cols-3 lg:mt-16 lg:gap-6">
          {steps.map((s, i) => (
            <li
              key={s.number}
              data-zeigen
              style={{ '--lp-verzug': `${i * 120}ms` } as React.CSSProperties}
              className="group relative flex flex-col overflow-hidden rounded-3xl bg-white/[0.04] ring-1 ring-inset ring-white/10"
            >
              <div className="p-7 pb-0 sm:p-8 sm:pb-0">
                <span className="lp-display text-sm font-bold tracking-[0.08em] text-blue-300">{s.number}</span>
                <h3 className="mt-3 text-[1.375rem] font-bold">{s.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-slate-400">{s.description}</p>
              </div>
              {/* Handy ragt unten aus der Karte */}
              <div className="relative mt-auto flex h-[290px] justify-center overflow-hidden pt-8">
                <div className="transition-transform duration-700 ease-out group-hover:-translate-y-2">
                  <Handy bild={s.bild} alt={s.alt} className="text-[2.4px]" />
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0f1626] to-transparent" />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  </section>
);

export default HowItWorks;
