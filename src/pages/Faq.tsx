import { Helmet } from 'react-helmet-async';
import Seo from '@/components/Seo';
import { Unterseite, Brotkrumen } from '@/components/landing/Unterseite';
import { FAQ, FAQ_JSON_LD } from '@/content/faq';

const Faq = () => (
  <Unterseite position="faq_seite">
    <Seo
      title="Häufige Fragen – LernZeit"
      description="Antworten zu Kosten, Testphase, Bildschirmzeit, Fächern, Verbindung mit dem Kind, Datenschutz und Kontolöschung bei LernZeit."
      path="/faq"
    />
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(FAQ_JSON_LD)}</script>
    </Helmet>

    <header className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="lp-karo pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_90%_at_85%_10%,#000_20%,transparent_70%)]"
      />
      <div className="lp-container relative pb-12 pt-8 sm:pt-12 lg:pb-16">
        <Brotkrumen pfad={[{ text: 'Startseite', zu: '/start' }, { text: 'Häufige Fragen' }]} />
        <h1 className="mt-6 text-[2.5rem] font-extrabold sm:text-[3.5rem]">Häufige Fragen</h1>
      </div>
    </header>

    <div className="lp-container grid gap-12 lg:grid-cols-12">
      {/* Alle Antworten offen: Auf der eigenen FAQ-Seite sollen sie ohne Klick
          lesbar sein und im vorgerenderten HTML stehen (Suchmaschinen). */}
      <section data-abschnitt="faq" className="border-t border-[var(--lp-karo)] lg:col-span-8">
        {FAQ.map(({ f, a }) => (
          <div key={f} className="border-b border-[var(--lp-karo)] py-8">
            <h2 className="text-[1.25rem] font-extrabold sm:text-[1.375rem]">{f}</h2>
            <p className="mt-3 max-w-[42rem] leading-relaxed">{a}</p>
          </div>
        ))}
      </section>
      <aside className="lg:col-span-4">
        <div className="rounded-3xl bg-[var(--lp-heft)] p-6 sm:p-8 lg:sticky lg:top-[calc(var(--lp-nav)_+_2rem)]">
          <p className="text-[1.25rem] font-extrabold text-[var(--lp-tinte)]">Weitere Fragen?</p>
          <p className="mt-2 leading-relaxed">Schreib uns eine E-Mail.</p>
          <a
            href="mailto:info@lernzeit.app"
            className="mt-4 inline-block break-words font-bold text-[var(--lp-blau)] underline-offset-4 hover:underline"
          >
            info@lernzeit.app
          </a>
        </div>
      </aside>
    </div>
  </Unterseite>
);

export default Faq;
