import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  initRevenueCat,
  identifyRevenueCatUser,
  isRevenueCatSupported,
  PREMIUM_ENTITLEMENT_ID,
} from '@/services/revenueCat';
import { useSubscription } from '@/hooks/useSubscription';

export interface PremiumState {
  isPremium: boolean;
  loading: boolean;
  source: 'revenuecat' | 'stripe' | 'none';
  refresh: () => Promise<void>;
}

/**
 * Unified premium check. On iOS native, prefers RevenueCat entitlement.
 * On web/Android, falls back to Stripe subscription (useSubscription).
 */
export function usePremium(): PremiumState {
  const { user } = useAuth();
  const stripe = useSubscription();

  const [rcPremium, setRcPremium] = useState(false);
  const [rcLoading, setRcLoading] = useState(isRevenueCatSupported());

  const check = useCallback(async () => {
    if (!isRevenueCatSupported()) {
      setRcLoading(false);
      return;
    }
    try {
      await initRevenueCat(user?.id ?? null);
      if (user?.id) await identifyRevenueCatUser(user.id);
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.getCustomerInfo();
      const active = !!customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
      setRcPremium(active);
    } catch (err) {
      console.warn('Premium check failed:', err);
      setRcPremium(false);
    } finally {
      setRcLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    check();
  }, [check]);

  // Listen for RevenueCat updates
  useEffect(() => {
    if (!isRevenueCatSupported()) return;
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        const handle = await Purchases.addCustomerInfoUpdateListener((info: any) => {
          const active = !!info?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
          setRcPremium(active);
        });
        cleanup = () => {
          try {
            (Purchases as any).removeCustomerInfoUpdateListener?.(handle);
          } catch { /* ignore */ }
        };
      } catch { /* ignore */ }
    })();
    return () => cleanup?.();
  }, []);

  if (isRevenueCatSupported()) {
    return {
      isPremium: rcPremium,
      loading: rcLoading,
      source: rcPremium ? 'revenuecat' : 'none',
      refresh: check,
    };
  }

  return {
    isPremium: stripe.isPremium || stripe.isTrialing,
    loading: stripe.loading,
    source: stripe.isPremium || stripe.isTrialing ? 'stripe' : 'none',
    refresh: async () => { /* Stripe refresh handled via useSubscription interval */ },
  };
}