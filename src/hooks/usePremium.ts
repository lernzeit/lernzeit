import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/hooks/useAuth';
import {
  initRevenueCat,
  identifyRevenueCatUser,
  isRevenueCatSupported,
  verifyEntitlementActive,
  getActivePlatform,
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
      const active = await verifyEntitlementActive();
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

  // Refresh entitlement whenever the app returns to foreground.
  // Covers cases where a purchase / cancel happened outside the app
  // (App Store, Subscription settings, browser Stripe checkout, etc.).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void check();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    let cleanupNative: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      (async () => {
        try {
          const { App } = await import('@capacitor/app');
          const handle = await App.addListener('appStateChange', (state) => {
            if (state.isActive) void check();
          });
          const resumeHandle = await App.addListener('resume', () => {
            void check();
          });
          cleanupNative = () => {
            try { handle.remove(); } catch { /* ignore */ }
            try { resumeHandle.remove(); } catch { /* ignore */ }
          };
        } catch { /* ignore */ }
      })();
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      cleanupNative?.();
    };
  }, [check]);

  // Listen for RevenueCat updates (native only – Web SDK exposes no listener API)
  useEffect(() => {
    if (!isRevenueCatSupported()) return;
    if (getActivePlatform() === 'web') return;
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        const callbackID = await Purchases.addCustomerInfoUpdateListener((info: any) => {
          const active = !!info?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
          setRcPremium(active);
        });
        cleanup = () => {
          try {
            Purchases.removeCustomerInfoUpdateListener({ listenerToRemove: callbackID as any });
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
    refresh: check,
  };
}