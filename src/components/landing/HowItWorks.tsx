import Handy from './Handy';

// Der ganze Weg der Zeit: loesen, verdienen, anfragen, freigeben (11.10.2026).
// Bilder: echte Bildschirme (public/landing, erzeugt mit `npm run werbung:landing`
// und `npm run werbung:app-bilder`). Freigabe wie in ParentScreenTimeRequests.
const steps = [
  {
    title: 'Aufgaben lösen',
    description: 'Mathe, Deutsch, Englisch und viele weitere Fächer, von Klasse 1 bis 10. Bei Fehlern erklärt Klecksi die Lösung.',
    bild: '/landing/aufgabe.webp',
    alt: 'Mathe-Aufgabe der 3. Klasse, Antwort in Rechenkästchen, darunter das Ziffernfeld',
  },
  {
    title: 'Zeit verdienen',
    description: 'Pro richtige Antwort gibt es Bildschirmzeit – wie viele Sekunden pro Fach, legst du fest.',
    bild: '/landing/kind-verdient.webp',
    alt: 'Kinder-Ansicht: Zeit-Uhr mit 8 von 60 Minuten, Knöpfe „Lernen starten“ und „8 Min. anfragen“',
  },
  {
    title: 'Zeit anfragen',
    description: 'Möchte dein Kind die Zeit nutzen, schickt es dir eine Anfrage, gern mit einer kurzen Nachricht.',
    bild: '/landing/anfragen.webp',
    alt: 'Kinder-Ansicht: Dialog „Bildschirmzeit anfragen“ über 8 Minuten mit Nachricht an die Eltern',
  },
  {
    title: 'Du gibst frei',
    description: 'Die Anfrage kommt auf dein Handy. Du genehmigst sie und gibst die Zeit in der Bildschirmzeit deines Kindes frei: auf dem iPhone in den Einstellungen, auf Android in Family Link.',
    bild: '/landing/eltern-anfrage.webp',
    alt: 'Eltern-Ansicht: Anfrage von Mia über 8 Minuten mit Genehmigen und Ablehnen',
  },
];

const HowItWorks = () => (
  <section data-abschnitt="so_funktionierts" id="so-funktionierts" className="scroll-mt-20 px-3 sm:px-5">
    <div className="lp-band lp-karo overflow-hidden rounded-[28px] py-20 sm:rounded-[36px] lg:py-28">
      <div className="lp-container">
        <h2 className="max-w-xl text-[2.25rem] font-extrabold sm:text-5xl">In vier Schritten zur verdienten Zeit</h2>
        <p className="mt-5 max-w-xl text-lg leading-relaxed">
          Dein Kind lernt und verdient Zeit. Ob es sie bekommt, entscheidest du.
        </p>

        <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:mt-14 lg:grid-cols-4 lg:gap-5">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col overflow-hidden rounded-[22px] bg-white/[0.06] ring-1 ring-inset ring-white/[0.12]">
              <div className="p-7 pb-0 lg:p-6 lg:pb-0">
                <span className="grid h-9 w-9 place-items-center rounded-full text-[0.9375rem] font-bold text-white ring-1 ring-inset ring-white/40">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-[1.375rem] font-bold">{s.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-[#b9c4ea]">{s.description}</p>
              </div>
              {/* Handy ragt unten aus der Karte */}
              <div className="relative mt-auto flex h-[300px] justify-center overflow-hidden pt-8">
                <Handy bild={s.bild} alt={s.alt} className="text-[2.45px] lg:text-[2.2px]" />
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
