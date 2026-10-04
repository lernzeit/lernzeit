import { useCallback, useEffect, useRef, useState } from 'react';
import Handy, { Bildschirm } from './Handy';
import Randnotiz from './Randnotiz';

/**
 * "Eine App. Zwei Ansichten." als Scrollytelling: Das Handy bleibt stehen
 * (sticky), beim Scrollen wechselt sein Bildschirm mit dem Kapitel — erst die
 * Kinder-, dann die Eltern-Ansicht. Ersetzt die frueheren Abschnitte
 * "Zwei Ansichten" (Tabs) und "Was LernZeit besonders macht" (6 Kacheln):
 * Jede dieser Staerken ist hier ein Kapitel mit echtem Bildschirm.
 *
 * Texte aus dem bisherigen Seitentext und src/content/faq.ts. Bildschirme:
 * echte App mit Beispieldaten (scripts/nimm-app-bilder-auf.mjs).
 *
 * Handy: Buehne oben, Kapitelkarten schieben sich von unten darueber.
 * Ab 1024 px: Text links, Buehne rechts. Ohne JavaScript und bei
 * "Bewegung reduzieren" bleibt alles lesbar; der Bildwechsel ist dann hart.
 */
type Ansicht = 'kind' | 'eltern';

interface Kapitel {
  ansicht: Ansicht;
  titel: string;
  text: string;
  bild: string;
  video?: string;
  premium?: boolean;
  /** Randnotiz neben dem Handy (ab 1024 px): was im Bild zu sehen ist; `hoehe` in % der Handyhoehe */
  notiz: { text: string; hoehe: number };
}

const KAPITEL: Kapitel[] = [
  {
    ansicht: 'kind',
    titel: 'Lehrplanorientiert',
    text: 'Inhalte orientieren sich an deutschen Lehrplänen und werden passend zur Klassenstufe ausgespielt. Bei Fehlern hilft der KI-Tutor mit Erklärungen – mit Vorlese-Funktion.',
    bild: '/landing/demo-aufgaben.webp',
    video: '/landing/demo-aufgaben',
    notiz: { text: 'Aufgaben passend zur Klassenstufe', hoehe: 22 },
  },
  {
    ansicht: 'kind',
    titel: 'Achievements & Streaks',
    text: 'Kinder sammeln Achievements und halten Lern-Streaks aufrecht – das motiviert zum regelmäßigen Lernen.',
    bild: '/landing/kind-start.webp',
    notiz: { text: '7 Tage in Folge gelernt', hoehe: 25 },
  },
  {
    ansicht: 'kind',
    titel: 'Bildschirmzeit als Belohnung',
    text: 'Pro richtige Antwort gibt es Bildschirmzeit. Möchte dein Kind Zeit einlösen, schickt es dir eine Anfrage.',
    bild: '/landing/anfragen.webp',
    notiz: { text: 'Anfrage mit Nachricht an die Eltern', hoehe: 54 },
  },
  {
    ansicht: 'eltern',
    titel: 'Du entscheidest',
    text: 'Die verdiente Zeit wird nicht automatisch freigegeben. Du siehst, wie viel dein Kind verdient hat, und entscheidest, ob es die Zeit bekommt.',
    bild: '/landing/eltern-anfrage.webp',
    notiz: { text: 'Genehmigen oder ablehnen', hoehe: 75 },
  },
  {
    ansicht: 'eltern',
    titel: 'Eltern behalten die Kontrolle',
    text: 'Ab Werk gibt es 30 Sekunden pro richtig gelöster Aufgabe und höchstens 30 Minuten am Tag, am Wochenende 60. Mit Premium stellst du beides selbst ein, pro Fach und pro Kind.',
    bild: '/landing/eltern-regeln.webp',
    notiz: { text: '30 Sek. pro Aufgabe, für jedes Fach', hoehe: 64 },
  },
  {
    ansicht: 'eltern',
    titel: 'Lernanalyse und KI-Lernplan',
    text: 'Eltern sehen Lerntrends, Erfolgsquoten und Fehlerschwerpunkte. Vor einer Klassenarbeit gibst du Fach, Thema und Termin an – LernZeit erstellt daraus einen Übungsplan, dessen Aufgaben direkt im Spiel des Kindes auftauchen.',
    bild: '/landing/eltern-analyse.webp',
    premium: true,
    notiz: { text: 'Stärkstes Fach auf einen Blick', hoehe: 33 },
  },
];

