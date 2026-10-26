import { lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Seo from '@/components/Seo';
import JsonLd from '@/components/JsonLd';
import { Unterseite, Brotkrumen } from '@/components/landing/Unterseite';
import { trackFireAndForget } from '@/lib/analytics';
import { seiteJsonLd } from '@/content/jsonld-routen';
import { findeSeite } from '@/content/seiten';
import { formatiereDatum } from '@/content/ratgeber';

const NotFound = lazy(() => import('./NotFound'));

const anker = (text: string) =>
  text
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Inhaltsseiten der Website (Zielseiten der Anzeigen, Vergleich, Preise, Hilfe).
 * Die Texte stehen in src/content/seiten. Alles wird beim Build vorgerendert,
 * damit Suchmaschinen und KI-Suchen den Inhalt ohne JavaScript lesen.
 */
const Inhaltsseite = ({ pfad }: { pfad: string }) => {
  const navigate = useNavigate();
  const s = findeSeite(pfad);

  if (!s) {
    return (
      <Suspense fallback={null}>
        <NotFound />
      </Suspense>
    );
  }

  const krumen = [{ text: 'Startseite', zu: '/start' }, { text: s.brotkrumen[s.brotkrumen.length - 1].text, zu: s.pfad }];
  return (
    <Unterseite position={s.position}>
      <Seo title={s.titel} description={s.beschreibung} path={s.pfad} />
      <JsonLd daten={seiteJsonLd(s)} />

      <header className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="lp-karo pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_90%_at_85%_10%,#000_20%,transparent_70%)]"
        />
        <div className="lp-container relative pb-12 pt-8 sm:pt-12 lg:pb-16">
          <Brotkrumen pfad={krumen.map((k, i) => (i === krumen.length - 1 ? { text: k.text } : k))} />
          <h1 className="mt-6 max-w-[24ch] text-[2.25rem] font-extrabold sm:text-[3.25rem]">{s.h1}</h1>
          <p className="mt-5 max-w-[40rem] text-lg leading-relaxed sm:text-xl">{s.einleitung}</p>
          {s.knopf && (
            <button
              type="button"
              onClick={() => {
                trackFireAndForget('landing_cta_click', { position: `${s.position}_kopf` });
                navigate('/?auth=true');
              }}
              className="mt-8 inline-flex h-14 items-center justify-center rounded-full bg-[var(--lp-tinte)] px-8 text-[1.0625rem] font-bold text-white transition-colors hover:bg-[#24388a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-blau)]"
            >
              {s.knopf}
            </button>
          )}
          <p className="mt-6 text-[0.9375rem] text-[var(--lp-leise)]">Stand: {formatiereDatum(s.aktualisiert)}</p>
        </div>
      </header>

      <div className="lp-container grid gap-12 lg:grid-cols-12">
        <article className="min-w-0 lg:col-span-8 xl:col-span-7">
          {s.abschnitte.map((ab) => (
            <section key={ab.h2} className="mb-12">
              <h2 id={anker(ab.h2)} className="mb-4 scroll-mt-24 text-[1.5rem] font-extrabold sm:text-[1.75rem]">
                {ab.h2}
              </h2>
              {ab.absaetze?.map((p) => (
                <p key={p} className="mb-5 text-[1.0625rem] leading-[1.75] sm:text-[1.125rem]">{p}</p>
              ))}
              {ab.liste && (
                <ul className="mb-5 list-disc space-y-2.5 pl-6 text-[1.0625rem] leading-[1.7] sm:text-[1.125rem]">
                  {ab.liste.map((l) => <li key={l}>{l}</li>)}
                </ul>
              )}
              {ab.schritte && (
                <ol className="mb-5 list-decimal space-y-3 pl-6 text-[1.0625rem] leading-[1.7] marker:font-bold sm:text-[1.125rem]">
                  {ab.schritte.map((l) => <li key={l}>{l}</li>)}
                </ol>
              )}
              {ab.tabelle && (
                <div className="mb-5 overflow-x-auto rounded-2xl ring-1 ring-[var(--lp-karo)]">
                  <table className="w-full min-w-[34rem] border-collapse text-left text-[0.9375rem] leading-snug">
                    <thead className="bg-[var(--lp-heft)]">
                      <tr>
                        {ab.tabelle.kopf.map((k) => (
                          <th key={k} scope="col" className="px-4 py-3 font-bold text-[var(--lp-tinte)]">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ab.tabelle.zeilen.map((z) => (
                        <tr key={z[0]} className="border-t border-[var(--lp-karo)] align-top">
                          {z.map((zelle, i) =>
                            i === 0 ? (
                              <th key={i} scope="row" className="px-4 py-3 font-bold text-[var(--lp-tinte)]">{zelle}</th>
                            ) : (
                              <td key={i} className="px-4 py-3">{zelle}</td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {ab.nachher?.map((p) => (
                <p key={p} className="mb-5 text-[1.0625rem] leading-[1.75] sm:text-[1.125rem]">{p}</p>
              ))}
            </section>
          ))}

          {s.faq && s.faq.length > 0 && (
            <section aria-labelledby="fragen" className="mb-12 border-t border-[var(--lp-karo)] pt-10">
              <h2 id="fragen" className="mb-2 text-[1.5rem] font-extrabold sm:text-[1.75rem]">Häufige Fragen</h2>
              {s.faq.map(({ f, a }) => (
                <div key={f} className="border-b border-[var(--lp-karo)] py-6">
                  <h3 className="text-[1.125rem] font-extrabold sm:text-[1.25rem]">{f}</h3>
                  <p className="mt-2 max-w-[42rem] leading-relaxed">{a}</p>
                </div>
              ))}
            </section>
          )}
        </article>

        <aside className="lg:col-span-4 xl:col-span-4 xl:col-start-9">
          <nav aria-label="Weiterlesen" className="lg:sticky lg:top-[calc(var(--lp-nav)_+_2rem)]">
            <p className="font-bold text-[var(--lp-tinte)]">Weiterlesen</p>
            <ul className="mt-3 space-y-3 border-l-2 border-[var(--lp-karo)] pl-4 text-[0.9375rem]">
              {s.weiterfuehrend.map((w) => (
                <li key={w.zu}>
                  <Link to={w.zu} className="text-[var(--lp-blau)] underline-offset-4 hover:underline">{w.text}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </Unterseite>
  );
};

export default Inhaltsseite;
