import { Fragment, lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Seo from '@/components/Seo';
import LegalFooter from '@/components/layout/LegalFooter';
import { findeSichtbarenArtikel, formatiereDatum } from '@/content/ratgeber';

const NotFound = lazy(() => import('./NotFound'));

// Verweise wie [1] im Text als hochgestellte Links auf die Quellenliste
const mitVerweisen = (text: string) =>
  text.split(/(\[\d+\])/g).map((teil, i) => {
    const treffer = teil.match(/^\[(\d+)\]$/);
    if (!treffer) return <Fragment key={i}>{teil}</Fragment>;
    return (
      <sup key={i}>
        <a href={`#quelle-${treffer[1]}`} className="text-primary hover:underline">[{treffer[1]}]</a>
      </sup>
    );
  });

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

  return (
    <main className="min-h-screen bg-background pt-safe-top pb-safe-bottom px-safe">
      <Seo title={`${a.titel} – LernZeit Ratgeber`} description={a.beschreibung} path={`/ratgeber/${a.slug}`} />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <article className="max-w-[70ch] mx-auto px-4 py-16">
        <Link to="/ratgeber" className="text-sm text-muted-foreground hover:text-foreground">Ratgeber</Link>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 mb-3 leading-tight">{a.titel}</h1>
        <p className="text-sm text-muted-foreground mb-10">
          {formatiereDatum(a.datum)}
          {a.aktualisiert && <> · aktualisiert {formatiereDatum(a.aktualisiert)}</>}
          {' · '}{a.lesezeitMinuten} Min. Lesezeit
        </p>

        {a.abschnitte.map((ab, i) => (
          <section key={i} className="mb-8">
            {ab.ueberschrift && <h2 className="text-2xl font-bold mb-3">{ab.ueberschrift}</h2>}
            {ab.absaetze.map((p, j) => (
              <p key={j} className="text-base sm:text-lg leading-relaxed mb-4">{mitVerweisen(p)}</p>
            ))}
          </section>
        ))}

        {a.quellen.length > 0 && (
          <section className="mt-12 pt-8 border-t">
            <h2 className="text-xl font-bold mb-4">Quellen</h2>
            <ol className="space-y-2 text-sm text-muted-foreground">
              {[...a.quellen].sort((x, y) => x.nr - y.nr).map((q) => (
                <li key={q.nr} id={`quelle-${q.nr}`} className="scroll-mt-20 break-words">
                  [{q.nr}] {q.herausgeber}: {q.titel} ({q.jahr}).{' '}
                  <a href={q.url} target="_blank" rel="noopener" className="text-primary hover:underline">{q.url}</a>
                </li>
              ))}
            </ol>
          </section>
        )}

        <p className="mt-12 text-sm text-muted-foreground">
          LernZeit verbindet Lernen und Bildschirmzeit.{' '}
          <Link to="/start" className="text-primary hover:underline">Mehr über LernZeit</Link>
        </p>
      </article>
      <LegalFooter className="pb-8" />
    </main>
  );
};

export default RatgeberArtikel;
