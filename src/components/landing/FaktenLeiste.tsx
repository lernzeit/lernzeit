/**
 * Vier Zahlen unter dem Hero. Jede steht so in src/content/faq.ts
 * (Klassen, Sekunden je Aufgabe, Tagesgrenze ab Werk, Serverstandort).
 */
const FAKTEN = [
  { zahl: '1–10', text: 'Klassenstufen, Mathe und Deutsch ab Klasse 1' },
  { zahl: '30 Sek.', text: 'Bildschirmzeit für jede richtig gelöste Aufgabe' },
  { zahl: '30 / 60 Min.', text: 'Tagesgrenze ab Werk: werktags / am Wochenende' },
  { zahl: 'EU', text: 'Server in Frankfurt am Main' },
];

const FaktenLeiste = () => (
  <section aria-label="LernZeit in Zahlen" className="border-y border-slate-200/80 bg-white">
    <div className="lp-container">
      <dl className="grid grid-cols-2 gap-px bg-slate-200/80 lg:grid-cols-4">
        {FAKTEN.map((f, i) => (
          <div
            key={f.zahl}
            data-zeigen
            style={{ '--lp-verzug': `${i * 80}ms` } as React.CSSProperties}
            className="bg-white py-8 pr-4 even:pl-5 sm:px-6 sm:even:pl-6 lg:py-10 lg:first:pl-0"
          >
            <dt className="lp-display text-[1.625rem] font-extrabold tracking-[-0.03em] text-[var(--lp-ink)] sm:text-4xl">{f.zahl}</dt>
            <dd className="mt-1.5 max-w-[15rem] text-sm leading-snug text-slate-500 sm:text-[0.9375rem]">{f.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  </section>
);

export default FaktenLeiste;
