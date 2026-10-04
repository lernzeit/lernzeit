// Die Einrichtung besteht aus ZWEI Konten – deinem und dem deines Kindes.
// Genau das stand bisher nirgends auf der Seite, und genau daran ist ein Teil
// der Eltern haengengeblieben: neun von sechzehn haben nie ein Kind verknuepft.
const steps = [
  {
    title: 'Du legst dein Elternkonto an',
    text: 'Registrierung in unter einer Minute – 4 Wochen alle Funktionen kostenlos, keine Zahlungsdaten nötig.',
  },
  {
    title: 'Du lädst dein Kind ein',
    text: 'Du erzeugst eine Einladung und schickst sie als Link – oder liest den 6-stelligen Code vor. Beides ist dasselbe, nur anders verpackt.',
  },
  {
    title: 'Dein Kind meldet sich damit an',
    text: 'Mit Klassenstufe, auf seinem eigenen Gerät – danach seid ihr verknüpft. Geht auch andersherum: erst anmelden, später verbinden.',
  },
];

const SetupSteps = () => (
  <section className="border-t border-[var(--lp-karo)] py-24 lg:py-32">
    <div className="lp-container grid gap-12 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-5">
        <h2 className="max-w-md text-[2.25rem] font-extrabold sm:text-5xl">So richtest du es in 3 Minuten ein</h2>
        <p className="mt-6 max-w-md leading-relaxed">
          Dein Kind kann die App auch auf deinem Gerät nutzen. Der Sinn der verdienten
          Bildschirmzeit entfaltet sich aber erst, wenn es ein eigenes Gerät hat.
        </p>
      </div>

      <ol className="lg:col-span-7 lg:pl-10">
        {steps.map((step, i) => (
          <li key={step.title} className="relative flex gap-6 pb-11 last:pb-0">
            {/* Verbindung zum naechsten Schritt */}
            {i < steps.length - 1 && (
              <span aria-hidden="true" className="absolute bottom-0 left-[21px] top-12 w-px bg-[var(--lp-karo)]" />
            )}
            <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-base font-extrabold text-[var(--lp-tinte)] ring-1 ring-[var(--lp-karo)]">
              {i + 1}
            </span>
            <div className="min-w-0 pt-2">
              <h3 className="text-xl font-bold">{step.title}</h3>
              <p className="mt-2 max-w-xl leading-relaxed">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default SetupSteps;
