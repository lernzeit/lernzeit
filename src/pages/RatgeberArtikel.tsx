import { Fragment, lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Seo from '@/components/Seo';
import { Unterseite, Brotkrumen } from '@/components/landing/Unterseite';
import { findeSichtbarenArtikel, formatiereDatum, sichtbareArtikel } from '@/content/ratgeber';

const NotFound = lazy(() => import('./NotFound'));

// Verweise wie [1] im Text als hochgestellte Links auf die Quellenliste
const mitVerweisen = (text: string) =>
  text.split(/(\[\d+\])/g).map((teil, i) => {
    const treffer = teil.match(/^\[(\d+)\]$/);
    if (!treffer) return <Fragment key={i}>{teil}</Fragment>;
    return (
      <sup key={i} className="ml-0.5">
        <a
          href={`#quelle-${treffer[1]}`}
          aria-label={`Quelle ${treffer[1]}`}
          className="rounded px-1 text-[0.75em] font-bold text-[var(--lp-blau)] no-underline ring-1 ring-inset ring-[var(--lp-karo)] hover:bg-[var(--lp-heft)]"
        >
          {treffer[1]}
        </a>
      </sup>
    );
  });

// Anker fuer das Inhaltsverzeichnis
const anker = (text: string) =>
  text
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const RatgeberArtikel = () => {
  const { slug = '' } = useParams();
  const a = findeSichtbarenArtikel(slug);

  if (!a) {
    return (
      <Suspense fallback={null}>
        <NotFound />
      </Suspense>
    );
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.titel,
    description: a.beschreibung,
    datePublished: a.datum,
    dateModified: a.aktualisiert ?? a.datum,
    author: { '@type': 'Organization', name: 'LernZeit' },
    publisher: { '@type': 'Organization', name: 'LernZeit' },
    mainEntityOfPage: `https://lernzeit.app/ratgeber/${a.slug}`,
  };

  const kapitel = a.abschnitte.filter((ab) => ab.ueberschrift).map((ab) => ab.ueberschrift as string);
  const weitere = sichtbareArtikel().filter((x) => x.slug !== a.slug);

  return (
    <Unterseite position="ratgeber_artikel">
      <Seo title={`${a.titel} – LernZeit Ratgeber`} description={a.beschreibung} path={`/ratgeber/${a.slug}`} />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <header className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="lp-karo pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_90%_at_85%_10%,#000_20%,transparent_70%)]"
        />
        <div className="lp-container relative pb-12 pt-8 sm:pt-12 lg:pb-16">
          <Brotkrumen pfad={[{ text: 'Startseite', zu: '/start' }, { text: 'Ratgeber', zu: '/ratgeber' }, { text: a.titel }]} />
          <h1 className="mt-6 max-w-[22ch] text-[2.25rem] font-extrabold sm:text-[3.25rem]">{a.titel}</h1>
          <p className="mt-5 max-w-[40rem] text-lg leading-relaxed sm:text-xl">{a.beschreibung}</p>
          <p className="mt-6 text-[0.9375rem] text-[var(--lp-leise)]">
            {formatiereDatum(a.datum)}
            {a.aktualisiert && <>, aktualisiert {formatiereDatum(a.aktualisiert)}</>}
            {', '}{a.lesezeitMinuten} Min. Lesezeit, {a.quellen.length} {a.quellen.length === 1 ? 'Quelle' : 'Quellen'}
          </p>
        </div>
      </header>

      <div className="lp-container grid gap-12 lg:grid-cols-12">
        <article className="min-w-0 lg:col-span-8 xl:col-span-7">
          {a.abschnitte.map((ab, i) => (
            <section key={i} className="mb-10">
              {ab.ueberschrift && (
                <h2 id={anker(ab.ueberschrift)} className="mb-4 scroll-mt-24 text-[1.5rem] font-extrabold sm:text-[1.75rem]">
                  {ab.ueberschrift}
                </h2>
              )}
              {ab.absaetze.map((p, j) => (
                <p
                  key={j}
                  className={`mb-5 text-[1.0625rem] leading-[1.75] sm:text-[1.125rem] ${!ab.ueberschrift && i === 0 ? 'text-[1.1875rem] text-[var(--lp-tinte)] sm:text-[1.25rem]' : ''}`}
                >
                  {mitVerweisen(p)}
                </p>
              ))}
            </section>
          ))}

          {a.quellen.length > 0 && (
            <section aria-labelledby="quellen" className="mt-14 rounded-3xl bg-[var(--lp-heft)] p-6 sm:p-8">
              <h2 id="quellen" className="text-[1.25rem] font-extrabold">Quellen</h2>
              <ol className="mt-5 space-y-4 text-[0.9375rem] leading-relaxed">
                {[...a.quellen].sort((x, y) => x.nr - y.nr).map((q) => (
                  <li key={q.nr} id={`quelle-${q.nr}`} className="grid scroll-mt-24 grid-cols-[2rem_1fr] break-words">
                    <span className="font-bold text-[var(--lp-tinte)]">{q.nr}</span>
                    <span>
                      {q.herausgeber}: {q.titel}{q.jahr ? ` (${q.jahr})` : ''}.{' '}
                      <a href={q.url} target="_blank" rel="noopener" className="text-[var(--lp-blau)] underline-offset-4 hover:underline">
                        {q.url}
                      </a>
                      {q.geprueftAm && (
                        <span className="block text-[var(--lp-leise)]">Am Original geprüft am {formatiereDatum(q.geprueftAm)}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </article>

        <aside className="lg:col-span-4 xl:col-span-4 xl:col-start-9">
          <div className="space-y-10 lg:sticky lg:top-[calc(var(--lp-nav)_+_2rem)]">
            {kapitel.length > 1 && (
              <nav aria-label="Inhalt" className="hidden lg:block">
                <p className="font-bold text-[var(--lp-tinte)]">Inhalt</p>
                <ol className="mt-3 space-y-2 border-l-2 border-[var(--lp-karo)] pl-4 text-[0.9375rem]">
                  {kapitel.map((k) => (
                    <li key={k}>
                      <a href={`#${anker(k)}`} className="text-[var(--lp-leise)] transition-colors hover:text-[var(--lp-tinte)]">
                        {k}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            {weitere.length > 0 && (
              <div>
                <p className="font-bold text-[var(--lp-tinte)]">Weitere Artikel</p>
                <ul className="mt-3 divide-y divide-[var(--lp-karo)] border-y border-[var(--lp-karo)]">
                  {weitere.map((w) => (
                    <li key={w.slug}>
                      <Link to={`/ratgeber/${w.slug}`} className="block py-4 font-semibold leading-snug text-[var(--lp-tinte)] underline-offset-4 hover:underline">
                        {w.titel}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link to="/ratgeber" className="mt-4 inline-block text-[0.9375rem] font-bold text-[var(--lp-blau)] underline-offset-4 hover:underline">
                  Alle Artikel im Ratgeber
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </Unterseite>
  );
};

export default RatgeberArtikel;
