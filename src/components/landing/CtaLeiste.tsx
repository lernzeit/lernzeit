import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Klecksi } from '@/components/klecksi/Klecksi';
import { trackFireAndForget } from '@/lib/analytics';

/**
 * Feste Leiste unten auf dem Handy (bis 1024 px): erscheint, sobald der
 * Knopf im Hero aus dem Bild ist, und verschwindet am Seitenende, wo der
 * grosse Aufruf steht. Setzt `--lp-leiste` auf der Seite, damit die
 * Kapitelkarten (ZweiAnsichten, KlecksiReise) darueber stehen bleiben.
 */
const CtaLeiste = () => {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const [sichtbar, setSichtbar] = useState(false);

  useEffect(() => {
    const seite = ref.current?.closest('.lp') as HTMLElement | null;
    const hero = seite?.querySelector('[data-abschnitt="hero"]');
    const ende = seite?.querySelector('[data-abschnitt="fusszeile"]');
    if (!seite || !hero || !ende || typeof IntersectionObserver === 'undefined') return;
    const stand = { hero: true, ende: false };
    const io = new IntersectionObserver((eintraege) => {
      for (const e of eintraege) {
        if (e.target === hero) stand.hero = e.isIntersecting;
        if (e.target === ende) stand.ende = e.isIntersecting;
      }
      setSichtbar(!stand.hero && !stand.ende);
    }, { rootMargin: '0px 0px -10% 0px' });
    io.observe(hero);
    io.observe(ende);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const seite = ref.current?.closest('.lp') as HTMLElement | null;
    if (!seite) return;
    const schmal = window.matchMedia('(max-width: 1023px)').matches;
    seite.style.setProperty('--lp-leiste', sichtbar && schmal ? '76px' : '0px');
  }, [sichtbar]);

  return (
    <div
      ref={ref}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[var(--lp-karo)] bg-white/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl transition-transform duration-300 motion-reduce:transition-none lg:hidden ${
        sichtbar ? 'translate-y-0' : 'translate-y-full'
      }`}
      aria-hidden={!sichtbar}
    >
      <div className="lp-container flex h-[76px] items-center gap-3">
        <span aria-hidden="true" className="-mb-1 shrink-0">
          <Klecksi groesse={40} />
        </span>
        <p className="min-w-0 flex-1 whitespace-nowrap text-[0.875rem] font-bold leading-tight text-[var(--lp-tinte)]">
          4 Wochen kostenlos
          <span className="block text-[0.75rem] font-medium text-[var(--lp-leise)]">ohne Zahlungsdaten</span>
        </p>
        <button
          type="button"
          tabIndex={sichtbar ? 0 : -1}
          onClick={() => {
            trackFireAndForget('landing_cta_click', { position: 'leiste' });
            navigate('/?auth=true');
          }}
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-[var(--lp-blau)] px-5 text-[0.9375rem] font-bold text-white shadow-[0_8px_20px_-10px_rgba(37,99,235,0.8)] transition-colors hover:bg-[#1d4ed8]"
        >
          Jetzt starten
        </button>
      </div>
    </div>
  );
};

export default CtaLeiste;
