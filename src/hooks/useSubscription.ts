import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface SubscriptionState {
  isPremium: boolean;
  isTrialing: boolean;
  trialJustExpired: boolean;
  trialDaysLeft: number | null;
  plan: 'free' | 'premium';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | null;
  currentPeriodEnd: string | null;
  /**
   * Gesetzt, wenn das Abo gekuendigt ist, aber noch laeuft: der letzte Tag
   * mit Premium. Der Status bleibt bis dahin 'active' — nur hieran erkennt
   * man die Kuendigung.
   */
  cancelAt: string | null;
  trialEnd: string | null;
  loading: boolean;
  error: Error | null;
}

const LEER: SubscriptionState = {
  isPremium: false,
  isTrialing: false,
  trialJustExpired: false,
  trialDaysLeft: null,
  plan: 'free',
  status: null,
  currentPeriodEnd: null,
  cancelAt: null,
  trialEnd: null,
  loading: true,
  error: null,
};

const ABGEMELDET: SubscriptionState = { ...LEER, loading: false };

/** Ergebnis gilt so lange; der 60-Sekunden-Takt liegt knapp darueber. */
const FRISCH_MS = 55_000;

/**
 * Ein Abgleich fuer die ganze App.
 *
 * Bis zum 25.09.2026 fragte jede Komponente, die den Hook benutzt, selbst:
 * beim Einhaengen und dann jede Minute. Das Eltern-Dashboard haengt ihn
 * vier- bis sechsmal gleichzeitig ein — jeder Aufruf der Edge Function
 * kostete bis zu drei Stripe-Anfragen. Jetzt teilen sich alle einen Stand,
 * eine laufende Anfrage und einen Takt.
 */
const speicher: {
  userId: string | null;
  state: SubscriptionState;
  stand: number;
  laufend: Promise<void> | null;
  hoerer: Set<(s: SubscriptionState) => void>;
  takt: ReturnType<typeof setInterval> | null;
} = {
  userId: null,
  state: LEER,
  stand: 0,
  laufend: null,
  hoerer: new Set(),
  takt: null,
};

function setze(state: SubscriptionState) {
  speicher.state = state;
  speicher.hoerer.forEach((h) => h(state));
}

function aktualisiere(userId: string): Promise<void> {
  if (speicher.userId !== userId) {
    // Anderes Konto: nichts vom vorigen weiterzeigen.
    speicher.userId = userId;
    speicher.stand = 0;
    speicher.laufend = null;
    setze(LEER);
  }
  if (speicher.laufend) return speicher.laufend;
  if (Date.now() - speicher.stand < FRISCH_MS) return Promise.resolve();

  const lauf: Promise<void> = lade(userId)
    .then(({ state, gueltig }) => {
      if (speicher.userId !== userId) return;
      // Ohne Sitzung ist das Ergebnis kein Befund: nicht zwischenspeichern,
      // damit die naechste Komponente es gleich wieder versucht.
      speicher.stand = gueltig ? Date.now() : 0;
      setze(state);
    })
    .finally(() => {
      if (speicher.laufend === lauf) speicher.laufend = null;
    });
  speicher.laufend = lauf;
  return lauf;
}

/**
 * Hook to check subscription status via Stripe (check-subscription edge function).
 * For child accounts, the edge function checks the parent's subscription.
 */
export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [state, setState] = useState<SubscriptionState>(() =>
    userId && speicher.userId === userId ? speicher.state : userId ? LEER : ABGEMELDET,
  );

  useEffect(() => {
    if (!userId) {
      setState(ABGEMELDET);
      return;
    }
    speicher.hoerer.add(setState);
    if (speicher.userId === userId) setState(speicher.state);
    aktualisiere(userId);
    if (!speicher.takt) {
      speicher.takt = setInterval(() => {
        if (speicher.userId) aktualisiere(speicher.userId);
      }, 60_000);
    }
    return () => {
      speicher.hoerer.delete(setState);
      if (speicher.hoerer.size === 0 && speicher.takt) {
        clearInterval(speicher.takt);
        speicher.takt = null;
      }
    };
  }, [userId]);

  return state;
}

async function lade(userId: string): Promise<{ state: SubscriptionState; gueltig: boolean }> {
  // Ensure we have a valid session before calling the edge function
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { state: ABGEMELDET, gueltig: false };
  }

  try {
    const { data, error } = await supabase.functions.invoke('check-subscription');

    if (error) throw error;

    const subscribed = data?.subscribed === true;
    const status = data?.status || null;
    const subscriptionEnd = data?.subscription_end || null;
    const cancelAt = data?.cancel_at || null;
    const trialEnd = data?.trial_end || null;

    // Calculate trial days left
    let trialDaysLeft: number | null = null;
    let trialJustExpired = false;
    const now = new Date();

    if (trialEnd) {
      const trialEndDate = new Date(trialEnd);
      if (now < trialEndDate) {
        trialDaysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        // Trial expired – check if within 7 days
        trialJustExpired = (now.getTime() - trialEndDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
      }
    }

    return { gueltig: true, state: {
      isPremium: subscribed,
      isTrialing: status === 'trialing',
      trialJustExpired: !subscribed && trialJustExpired,
      trialDaysLeft,
      plan: subscribed ? 'premium' : 'free',
      status,
      currentPeriodEnd: subscriptionEnd,
      cancelAt,
      trialEnd,
      loading: false,
      error: null,
    } };
  } catch (err) {
    console.error('❌ Error checking subscription:', err);
    // Fallback: check local subscriptions table
    try {
      let userIdToCheck = userId;
      const { data: relationships } = await supabase
        .from('parent_child_relationships')
        .select('parent_id')
        .eq('child_id', userId)
        .limit(1);
      const relationship = relationships?.[0] || null;
      if (relationship?.parent_id) userIdToCheck = relationship.parent_id;

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userIdToCheck)
        .maybeSingle();

      if (sub) {
        const plan = (sub.plan as 'free' | 'premium') || 'free';
        const isPremium = plan === 'premium' && (sub.status === 'active' || sub.status === 'trialing');
        
        // Calculate trial days from local DB
        let fallbackTrialDaysLeft: number | null = null;
        let fallbackTrialJustExpired = false;
        const now = new Date();
        if (sub.trial_end) {
          const trialEndDate = new Date(sub.trial_end);
          if (now < trialEndDate) {
            fallbackTrialDaysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          } else {
            fallbackTrialJustExpired = (now.getTime() - trialEndDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
          }
        }
        
        return { gueltig: true, state: {
          isPremium,
          isTrialing: sub.status === 'trialing',
          trialJustExpired: !isPremium && fallbackTrialJustExpired,
          trialDaysLeft: fallbackTrialDaysLeft,
          plan,
          status: sub.status as SubscriptionState['status'],
          currentPeriodEnd: sub.current_period_end,
          cancelAt: sub.cancel_at,
          trialEnd: sub.trial_end,
          loading: false,
          error: null,
        } };
      }
      return { gueltig: true, state: { ...speicher.state, plan: 'free', loading: false } };
    } catch {
      return { gueltig: false, state: {
        ...speicher.state,
        loading: false,
        error: err instanceof Error ? err : new Error('Unknown error'),
      } };
    }
  }
}
