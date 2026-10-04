import Handy from './Handy';

// Texte unveraendert. Bilder: echte Bildschirme (public/landing, erzeugt mit
// `npm run werbung:landing` und `npm run werbung:app-bilder`).
const steps = [
  {
    title: 'Fach wählen',
    description: 'Mathe, Deutsch, Englisch und viele weitere Fächer – von Klasse 1 bis 10.',
    bild: '/landing/fach.webp',
    alt: 'Fachwahl in der Kinder-Ansicht: Hefte für Mathe, Deutsch, Sachkunde, Englisch',
  },
  {
    title: 'Aufgaben lösen',
    description: 'Altersgerechte Fragen beantworten – bei Fehlern hilft der KI-Tutor mit Erklärungen.',
    bild: '/landing/aufgabe.webp',
    alt: 'Aufgabe „Wie viel ist 300 − 145?“, Antwort 155 in Rechenkästchen, darunter das Ziffernfeld',
  },
  {
    title: 'Zeit verdienen',
    description: 'Pro richtige Antwort erhalten Kinder Bildschirmzeit – Eltern legen die Sekunden pro Fach fest.',
    bild: '/landing/kind-verdient.webp',
    alt: 'Kinder-Ansicht: Zeit-Uhr mit 8 von 60 Minuten, Knöpfe „Lernen starten“ und „8 Min. anfragen“',
  },
];

const HowItWorks = () => (
  <section data-abschnitt="so_funktionierts" id="so-funktionierts" className="scroll-mt-20 px-3 sm:px-5">
    <div className="lp-band lp-karo overflow-hidden rounded-[28px] py-20 sm:rounded-[36px] lg:py-28">
      <div className="lp-container">
        <h2 className="max-w-xl text-[2.25rem] font-extrabold sm:text-5xl">In drei Schritten zur verdienten Zeit</h2>

        <ol className="mt-14 grid gap-5 md:grid-cols-3 lg:mt-16 lg:gap-6">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col overflow-hidden rounded-[22px] bg-white/[0.06] ring-1 ring-inset ring-white/[0.12]">
              <div className="p-7 pb-0 sm:p-8 sm:pb-0">
                <span className="grid h-9 w-9 place-items-center rounded-full text-[0.9375rem] font-bold text-white ring-1 ring-inset ring-white/40">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-[1.375rem] font-bold">{s.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-[#b9c4ea]">{s.description}</p>
              </div>
              {/* Handy ragt unten aus der Karte */}
              <div className="relative mt-auto flex h-[300px] justify-center overflow-hidden pt-8">
                <Handy bild={s.bild} alt={s.alt} className="text-[2.45px]" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[var(--lp-tinte)] to-transparent opacity-70" />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  </section>
);

export default HowItWorks;
