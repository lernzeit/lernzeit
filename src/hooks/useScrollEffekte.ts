import { useEffect } from 'react';

/**
 * Scroll-Effekte der Startseite, an einer Stelle gebuendelt:
 * - `--lz-fortschritt` (0…1) auf `wurzel` fuer den Fortschrittsbalken oben.
 * - Parallaxe fuer Elemente mit `data-parallax="<Faktor>"`: verschiebt sie
 *   (CSS `translate`, verträgt sich mit `transform`-Animationen) abhaengig davon,
 *   wo ihr Elternelement im Bildschirm steht. Gemessen wird am Elternelement,
 *   weil das eigene Rechteck die Verschiebung schon enthaelt.
 *
 * Bei "Bewegung reduzieren" gibt es keine Parallaxe, nur den Balken.
 * Ein Durchlauf je Bild (requestAnimationFrame), passiver Scroll-Listener.
 */
export function useScrollEffekte(wurzel: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const root = wurzel.current;
    if (!root || typeof window === 'undefined') return;
    const ruhig = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    let rahmen = 0;
    const aktualisieren = () => {
      rahmen = 0;
      const hoehe = window.innerHeight;
      const max = document.documentElement.scrollHeight - hoehe;
      root.style.setProperty('--lz-fortschritt', String(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0));
      if (ruhig) return;
      const staerke = window.innerWidth < 768 ? 0.5 : 1;
      root.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
        const bezug = el.parentElement;
        if (!bezug) return;
        const r = bezug.getBoundingClientRect();
        if (r.bottom < -hoehe || r.top > hoehe * 2) return;
        const versatz = (r.top + r.height / 2 - hoehe / 2) * (Number(el.dataset.parallax) || 0) * staerke;
        el.style.translate = `0 ${versatz.toFixed(1)}px`;
      });
    };
    const anfordern = () => {
      if (!rahmen) rahmen = requestAnimationFrame(aktualisieren);
    };

    aktualisieren();
    window.addEventListener('scroll', anfordern, { passive: true });
    window.addEventListener('resize', anfordern, { passive: true });
    return () => {
      window.removeEventListener('scroll', anfordern);
      window.removeEventListener('resize', anfordern);
      if (rahmen) cancelAnimationFrame(rahmen);
    };
  }, [wurzel]);
}
