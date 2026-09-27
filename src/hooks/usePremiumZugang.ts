import { usePremium } from '@/hooks/usePremium';
import { useSubscription, type SubscriptionState } from '@/hooks/useSubscription';

/**
 * Darf dieses Konto Premium-Funktionen nutzen? Die eine Antwort für alle
 * Sperren.
 *
 * Bis zum 27.09.2026 fragten die Sperren nur `useSubscription`, also den
 * Server — und der kannte keine Käufe aus App Store und Google Play. Die
 * Anzeige („Premium aktiv") kam dagegen aus RevenueCat. Eine zahlende
 * Kundin sah darum Premium und kam an keine Premium-Funktion.
 *
 * Heute trägt der RevenueCat-Webhook Store-Käufe auf dem Server ein. Dieser
 * Hook nimmt RevenueCat trotzdem dazu: Zwischen Kauf und Webhook vergehen
 * Sekunden bis Minuten, und in dieser Zeit soll der Kauf schon wirken.
 */
export function usePremiumZugang(): SubscriptionState {
  const server = useSubscription();
  const { isPremium, source } = usePremium();
  const imStore = source === 'revenuecat' && isPremium;

  if (!imStore) return server;
  return {
    ...server,
    isPremium: true,
    plan: 'premium',
    // Ein bezahltes Store-Abo ist keine Testphase, auch wenn der Server
    // noch die alte Testphase kennt.
    isTrialing: false,
    trialJustExpired: false,
    loading: false,
  };
}
