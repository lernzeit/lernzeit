import { useEffect, useState } from 'react';
import {
  getOfferings,
  initRevenueCat,
  isRevenueCatSupported,
  type NormalizedPackage,
} from '@/services/revenueCat';
import { useAuth } from '@/hooks/useAuth';

export interface OfferingsState {
  monthly: NormalizedPackage | null;
  annual: NormalizedPackage | null;
  loading: boolean;
  error: string | null;
  supported: boolean;
  reload: () => Promise<void>;
}

/**
 * Loads the current RevenueCat offerings so UI can show localized,
 * store-driven prices (pkg.priceString) instead of hardcoded values.
 */
export function useOfferings(): OfferingsState {
  const { user } = useAuth();
  const supported = isRevenueCatSupported();
  const [monthly, setMonthly] = useState<NormalizedPackage | null>(null);
  const [annual, setAnnual] = useState<NormalizedPackage | null>(null);
  const [loading, setLoading] = useState<boolean>(supported);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!supported) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await initRevenueCat(user?.id ?? null);
      const { monthly: m, annual: a } = await getOfferings();
      setMonthly(m);
      setAnnual(a);
      if (!m && !a) setError('Keine Angebote verfügbar.');
    } catch (err: any) {
      setError(err?.message ?? 'Angebote konnten nicht geladen werden.');
      setMonthly(null);
      setAnnual(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { monthly, annual, loading, error, supported, reload: load };
}