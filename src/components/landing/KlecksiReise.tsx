import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Klecksi, type KlecksiHandle, type KlecksiStimmung } from '@/components/klecksi/Klecksi';
import { ReisePfad } from '@/components/child/HeftrandReise';
import { FaltAnleitung, FaltFilm } from '@/components/child/FaltAnleitung';
import { Tintenkiller, TintenTropfen } from '@/components/child/KlecksiStart';
import { farbeVon, STANDARD_FARBE, type FachId } from '@/lib/hefte';
import type { ReiseFeld, ReiseQuelle } from '@/lib/reise';
import { trackFireAndForget } from '@/lib/analytics';

/**
 * „Lernen mit Klecksi“ (Startseite, 11.10.2026): Beim Scrollen malt Klecksi
 * die Heftrand-Reise aus, Kapitel fuer Kapitel, bis die Seite voll ist und er
 * einen Papierflieger faltet. Spielbrett, Saetze und Faltung sind dieselben
 * wie in der App (ReisePfad, lib/klecksi.ts, lib/falten.ts).
 *
 * Aufbau wie ZweiAnsichten: Buehne bleibt stehen (sticky), Kapitelkarten
 * laufen darueber (Handy) bzw. stehen daneben (ab 1024 px). Ohne JavaScript
 * und bei „Bewegung reduzieren“ bleibt alles lesbar; Klecksi springt dann nicht.
 */

const f = (fach: FachId, quelle: ReiseQuelle = 'runde'): Omit<ReiseFeld, 'seite' | 'feld'> => ({ fach, quelle });

// Felder je Kapitel (eine Seite mit 12 Feldern). Fachfarben wie in der App.
const VERLAUF = [
  f('math'), f('german'), f('math'), f('english'), f('german', 'lernplan'), f('german', 'lernplan'),
  f('math', 'schwerpunkt'), f('math', 'schwerpunkt'), f('english', 'berichtigung'), f('science'), f('english'), f('math'),
].map((x, i) => ({ ...x, seite: 4, feld: i + 1 })) as ReiseFeld[];

interface Kapitel {
  titel: string;
  text: string;
  felder: number;
  satz: string;
  stimmung: KlecksiStimmung;
  extra?: 'tintenkiller' | 'falten' | 'tinte';
}

// Saetze wie in lib/klecksi.ts (feste Saetze, keine KI-Texte)
const KAPITEL: Kapitel[] = [
  {
    titel: 'Klecksi lernt mit',
    text: 'Klecksi begrüßt dein Kind, macht Mut, wenn etwas danebengeht, und jubelt bei fünf von fünf. Er sagt nur feste, geprüfte Sätze – keine KI-Texte.',
    felder: 1,
    satz: 'Hallo Mia! Malen wir weiter?',
    stimmung: 'froh',
  },
  {
    titel: 'Jede Runde malt ein Feld',
    text: 'Ab 3 von 5 richtig malt Klecksi ein Feld in der Farbe des Fachs. Mit drei Fächern auf einer Seite wird sie bunt.',
    felder: 4,
    satz: 'Prima! Ich male dein Feld aus.',
    stimmung: 'jubel',
  },
  {
    titel: 'Was dir wichtig ist, zählt doppelt',
    text: 'Lernplan vor der Klassenarbeit oder Schwerpunkt-Fach: Solche Runden bringen zwei Felder. So lernt dein Kind gern, was gerade dran ist.',
    felder: 8,
    satz: 'Dein Lernplan in Deutsch zählt doppelt.',
    stimmung: 'froh',
  },
  {
    titel: 'Fehler werden Kleckse',
    text: 'Falsche Aufgaben landen in der Berichtigung. Später wischt dein Kind sie mit dem Tintenkiller weg – und übt genau das, was noch hakt.',
    felder: 9,
    satz: 'Fehler sind nur Kleckse. Die wischen wir in der Berichtigung weg!',
    stimmung: 'mut',
    extra: 'tintenkiller',
  },
  {
    titel: 'Seite voll: Klecksi faltet',
    text: 'Nach zwölf Feldern faltet Klecksi eine Figur aus Papier – mit Anleitung zum Nachfalten. Gelernt wird am Handy, gebastelt am Tisch.',
    felder: 12,
    satz: 'Seite fertig! Ich falte dir einen Papierflieger.',
    stimmung: 'jubel',
    extra: 'falten',
  },
  {
    titel: 'Tinte für neue Figuren',
    text: 'Für jede richtige Aufgabe gibt es Tinte. Damit schaltet dein Kind neue Figuren frei. Tinte ist Spielgeld: nie Bildschirmzeit, nie mit Geld zu kaufen.',
    felder: 12,
    satz: 'Für Tinte male ich dir neue Figuren.',
    stimmung: 'froh',
    extra: 'tinte',
  },
];

