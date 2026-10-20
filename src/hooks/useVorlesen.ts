import { useCallback, useEffect, useState } from 'react';
import { stoppen, vorlesen } from '@/services/vorlesen';

export type VorleseStand = 'aus' | 'laedt' | 'spricht';

/**
 * Vorlesen mit KI-Stimme für eine Ansicht. `schluessel` unterscheidet, was
 * gerade vorgelesen wird (z. B. 'aufgabe' oder 'erklaerung'), damit nur der
 * passende Knopf „Stopp“ zeigt. Beim Verlassen der Ansicht wird gestoppt.
 */
export function useVorlesen(grade: number) {
  const [aktiv, setAktiv] = useState<string | null>(null);
  const [stand, setStand] = useState<VorleseStand>('aus');

  useEffect(() => () => stoppen(), []);

  const starten = useCallback((schluessel: string, text: string) => {
    setAktiv(schluessel);
    setStand('laedt');
    vorlesen(text, grade, {
      onStart: () => setStand('spricht'),
      onEnde: () => { setStand('aus'); setAktiv(null); },
    });
  }, [grade]);

  const beenden = useCallback(() => {
    stoppen();
    setStand('aus');
    setAktiv(null);
  }, []);

  return { aktiv, stand, starten, beenden };
}
