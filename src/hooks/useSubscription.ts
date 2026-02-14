import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface SubscriptionData {
  id: string;
  user_id: string;
  plan: 'free' | 'premium';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionState {
  isPremium: boolean;
  isTrialing: boolean;
  plan: 'free' | 'premium';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to check subscription status of the current user or their linked parent.
 * For child accounts, it checks the parent's subscription status.
 */
export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    isPremium: false,
    isTrialing: false,
    plan: 'free',
    status: null,
    currentPeriodEnd: null,
    trialEnd: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    const fetchSubscription = async () => {
      try {
        let userIdToCheck = user.id;

        // For now, we'll check if this is a child by trying to fetch parent relationship
        const { data: relationship } = await supabase
          .from('parent_child_relationships')
          .select('parent_id')
          .eq('child_id', user.id)
          .maybeSingle();

        if (relationship?.parent_id) {
          userIdToCheck = relationship.parent_id;
        }

        // Fetch subscription data
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userIdToCheck)
          .maybeSingle();

        if (subError) throw subError;

        // If no subscription exists, user is free tier
        if (!subscription) {
          setState((prev) => ({
            ...prev,
            plan: 'free',
            status: null,
            loading: false,
          }));
          return;
        }

        const plan = (subscription.plan as 'free' | 'premium') || 'free';
        const status = (subscription.status as SubscriptionState['status']) || null;

        // Check if trial has expired
        const now = new Date();
        const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;
        const trialExpired = trialEnd ? now > trialEnd : false;

        const isPremium =
          plan === 'premium' && subscription.status === 'active';
        const isTrialing =
          subscription.status === 'trialing' && !trialExpired;

        setState({
          isPremium,
          isTrialing,
          plan,
          status,
          currentPeriodEnd: subscription.current_period_end,
          trialEnd: subscription.trial_end,
          loading: false,
          error: null,
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setState((prev) => ({
          ...prev,
          loading: false,
          error,
        }));
      }
    };

    fetchSubscription();
  }, [user?.id]);

  return state;
}