const NAME: Record<Ansicht, string> = { kind: 'Kinder-Ansicht', eltern: 'Eltern-Ansicht' };

const ZweiAnsichten = () => {
  const [aktiv, setAktiv] = useState(0);
  const karten = useRef<(HTMLDivElement | null)[]>([]);
  const ansicht = KAPITEL[aktiv].ansicht;

  // Aktives Kapitel: das letzte, dessen Text die Linie ueberschritten hat
  // (Handy: unten, wo die Karten einlaufen; breit: Bildschirmmitte).
  useEffect(() => {
    let rahmen = 0;
    const berechnen = () => {
      rahmen = 0;
      const h = window.innerHeight;
      const linie = window.innerWidth >= 1024 ? h * 0.52 : h * 0.84;
      let neu = 0;
      karten.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top < linie) neu = i;
      });
      setAktiv(neu);
    };
    const anfordern = () => { if (!rahmen) rahmen = requestAnimationFrame(berechnen); };
    berechnen();
    window.addEventListener('scroll', anfordern, { passive: true });
    window.addEventListener('resize', anfordern, { passive: true });
    return () => {
      window.removeEventListener('scroll', anfordern);
      window.removeEventListener('resize', anfordern);
      if (rahmen) cancelAnimationFrame(rahmen);
    };
  }, []);

  const springen = useCallback((ziel: Ansicht) => {
    const i = KAPITEL.findIndex((k) => k.ansicht === ziel);
    const ruhig = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    karten.current[i]?.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: window.innerWidth >= 1024 ? 'center' : 'end' });
  }, []);

  return (
    <section data-abschnitt="ansichten" id="ansichten" className="scroll-mt-20 py-24 lg:py-32">
      <div className="lp-container">
        <h2 className="text-[2.25rem] font-extrabold sm:text-5xl">
          Eine App.
          <br />
          Zwei Ansichten.
        </h2>
        <p className="mt-5 max-w-xl text-lg leading-relaxed">
          Dein Kind löst Aufgaben und verdient Zeit. Du entscheidest, ob es sie bekommt.
        </p>

        <div className="relative mt-10 lg:mt-14 lg:grid lg:grid-cols-12 lg:gap-10">
          {/* Buehne: bleibt stehen, Bildschirm wechselt */}
          <div className="sticky top-[var(--lp-nav)] z-0 h-[calc(100svh_-_var(--lp-nav))] pb-3 pt-2 lg:order-2 lg:col-span-8 lg:top-[calc(var(--lp-nav)_+_1rem)] lg:h-[calc(100vh_-_var(--lp-nav)_-_2rem)] lg:self-start lg:py-0">
            <div className="relative flex h-full flex-col items-center overflow-hidden rounded-[28px] lg:justify-center">
              {/* zwei Flaechen, die ineinander uebergehen: gruen (Kind), blau (Eltern) */}
              <div aria-hidden="true" className={`lp-karo absolute inset-0 bg-[#ecf9f2] [--lp-karo-farbe:#d3efdf] transition-opacity duration-700 motion-reduce:transition-none ${ansicht === 'kind' ? 'opacity-100' : 'opacity-0'}`} />
              <div aria-hidden="true" className={`lp-karo absolute inset-0 bg-[#edf2fd] [--lp-karo-farbe:#d9e3f8] transition-opacity duration-700 motion-reduce:transition-none ${ansicht === 'eltern' ? 'opacity-100' : 'opacity-0'}`} />

              {/* Umschalter: zeigt die Ansicht, springt zum ersten Kapitel */}
              <div className="relative z-10 mt-4 flex rounded-full bg-white/90 p-1 shadow-sm ring-1 ring-[var(--lp-karo)] lg:absolute lg:left-1/2 lg:top-6 lg:mt-0 lg:-translate-x-1/2" role="group" aria-label="Ansicht wählen">
                {(['kind', 'eltern'] as Ansicht[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={ansicht === a}
                    onClick={() => springen(a)}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-blau)] ${
                      ansicht === a ? 'bg-[var(--lp-tinte)] text-white' : 'text-[var(--lp-leise)] hover:text-[var(--lp-tinte)]'
                    }`}
                  >
                    {NAME[a]}
                  </button>
                ))}
              </div>

              <div aria-hidden="true" className="relative z-10 mt-4 lg:mt-8">
                <Handy className="lp-buehne-handy">
                  {KAPITEL.map((k, i) => (
                    <div key={k.bild} className={`absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none ${i === aktiv ? 'opacity-100' : 'opacity-0'}`}>
                      <Bildschirm bild={k.bild} video={k.video} spielen={i === aktiv} />
                    </div>
                  ))}
                </Handy>
                {/* Randnotiz zum aktiven Bildschirm: schreibt sich bei jedem Wechsel neu */}
                <Randnotiz
                  key={aktiv}
                  farbe={ansicht === 'kind' ? 'gruen' : 'tinte'}
                  pfeil={ansicht === 'kind' ? 'rechts-unten' : 'links-unten'}
                  drehung={ansicht === 'kind' ? -4 : 3}
                  className={`absolute hidden w-[8.5rem] text-[1.0625rem] lg:block xl:w-[9.5rem] xl:text-[1.125rem] ${ansicht === 'kind' ? 'right-full mr-12' : 'left-full ml-12'}`}
                  style={{ top: `calc(${KAPITEL[aktiv].notiz.hoehe}% - 3.5rem)` }}
                >
                  {KAPITEL[aktiv].notiz.text}
                </Randnotiz>
              </div>
            </div>
          </div>

          {/* Kapitel: Handy = Karten, die ueber die Buehne laufen; breit = Text links */}
          <ol className="relative z-10 -mt-[calc(100svh_-_var(--lp-nav))] lg:order-1 lg:col-span-4 lg:mt-0">
            {KAPITEL.map((k, i) => (
              <li key={k.titel} className="pointer-events-none flex h-[calc(100svh_-_var(--lp-nav))] items-end pb-5 lg:h-auto lg:min-h-[78vh] lg:items-center lg:pb-0">
                <div
                  ref={(el) => { karten.current[i] = el; }}
                  className={`pointer-events-auto w-full rounded-[22px] bg-white/95 p-6 shadow-[0_18px_40px_-18px_rgba(26,43,109,0.35)] ring-1 ring-[var(--lp-karo)] backdrop-blur transition-opacity duration-500 lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0 lg:backdrop-blur-none ${
                    i === aktiv ? 'lg:opacity-100' : 'lg:opacity-30'
                  }`}
                >
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <span className={`h-2 w-2 rounded-full ${k.ansicht === 'kind' ? 'bg-[var(--lp-gruen-hell)]' : 'bg-[var(--lp-blau)]'}`} />
                    <span className={k.ansicht === 'kind' ? 'text-[var(--lp-gruen)]' : 'text-[var(--lp-blau)]'}>{NAME[k.ansicht]}</span>
                    {k.premium && <span className="rounded-md bg-[var(--lp-heft)] px-1.5 py-0.5 text-xs text-[var(--lp-tinte)]">Premium</span>}
                  </p>
                  <h3 className="mt-3 text-[1.5rem] font-extrabold lg:text-[1.875rem]">{k.titel}</h3>
                  <p className="mt-3 text-base leading-relaxed lg:text-[1.0625rem]">{k.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default ZweiAnsichten;
