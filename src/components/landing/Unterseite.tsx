import { Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import LegalFooter from '@/components/layout/LegalFooter';
import { trackFireAndForget } from '@/lib/analytics';
import LandingNav from './LandingNav';

/**
 * Rahmen fuer die Unterseiten der Website (Ratgeber, FAQ) im Gestaltungsbild
 * der Startseite: dieselbe Leiste oben, Brotkrumen mit dem Weg zurueck, am
 * Ende ein Band zum Registrieren und ein Link zur Startseite.
 */
export const Unterseite = ({
  children,
  position,
}: {
  children: React.ReactNode;
  /** Wert fuer landing_cta_click.position, z. B. "ratgeber_artikel" */
  position: string;
}) => {
  const navigate = useNavigate();
  return (
    <main className="lp relative min-h-screen pb-safe-bottom px-safe">
      <LandingNav />
      {children}

      <section className="mt-24 px-3 sm:px-5 lg:mt-32">
        <div className="lp-band lp-karo rounded-[28px] py-16 sm:rounded-[36px] lg:py-20">
          <div className="lp-container flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[2rem] font-extrabold sm:text-5xl">Lernen belohnen. Handyzeit verdienen.</h2>
              <p className="mt-4 max-w-lg text-lg leading-relaxed">
                Kinder lösen Aufgaben und verdienen pro richtige Antwort Bildschirmzeit – wie viel, bestimmen die Eltern.
                Die ersten 4 Wochen sind kostenlos.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => {
                  trackFireAndForget('landing_cta_click', { position });
                  navigate('/?auth=true');
                }}
                className="inline-flex h-14 items-center justify-center rounded-full bg-white px-8 text-[1.0625rem] font-bold text-[var(--lp-tinte)] transition-colors hover:bg-[#e8eeff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Kostenlos registrieren
              </button>
              <Link
                to="/start"
                className="inline-flex h-14 items-center justify-center rounded-full px-6 text-[1.0625rem] font-bold text-white ring-1 ring-inset ring-white/30 transition-colors hover:bg-white/10"
              >
                Zur Startseite
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LegalFooter className="pb-8 pt-6" />
    </main>
  );
};

/** Brotkrumen: Startseite › Ratgeber › Artikel. Der letzte Eintrag ist die aktuelle Seite. */
export const Brotkrumen = ({ pfad }: { pfad: { text: string; zu?: string }[] }) => (
  <nav aria-label="Brotkrumen" className="text-[0.9375rem] font-semibold">
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {pfad.map((p, i) => (
        <Fragment key={p.text}>
          {i > 0 && (
            <li aria-hidden="true" className="text-[var(--lp-karo-dunkel)]">
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </li>
          )}
          <li className="min-w-0">
            {p.zu ? (
              <Link to={p.zu} className="text-[var(--lp-blau)] underline-offset-4 hover:underline">
                {p.text}
              </Link>
            ) : (
              <span aria-current="page" className="text-[var(--lp-leise)] line-clamp-1">{p.text}</span>
            )}
          </li>
        </Fragment>
      ))}
    </ol>
  </nav>
);
