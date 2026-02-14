import { useEffect, useState, useCallback } from 'react';
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
  trialEnd: string | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to check subscription status via Stripe (check-subscription edge function).
 * For child accounts, the edge function checks the parent's subscription.
 */
export function useSubscription(): SubscriptionState {
  const { user } = useAuth();

  const [state, setState] = useState<SubscriptionState>({
    isPremium: false,
    isTrialing: false,
    trialJustExpired: false,
    trialDaysLeft: null,
    plan: 'free',
    status: null,
    currentPeriodEnd: null,
    trialEnd: null,
    loading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) throw error;

      const subscribed = data?.subscribed === true;
      const status = data?.status || null;
      const subscriptionEnd = data?.subscription_end || null;
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

      setState({
        isPremium: subscribed,
        isTrialing: status === 'trialing',
        trialJustExpired: !subscribed && trialJustExpired,
        trialDaysLeft,
        plan: subscribed ? 'premium' : 'free',
        status,
        currentPeriodEnd: subscriptionEnd,
        trialEnd,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('❌ Error checking subscription:', err);
      // Fallback: check local subscriptions table
      try {
        let userIdToCheck = user.id;
        const { data: relationship } = await supabase
          .from('parent_child_relationships')
          .select('parent_id')
          .eq('child_id', user.id)
          .maybeSingle();
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
          
          setState({
            isPremium,
            isTrialing: sub.status === 'trialing',
            trialJustExpired: !isPremium && fallbackTrialJustExpired,
            trialDaysLeft: fallbackTrialDaysLeft,
            plan,
            status: sub.status as SubscriptionState['status'],
            currentPeriodEnd: sub.current_period_end,
            trialEnd: sub.trial_end,
            loading: false,
            error: null,
          });
        } else {
          setState((prev) => ({ ...prev, plan: 'free', loading: false }));
        }
      } catch {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err : new Error('Unknown error'),
        }));
      }
    }
  }, [user?.id]);

  useEffect(() => {
    checkSubscription();

    // Re-check every 60 seconds
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  return state;
}
