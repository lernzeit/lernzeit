import { useEffect } from 'react';
import { trackFireAndForget } from '@/lib/analytics';

/** Schon gemeldete Abschnitte dieses Besuchs (nur im Arbeitsspeicher). */
const gemeldet = new Set<string>();

/**
 * Meldet `abschnitt_gesehen`, sobald ein Abschnitt der Startseite zu mindestens
 * 50 % sichtbar war — einmal je Abschnitt und Besuch (Tab).
 *
 * Abschnitte sind Elemente mit `data-abschnitt="…"` innerhalb von `wurzel`.
 * Neue Abschnitte (z. B. eine spaeter ergaenzte FAQ) werden automatisch erfasst.
 *
 * "50 % sichtbar" heisst: die Haelfte des Abschnitts ODER, bei Abschnitten,
 * die hoeher als der Bildschirm sind, die Haelfte des Bildschirms.
 */
export function useAbschnittMessung(wurzel: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const root = wurzel.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;

    const io = new IntersectionObserver(
      (eintraege) => {
        for (const e of eintraege) {
          const name = (e.target as HTMLElement).dataset.abschnitt;
          if (!name || gemeldet.has(name) || !e.isIntersecting) continue;
          const hoehe = e.rootBounds?.height ?? window.innerHeight;
          if (e.intersectionRatio >= 0.5 || e.intersectionRect.height >= hoehe * 0.5) {
            gemeldet.add(name);
            trackFireAndForget('abschnitt_gesehen', { abschnitt: name });
            io.unobserve(e.target);
          }
        }
      },
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );

    const beobachtet = new WeakSet<Element>();
    const aufnehmen = () => {
      root.querySelectorAll('[data-abschnitt]').forEach((el) => {
        const name = (el as HTMLElement).dataset.abschnitt;
        if (beobachtet.has(el) || !name || gemeldet.has(name)) return;
        beobachtet.add(el);
        io.observe(el);
      });
    };
    aufnehmen();
    const mo = new MutationObserver(aufnehmen);
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [wurzel]);
}
