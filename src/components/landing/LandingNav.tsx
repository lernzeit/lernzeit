import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { trackFireAndForget } from '@/lib/analytics';
import { sichtbareArtikel } from '@/content/ratgeber';

/**
 * Obere Leiste der Startseite und ihrer Unterseiten (Ratgeber, FAQ): Marke,
 * Sprungmarken, ein Knopf. Auf Unterseiten fuehren die Sprungmarken auf die
 * Startseite (/start#preise), dort scrollt Start.tsx an die Stelle.
 */
const LandingNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isNative = Capacitor.isNativePlatform();
  const aufStart = pathname === '/start' || pathname === '/';
  const imRatgeber = pathname.startsWith('/ratgeber');
  const [gescrollt, setGescrollt] = useState(false);

  useEffect(() => {
    const pruefen = () => setGescrollt(window.scrollY > 8);
    pruefen();
    window.addEventListener('scroll', pruefen, { passive: true });
    return () => window.removeEventListener('scroll', pruefen);
  }, []);

  const sprungmarken = [
    { id: 'so-funktionierts', text: "So funktioniert's" },
    ...(isNative ? [] : [{ id: 'preise', text: 'Preise' }]),
  ];
  const leise = 'text-[var(--lp-leise)] transition-colors hover:text-[var(--lp-tinte)]';
  const aktiv = 'text-[var(--lp-tinte)] underline decoration-[var(--lp-gruen-hell)] decoration-2 underline-offset-[6px]';
  const mitRatgeber = sichtbareArtikel().length > 0;

  return (
    <header
      className={`sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)] transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        gescrollt ? 'bg-white/90 backdrop-blur-xl shadow-[0_1px_0_var(--lp-karo)]' : 'bg-transparent'
      }`}
    >
      <nav className="lp-container flex h-16 items-center justify-between gap-6" aria-label="Hauptnavigation">
        <Link to="/start" className="flex items-center gap-2.5 shrink-0" aria-label="LernZeit – zur Startseite">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-primary to-secondary shadow-sm">
            <BookOpen className="h-[18px] w-[18px] text-white" strokeWidth={2.25} />
          </span>
          <span className="text-[1.125rem] font-extrabold tracking-[-0.02em] text-[var(--lp-tinte)]">LernZeit</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-[0.9375rem] font-semibold">
          {sprungmarken.map((l) =>
            aufStart ? (
              <a key={l.id} href={`#${l.id}`} className={leise}>{l.text}</a>
            ) : (
              <Link key={l.id} to={`/start#${l.id}`} className={leise}>{l.text}</Link>
            ),
          )}
          {aufStart ? (
            <a href="#faq" className={leise}>FAQ</a>
          ) : (
            <Link to="/faq" className={pathname === '/faq' ? aktiv : leise} aria-current={pathname === '/faq' ? 'page' : undefined}>
              FAQ
            </Link>
          )}
          {mitRatgeber && (
            <Link to="/ratgeber" className={imRatgeber ? aktiv : leise} aria-current={pathname === '/ratgeber' ? 'page' : undefined}>
              Ratgeber
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Mobil: auf der Startseite zum Ratgeber, auf Unterseiten zurueck */}
          {aufStart
            ? mitRatgeber && (
                <Link to="/ratgeber" className="md:hidden text-sm font-semibold text-[var(--lp-leise)]">
                  Ratgeber
                </Link>
              )
            : (
                <Link to="/start" className="md:hidden text-sm font-semibold text-[var(--lp-leise)]">
                  Startseite
                </Link>
              )}
          <button
            type="button"
            onClick={() => {
              trackFireAndForget('landing_cta_click', { position: aufStart ? 'nav' : `nav_${pathname.split('/')[1] || 'start'}` });
              navigate('/?auth=true');
            }}
            className="inline-flex h-10 items-center rounded-full bg-[var(--lp-tinte)] px-5 text-sm font-bold text-white transition-colors hover:bg-[#24388a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-blau)]"
          >
            Registrieren
          </button>
        </div>
      </nav>
    </header>
  );
};

export default LandingNav;
