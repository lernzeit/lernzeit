import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hat der Betreiber diesem Konto Premium von Hand eingetragen (premium_grants, Grund "betreiber")?
 * Solche Konten dürfen Premium verschenken, auch wenn der Server noch „Testversion“ meldet
 * (Stand 14.11.2026: das Eltern-Konto des Betreibers hing an einer Stripe-Testphase, der Reiter
 * „Verschenken“ gibt es sonst nur für bezahltes Premium). Die Tabelle liest jedes Konto nur für sich.
 */
export function useBetreiberPremium(userId: string | null | undefined): boolean {
  const [ja, setJa] = useState(false);

  useEffect(() => {
    if (!userId) { setJa(false); return; }
    let abgebrochen = false;
    supabase
      .from('premium_grants')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('reason', 'betreiber')
      .then(({ count }) => { if (!abgebrochen) setJa((count ?? 0) > 0); });
    return () => { abgebrochen = true; };
  }, [userId]);

  return ja;
}
