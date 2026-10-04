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
        description="Artikel für Eltern rund um Bildschirmzeit und Lernen. Jede Zahl mit Quelle, vor der Veröffentlichung am Original geprüft."
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
          <div className="hidden lg:col-span-4 lg:flex lg:items-end lg:justify-end lg:pb-2">
            <Randnotiz farbe="gruen" drehung={-4} verzug={300} className="w-[15rem] text-[1.3125rem]">
              Jede Zahl mit Quelle – vor der Veröffentlichung am Original geprüft.
            </Randnotiz>
          </div>
        </div>
      </header>

      <div className="lp-container">
        <p className="mb-8 text-[0.9375rem] text-[var(--lp-leise)] lg:hidden">
          Jede Zahl ist mit einer Quelle belegt, die wir vor der Veröffentlichung am Original geprüft haben.
        </p>
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
                    <p className="mt-1">Quellen: {[...new Set(a.quellen.map((q) => q.herausgeber))].join(', ')}</p>
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
