import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Seo from '@/components/Seo';
import LegalFooter from '@/components/layout/LegalFooter';
import { sichtbareArtikel, formatiereDatum } from '@/content/ratgeber';

const Ratgeber = () => {
  const liste = sichtbareArtikel();
  return (
    <main className="min-h-screen bg-background pt-safe-top pb-safe-bottom px-safe">
      <Seo
        title="Ratgeber – LernZeit"
        description="Artikel rund um Bildschirmzeit und Lernen für Eltern."
        path="/ratgeber"
      />
      {liste.length === 0 && (
        <Helmet>
          <meta name="robots" content="noindex" />
        </Helmet>
      )}
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Link to="/start" className="text-sm text-muted-foreground hover:text-foreground">LernZeit</Link>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 mb-10">Ratgeber</h1>
        {liste.length === 0 ? (
          <p className="text-muted-foreground">Hier erscheinen bald Artikel rund um Bildschirmzeit und Lernen.</p>
        ) : (
          <ul className="space-y-8">
            {liste.map((a) => (
              <li key={a.slug}>
                <Link to={`/ratgeber/${a.slug}`} className="group block">
                  <h2 className="text-xl font-bold group-hover:text-primary transition-colors">{a.titel}</h2>
                  <p className="text-muted-foreground mt-1">{a.beschreibung}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatiereDatum(a.datum)} · {a.lesezeitMinuten} Min. Lesezeit
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <LegalFooter className="pb-8" />
    </main>
  );
};

export default Ratgeber;
