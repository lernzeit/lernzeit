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
 * Hook to check subscription status of the current user or their linked parent.
 * For child accounts, it checks the parent's subscription status.
 */
export function useSubscription(): SubscriptionState {
  const { user } = useAuth();

  // Reset premium settings (child_settings + subject visibility) to defaults when trial expires
  const resetPremiumSettings = async (userId: string) => {
    try {
      // Check if user is a parent – reset their children's settings
      const { data: children } = await supabase
        .from('parent_child_relationships')
        .select('child_id')
        .eq('parent_id', userId);

      const childIds = children?.map(c => c.child_id).filter(Boolean) as string[] || [];

      // Also check if the user themselves is a child
      const allIds = [...childIds, userId];

      for (const childId of allIds) {
        // Delete custom subject visibility (defaults to all visible)
        await supabase
          .from('child_subject_visibility')
          .delete()
          .eq('child_id', childId);

        // Reset child_settings to defaults
        await supabase
          .from('child_settings')
          .delete()
          .eq('child_id', childId);
      }

      console.log('🔄 Premium settings reset to defaults for expired trial');
    } catch (err) {
      console.error('❌ Error resetting premium settings:', err);
    }
  };

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

        // Calculate days left in trial
        let trialDaysLeft: number | null = null;
        if (trialEnd && !trialExpired) {
          trialDaysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Check if trial just expired (within 7 days after expiry)
        const trialJustExpired = trialExpired && trialEnd
          ? (now.getTime() - trialEnd.getTime()) < 7 * 24 * 60 * 60 * 1000
          : false;

        const isPremium =
          plan === 'premium' && subscription.status === 'active';
        const isTrialing =
          subscription.status === 'trialing' && !trialExpired;

        // If trial just expired and status is still 'trialing', reset premium settings
        if (trialExpired && subscription.status === 'trialing') {
          resetPremiumSettings(userIdToCheck);
        }

        setState({
          isPremium,
          isTrialing,
          trialJustExpired,
          trialDaysLeft,
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
