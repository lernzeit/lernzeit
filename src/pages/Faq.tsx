import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Seo from '@/components/Seo';
import LegalFooter from '@/components/layout/LegalFooter';
import { FaqListe } from '@/components/landing/FaqSection';
import { FAQ_JSON_LD } from '@/content/faq';

const Faq = () => (
  <main className="min-h-screen bg-background pt-safe-top pb-safe-bottom px-safe">
    <Seo
      title="Häufige Fragen – LernZeit"
      description="Antworten zu Kosten, Testphase, Bildschirmzeit, Fächern, Verbindung mit dem Kind, Datenschutz und Kontolöschung bei LernZeit."
      path="/faq"
    />
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(FAQ_JSON_LD)}</script>
    </Helmet>
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link to="/start" className="text-sm text-muted-foreground hover:text-foreground">LernZeit</Link>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 mb-10">Häufige Fragen</h1>
      <section data-abschnitt="faq">
        <FaqListe />
      </section>
      <div className="mt-10 space-y-3 text-base">
        <p>
          <a href="mailto:info@lernzeit.app" className="text-primary hover:underline break-words">
            Weitere Fragen? Schreib uns an info@lernzeit.app
          </a>
        </p>
        <p>
          <Link to="/start" className="text-primary hover:underline">Mehr über LernZeit</Link>
        </p>
      </div>
    </div>
    <LegalFooter className="pb-8" />
  </main>
);

export default Faq;
