import { useEffect } from 'react';

/**
 * Bewegung auf der Startseite, an einer Stelle:
 *
 * 1. Einblenden: Elemente mit `data-zeigen` gleiten beim Hineinscrollen ein
 *    (CSS in index.css, Abschnitt "Startseite"). Was beim Laden schon im Bild
 *    ist, bleibt einfach stehen — kein Aufblitzen, und der vorgerenderte Text
 *    ist ohne JavaScript sichtbar. Verzoegerung je Element: `--lp-verzug`.
 * 2. Tiefe: Elemente mit `data-tiefe="0.06"` verschieben sich beim Scrollen
 *    leicht gegeneinander (nur ab 1024 px und ohne "Bewegung reduzieren").
 *    Gemessen wird am Elternelement, das selbst nicht verschoben wird.
 */
export function useLandingBewegung(wurzel: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const root = wurzel.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const ruhig = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const ziele = Array.from(root.querySelectorAll<HTMLElement>('[data-zeigen]'));
    const hoehe = window.innerHeight;
    for (const el of ziele) {
      const r = el.getBoundingClientRect();
      if (r.top < hoehe && r.bottom > 0) el.classList.add('lp-da');
    }
    root.classList.add('lp-bewegt');

    const io = new IntersectionObserver(
      (eintraege) => {
        for (const e of eintraege) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('lp-da');
          io.unobserve(e.target);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    ziele.filter((el) => !el.classList.contains('lp-da')).forEach((el) => io.observe(el));

    let rahmen = 0;
    const tiefe = () => {
      rahmen = 0;
      const breit = window.innerWidth >= 1024;
      const h = window.innerHeight;
      root.querySelectorAll<HTMLElement>('[data-tiefe]').forEach((el) => {
        const bezug = el.parentElement;
        if (!bezug || ruhig || !breit) { el.style.translate = ''; return; }
        const r = bezug.getBoundingClientRect();
        if (r.bottom < -h || r.top > 2 * h) return;
        const v = (r.top + r.height / 2 - h / 2) * Number(el.dataset.tiefe || 0);
        el.style.translate = `0 ${v.toFixed(1)}px`;
      });
    };
    const anfordern = () => { if (!rahmen) rahmen = requestAnimationFrame(tiefe); };
    tiefe();
    window.addEventListener('scroll', anfordern, { passive: true });
    window.addEventListener('resize', anfordern, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', anfordern);
      window.removeEventListener('resize', anfordern);
      if (rahmen) cancelAnimationFrame(rahmen);
    };
  }, [wurzel]);
}
