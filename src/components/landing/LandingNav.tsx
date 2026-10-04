import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { trackFireAndForget } from '@/lib/analytics';
import { sichtbareArtikel } from '@/content/ratgeber';

/** Obere Leiste der Startseite: Marke, Sprungmarken, ein Knopf. */
const LandingNav = () => {
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();
  const [gescrollt, setGescrollt] = useState(false);

  useEffect(() => {
    const pruefen = () => setGescrollt(window.scrollY > 8);
    pruefen();
    window.addEventListener('scroll', pruefen, { passive: true });
    return () => window.removeEventListener('scroll', pruefen);
  }, []);

  const links = [
    { href: '#so-funktionierts', text: "So funktioniert's" },
    ...(isNative ? [] : [{ href: '#preise', text: 'Preise' }]),
    { href: '#faq', text: 'FAQ' },
  ];

  return (
    <header
      className={`sticky top-0 z-40 pt-safe-top transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
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
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-[var(--lp-leise)] transition-colors hover:text-[var(--lp-tinte)]">
              {l.text}
            </a>
          ))}
          {sichtbareArtikel().length > 0 && (
            <Link to="/ratgeber" className="text-[var(--lp-leise)] transition-colors hover:text-[var(--lp-tinte)]">
              Ratgeber
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          {sichtbareArtikel().length > 0 && (
            <Link to="/ratgeber" className="md:hidden text-sm font-semibold text-[var(--lp-leise)]">
              Ratgeber
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              trackFireAndForget('landing_cta_click', { position: 'nav' });
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