const farbe = (fach: string) => farbeVon(STANDARD_FARBE[fach as FachId], fach as FachId);

const KlecksiReise = () => {
  const navigate = useNavigate();
  const [aktiv, setAktiv] = useState(0);
  const [anleitung, setAnleitung] = useState(false);
  const karten = useRef<(HTMLDivElement | null)[]>([]);
  const klecksi = useRef<KlecksiHandle>(null);
  const k = KAPITEL[aktiv];

  // Aktives Kapitel wie in ZweiAnsichten: das letzte, dessen Karte die Linie ueberschritten hat
  useEffect(() => {
    let rahmen = 0;
    const berechnen = () => {
      rahmen = 0;
      const h = window.innerHeight;
      const linie = window.innerWidth >= 1024 ? h * 0.55 : h * 0.84;
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

  // Bei jedem neuen Kapitel huepft Klecksi; beim ersten winkt er
  const erstesMal = useRef(true);
  useEffect(() => {
    if (erstesMal.current) { erstesMal.current = false; return; }
    klecksi.current?.huepfen();
    if (aktiv === 0) klecksi.current?.gruessen();
  }, [aktiv]);

  return (
    <section data-abschnitt="klecksi" id="klecksi" className="scroll-mt-20 py-24 lg:py-32">
      <div className="lp-container">
        <p className="lp-notiz text-[1.25rem] text-[var(--lp-blau)]" style={{ rotate: '-2deg' }}>Darf ich vorstellen?</p>
        <h2 className="mt-2 text-[2.25rem] font-extrabold sm:text-5xl">
          Lernen mit Klecksi
        </h2>
        <p className="mt-5 max-w-xl text-lg leading-relaxed">
          Damit dein Kind gern dranbleibt: Jede geschaffte Runde bringt Klecksi auf seiner Reise am Heftrand ein Stück weiter.
        </p>

        <div className="relative mt-10 lg:mt-14 lg:grid lg:grid-cols-12 lg:gap-10">
          {/* Buehne: Klecksi, Sprechblase, Spielbrett der Reise */}
          <div className="sticky top-[var(--lp-nav)] z-0 h-[calc(100svh_-_var(--lp-nav))] pb-3 pt-2 lg:col-span-7 lg:top-[calc(var(--lp-nav)_+_1rem)] lg:h-[calc(100vh_-_var(--lp-nav)_-_2rem)] lg:self-start lg:py-0">
            <div aria-hidden="true" className="lp-karo relative flex h-full flex-col items-center overflow-hidden rounded-[28px] bg-[var(--lp-heft)] px-4 pt-4 lg:justify-center lg:pt-0">
              {/* Klecksi mit Sprechblase */}
              <div className="flex w-full max-w-[24rem] items-center gap-2 lg:max-w-[28rem]">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => { klecksi.current?.huepfen(); klecksi.current?.gruessen(); }}
                  className="pointer-events-auto shrink-0"
                >
                  <Klecksi ref={klecksi} groesse={76} stimmung={k.stimmung} className="lg:h-auto lg:w-[96px]" />
                </button>
                <p key={aktiv} className="lp-auftritt lp-notiz flex-1 rounded-[18px] rounded-bl-[4px] border-2 border-[var(--lp-tinte)] bg-white px-3 py-2 text-[0.95rem] leading-snug text-[var(--lp-tinte)] lg:text-[1.05rem]">
                  {k.satz}
                </p>
              </div>

              {/* Spielbrett; beim Falten die Faltung daneben */}
              <div className="relative mt-3 w-full max-w-[min(19rem,calc((100svh_-_var(--lp-nav))_*_0.42))] lg:mt-5 lg:max-w-[min(24rem,calc((100vh_-_var(--lp-nav))_*_0.58))]">
                <ReisePfad
                  seite={4}
                  felder={VERLAUF.slice(0, k.felder)}
                  farbe={farbe}
                  zielFertig={k.felder >= 12}
                  className="bg-white shadow-[0_18px_40px_-22px_rgba(26,43,109,0.45)]"
                />
                {k.extra === 'tintenkiller' && (
                  <div key="killer" className="lp-auftritt absolute -right-3 top-1/2 grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-lg ring-1 ring-[var(--lp-karo)] lg:-right-10">
                    <Tintenkiller groesse={44} />
                  </div>
                )}
                {k.extra === 'falten' && (
                  <div key="falten" className="lp-auftritt absolute -right-2 -top-2 w-[46%] rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-[var(--lp-karo)] lg:-right-24 lg:w-[56%]">
                    <FaltFilm art="papierflieger" className="lp-karo aspect-square overflow-hidden rounded-xl" />
                  </div>
                )}
                {k.extra === 'tinte' && (
                  <div key="tinte" className="lp-auftritt absolute -right-2 -top-2 flex flex-col items-center gap-1 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-[var(--lp-karo)] lg:-right-14">
                    <span className="flex items-center gap-1.5 rounded-full px-3 py-1 font-extrabold text-[var(--lp-tinte)] ring-2 ring-inset ring-[var(--lp-tinte)]">
                      <TintenTropfen groesse={16} /> 84
                    </span>
                    <span className="grid grid-cols-2 gap-1 text-[1.75rem] leading-none">
                      <span>🦁</span><span className="opacity-40">🦄</span><span className="opacity-40">🧙‍♂️</span><span className="opacity-40">🦸‍♂️</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Kapitel: Handy = Karten ueber der Buehne; breit = Text rechts */}
          <ol className="relative z-10 -mt-[calc(100svh_-_var(--lp-nav))] lg:col-span-5 lg:mt-0">
            {KAPITEL.map((kap, i) => (
              <li key={kap.titel} className="pointer-events-none flex h-[calc(100svh_-_var(--lp-nav))] items-end pb-[calc(1.25rem_+_var(--lp-leiste,0px))] transition-[padding] duration-300 motion-reduce:transition-none lg:h-auto lg:min-h-[72vh] lg:items-center lg:pb-0">
                <div
                  ref={(el) => { karten.current[i] = el; }}
                  className={`pointer-events-auto w-full rounded-[22px] bg-white/95 p-6 shadow-[0_18px_40px_-18px_rgba(26,43,109,0.35)] ring-1 ring-[var(--lp-karo)] backdrop-blur transition-opacity duration-500 lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0 lg:backdrop-blur-none ${
                    i === aktiv ? 'lg:opacity-100' : 'lg:opacity-30'
                  }`}
                >
                  <p className="text-sm font-bold text-[var(--lp-blau)]">{i + 1} / {KAPITEL.length}</p>
                  <h3 className="mt-2 text-[1.5rem] font-extrabold lg:text-[1.875rem]">{kap.titel}</h3>
                  <p className="mt-3 text-base leading-relaxed lg:text-[1.0625rem]">{kap.text}</p>
                  {kap.extra === 'falten' && (
                    <button
                      type="button"
                      onClick={() => setAnleitung(true)}
                      className="mt-4 inline-flex h-11 items-center rounded-full px-5 text-[0.9375rem] font-bold text-[var(--lp-tinte)] ring-1 ring-inset ring-[var(--lp-karo-dunkel)] transition hover:bg-[var(--lp-heft)]"
                    >
                      Papierflieger selbst falten
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Zwischen-CTA nach Klecksi */}
        <div className="mt-16 flex flex-col items-start gap-4 rounded-[28px] bg-[var(--lp-heft)] p-7 ring-1 ring-inset ring-[var(--lp-karo)] sm:flex-row sm:items-center sm:justify-between sm:p-9">
          <div>
            <h3 className="text-[1.5rem] font-extrabold sm:text-[1.75rem]">Klecksi wartet schon.</h3>
            <p className="mt-1 text-base">4 Wochen alle Funktionen kostenlos, keine Zahlungsdaten nötig.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              trackFireAndForget('landing_cta_click', { position: 'klecksi' });
              navigate('/?auth=true');
            }}
            className="inline-flex h-[54px] shrink-0 items-center justify-center rounded-full bg-[var(--lp-blau)] px-8 text-[1.0625rem] font-bold text-white shadow-[0_10px_24px_-10px_rgba(37,99,235,0.7)] transition-colors hover:bg-[#1d4ed8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-blau)]"
          >
            Kostenlos registrieren
          </button>
        </div>
      </div>
      <FaltAnleitung art={anleitung ? 'papierflieger' : null} offen={anleitung} onOpenChange={setAnleitung} />
    </section>
  );
};

export default KlecksiReise;
