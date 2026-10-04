import { useEffect, useState } from 'react';

/**
 * Bildschirmtastatur auf Handy und Tablet (Rueckmeldung 04.10.2026).
 *
 * iOS verkleinert beim Tippen nur den sichtbaren Ausschnitt, nicht die Seite.
 * Die fest stehende Knopfleiste im Spiel rutschte dadurch ueber die Tastatur
 * und verdeckte das Eingabefeld; man sah nicht, was man tippt. Zusaetzlich
 * blieb nach dem Schliessen der Tastatur der Ausschnitt manchmal verschoben,
 * sodass sich die Seite nicht mehr bis ganz nach oben scrollen liess.
 */

function istTextfeld(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (!(el instanceof HTMLInputElement)) return false;
  return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'file', 'color'].includes(el.type);
}

function hatBildschirmtastatur() {
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
}

/**
 * true, solange auf einem Touch-Geraet ein Textfeld den Fokus hat. Das Feld
 * wird dabei in die Mitte des sichtbaren Bereichs geschoben.
 */
export function useTastaturOffen() {
  const [offen, setOffen] = useState(false);

  useEffect(() => {
    if (!hatBildschirmtastatur()) return;
    let zeitgeber: ReturnType<typeof setTimeout> | undefined;

    const insBild = () => {
      const el = document.activeElement;
      if (istTextfeld(el)) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    const rein = (e: FocusEvent) => {
      if (!istTextfeld(e.target as Element)) return;
      setOffen(true);
      clearTimeout(zeitgeber);
      // Erst wenn die Tastatur steht, ist klar, wie viel Platz bleibt.
      zeitgeber = setTimeout(insBild, 320);
    };
    const raus = () => {
      clearTimeout(zeitgeber);
      // Beim Wechsel von einem Feld ins naechste nicht kurz zuklappen.
      zeitgeber = setTimeout(() => {
        if (!istTextfeld(document.activeElement)) {
          setOffen(false);
          ausschnittZuruecksetzen();
        }
      }, 80);
    };
    const groesse = () => {
      if (istTextfeld(document.activeElement)) insBild();
    };

    document.addEventListener('focusin', rein);
    document.addEventListener('focusout', raus);
    window.visualViewport?.addEventListener('resize', groesse);
    return () => {
      clearTimeout(zeitgeber);
      document.removeEventListener('focusin', rein);
      document.removeEventListener('focusout', raus);
      window.visualViewport?.removeEventListener('resize', groesse);
    };
  }, []);

  return offen;
}

/**
 * Schiebt einen nach dem Tippen verschobenen Ausschnitt zurueck. Ein Scroll
 * auf die aktuelle Position genuegt, damit iOS Seite und Ausschnitt wieder
 * deckungsgleich legt.
 */
export function ausschnittZuruecksetzen() {
  if (typeof window === 'undefined') return;
  window.scrollTo(window.scrollX, window.scrollY);
}

/**
 * Neuer Bildschirm (Kind-Start, Spiel, Faecher): Tastatur schliessen und oben
 * anfangen. Vorher blieb die Scrollposition des vorigen Bildschirms stehen.
 */
export function useSeitenanfang() {
  useEffect(() => {
    const el = document.activeElement;
    if (istTextfeld(el)) el.blur();
    window.scrollTo(0, 0);
    // Nach dem Schliessen der Tastatur noch einmal, falls iOS nachschiebt.
    const t = setTimeout(() => window.scrollTo(0, 0), 350);
    return () => clearTimeout(t);
  }, []);
}

/**
 * Fuer die ganze App (main.tsx): Nach dem Verlassen eines Textfelds den
 * Ausschnitt zuruecksetzen, auch in Eltern-Formularen und Dialogen.
 */
export function ausschnittKorrekturEinrichten() {
  if (typeof window === 'undefined' || !hatBildschirmtastatur()) return;
  document.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!istTextfeld(document.activeElement)) ausschnittZuruecksetzen();
    }, 120);
  });
}
