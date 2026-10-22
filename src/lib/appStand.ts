import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Stand des Web-Teils (JJJJMMTT), den die App beim Start meldet
 * (`profiles.app_stand`, RPC `app_stand_melden`). send-push wählt danach die
 * Wörter: vor 20261013 Lernpflanze, danach Klecksi bzw. sachlich.
 * Hochsetzen, wenn eine Push-Formulierung von einer neuen App-Fassung abhängt.
 */
export const APP_STAND = 20261022;

/**
 * Ab dieser Fassung bietet die App jedem Kind die LernZeit-Handysperre an
 * (useHandysperre.ts). Ältere Fassungen nur Kindern aus `handysperre_freigaben`.
 */
export const HANDYSPERRE_FUER_ALLE_AB = 20261022;

/** Einmal je Sitzung, nur für Kinder. Fehler sind egal. */
export function useAppStandMelden(userId: string | undefined, istKind: boolean) {
  useEffect(() => {
    if (!userId || !istKind) return;
    const schluessel = `lernzeit_app_stand_${userId}`;
    try { if (sessionStorage.getItem(schluessel) === String(APP_STAND)) return; } catch { /* weiter */ }
    void supabase.rpc('app_stand_melden', { p_stand: APP_STAND }).then(({ error }) => {
      if (error) return;
      try { sessionStorage.setItem(schluessel, String(APP_STAND)); } catch { /* egal */ }
    });
  }, [userId, istKind]);
}
