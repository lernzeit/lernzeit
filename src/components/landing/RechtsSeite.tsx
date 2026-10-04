import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import LegalFooter from '@/components/layout/LegalFooter';
import LandingNav from './LandingNav';
import { Brotkrumen } from './Unterseite';

/**
 * Rahmen fuer Impressum, Datenschutz, Nutzungsbedingungen, Widerruf und
 * Kuendigung im Gestaltungsbild der Website (04.10.2026). Ohne Werbeband:
 * Die Seiten werden auch aus der App heraus geoeffnet, deshalb gibt es oben
 * einen Weg zurueck dorthin, woher man kam.
 */
export const RechtsSeite = ({
  titel,
  stand,
  children,
}: {
  titel: string;
  /** Fester Stand des Textes, z. B. "4. Oktober 2026" */
  stand?: string;
  children: React.ReactNode;
}) => {
  const navigate = useNavigate();
  // 'default' = erste Seite dieses Besuchs (direkt aufgerufen oder vorgerendert).
  const mitVerlauf = useLocation().key !== 'default';
  return (
    <main className="lp relative min-h-screen pb-safe-bottom px-safe">
      <LandingNav />
      <header className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="lp-karo pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_90%_at_85%_10%,#000_20%,transparent_70%)]"
        />
        <div className="lp-container relative pb-10 pt-8 sm:pt-12">
          {mitVerlauf ? (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="-ml-2 inline-flex h-11 items-center gap-1 rounded-full pl-1 pr-4 text-[0.9375rem] font-bold text-[var(--lp-blau)] hover:bg-[var(--lp-heft)]"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
              Zurück
            </button>
          ) : (
            <Brotkrumen pfad={[{ text: 'Startseite', zu: '/start' }, { text: titel }]} />
          )}
          <h1 className="mt-6 text-[2.25rem] font-extrabold sm:text-[3rem]">{titel}</h1>
          {stand && <p className="mt-3 text-[var(--lp-leise)]">Stand: {stand}</p>}
        </div>
      </header>

      <article
        className={[
          'lp-container pb-8',
          '[&_section]:max-w-[44rem] [&_section]:border-t [&_section]:border-[var(--lp-karo)] [&_section]:py-8',
          '[&_h2]:text-[1.375rem] [&_h2]:font-extrabold sm:[&_h2]:text-[1.5rem]',
          '[&_h3]:mt-6 [&_h3]:text-[1.0625rem] [&_h3]:font-extrabold',
          '[&_p]:mt-3 [&_p]:leading-relaxed',
          '[&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-6',
          '[&_li]:leading-relaxed [&_li]:pl-1',
          '[&_a]:break-words [&_a]:font-semibold [&_a]:text-[var(--lp-blau)] [&_a]:underline-offset-4 hover:[&_a]:underline',
          '[&_strong]:font-bold [&_strong]:text-[var(--lp-tinte)]',
        ].join(' ')}
      >
        {children}
      </article>

      <LegalFooter className="pb-8 pt-10" />
    </main>
  );
};

/** Hervorgehobener Kasten in einem Rechtstext, z. B. das Widerspruchsrecht. */
export const RechtsKasten = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-4 rounded-2xl bg-[var(--lp-heft)] p-5 ring-1 ring-inset ring-[var(--lp-karo)] sm:p-6 [&>*:first-child]:mt-0">
    {children}
  </div>
);
