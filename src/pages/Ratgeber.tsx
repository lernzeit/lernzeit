import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Seo from '@/components/Seo';
import { Unterseite, Brotkrumen } from '@/components/landing/Unterseite';
import Randnotiz from '@/components/landing/Randnotiz';
import { sichtbareArtikel, formatiereDatum } from '@/content/ratgeber';

const Ratgeber = () => {
  const liste = sichtbareArtikel();
  return (
    <Unterseite position="ratgeber">
      <Seo
        title="Ratgeber – LernZeit"
        description="Artikel für Eltern rund um Bildschirmzeit, Smartphone und Lernen: was Fachleute empfehlen und was Studien zeigen."
        path="/ratgeber"
      />
      {liste.length === 0 && (
        <Helmet>
          <meta name="robots" content="noindex" />
        </Helmet>
      )}

      <header className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="lp-karo pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_90%_at_80%_20%,#000_25%,transparent_75%)]"
        />
        <div className="lp-container relative grid gap-10 pb-14 pt-8 sm:pt-12 lg:grid-cols-12 lg:pb-20">
          <div className="lg:col-span-8">
            <Brotkrumen pfad={[{ text: 'Startseite', zu: '/start' }, { text: 'Ratgeber' }]} />
            <h1 className="mt-6 text-[2.5rem] font-extrabold sm:text-[3.5rem]">Ratgeber für Eltern</h1>
            <p className="mt-5 max-w-[36rem] text-lg leading-relaxed sm:text-xl">
              Bildschirmzeit, Smartphone, Lernen: was Fachleute empfehlen und was Studien zeigen.
              Kurz erklärt, ohne erhobenen Zeigefinger.
            </p>
          </div>
          {/* Wortlaut der Leitlinie, Empfehlung 33 (S. 30), geprueft am 04.10.2026 */}
          <figure className="lg:col-span-4 lg:flex lg:flex-col lg:items-end lg:justify-end lg:pb-2">
            <Randnotiz farbe="gruen" drehung={-3} verzug={300} className="w-[17rem] text-[1.25rem] sm:text-[1.3125rem]">
              „maximal 1-2 Stunden am Tag und bis spätestens 21 Uhr“
            </Randnotiz>
            <figcaption className="mt-3 w-[17rem] text-[0.875rem] leading-snug text-[var(--lp-leise)]">
              Leitlinie der Kinder- und Jugendmedizin (2023) für 12- bis 16-Jährige
            </figcaption>
          </figure>
        </div>
      </header>

      <div className="lp-container">
        {liste.length === 0 ? (
          <p className="text-[var(--lp-leise)]">Hier erscheinen bald Artikel rund um Bildschirmzeit und Lernen.</p>
        ) : (
          <ol className="border-t border-[var(--lp-karo)]">
            {liste.map((a, i) => (
              <li key={a.slug} className="border-b border-[var(--lp-karo)]">
                <Link
                  to={`/ratgeber/${a.slug}`}
                  className="group grid gap-x-8 gap-y-3 py-9 sm:grid-cols-[4rem_1fr] lg:grid-cols-[5rem_1fr_15rem] lg:py-11"
                >
                  <span aria-hidden="true" className="lp-notiz text-[2rem] leading-none text-[var(--lp-gruen)] sm:text-[2.5rem]">
                    {i + 1}.
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-[1.5rem] font-extrabold decoration-[var(--lp-gruen-hell)] decoration-2 underline-offset-[6px] group-hover:underline sm:text-[1.875rem]">
                      {a.titel}
                    </h2>
                    <p className="mt-3 max-w-[40rem] leading-relaxed">{a.beschreibung}</p>
                  </div>
                  <div className="text-[0.9375rem] text-[var(--lp-leise)] sm:col-start-2 lg:col-start-3 lg:pt-2">
                    <p>
                      {formatiereDatum(a.datum)}, {a.lesezeitMinuten} Min. Lesezeit
                    </p>
                    <p className="mt-4 font-bold text-[var(--lp-blau)]">Artikel lesen</p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Unterseite>
  );
};

export default Ratgeber;
