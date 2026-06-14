import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const LS_COOLDOWN_KEY = 'rating_prompt_cooldown_until';
const LS_SESSIONS_CACHE_KEY = 'rating_prompt_sessions_cache';
const SESSIONS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_SESSIONS = 5;
const MIN_PROFILE_AGE_DAYS = 14;
const MIN_DAYS_SINCE_LAST_PROMPT = 90;

interface SessionsCache {
  count: number;
  cachedAt: number;
}

/**
 * Decides whether to show the App-Store rating prompt for the current parent user.
 * Returns { shouldShow, dismiss } – call hooks like useRatingPrompt() inside the parent layout.
 */
export function useRatingPrompt(userId: string | null | undefined, role: string | null | undefined) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!userId || role !== 'parent') return;
    let cancelled = false;

    const run = async () => {
      try {
        // 1. cooldown via localStorage (fast path)
        const cooldown = localStorage.getItem(LS_COOLDOWN_KEY);
        if (cooldown && Date.now() < Number(cooldown)) return;

        // 2. profile age + last prompt
        const { data: profile } = await supabase
          .from('profiles')
          .select('created_at, last_rating_prompt_at, rating_prompt_response')
          .eq('id', userId)
          .maybeSingle();
        if (!profile) return;
        if (profile.rating_prompt_response === 'rated' || profile.rating_prompt_response === 'dismissed') {
          // permanently respected dismiss/rated
          if (profile.rating_prompt_response === 'rated') return;
          // dismissed: still respect 365 days cooldown via last_rating_prompt_at
        }
        const createdAt = profile.created_at ? new Date(profile.created_at).getTime() : Date.now();
        if (Date.now() - createdAt < MIN_PROFILE_AGE_DAYS * 86400000) return;
        if (profile.last_rating_prompt_at) {
          const last = new Date(profile.last_rating_prompt_at).getTime();
          if (Date.now() - last < MIN_DAYS_SINCE_LAST_PROMPT * 86400000) return;
        }

        // 3. session count (cached 24h)
        let count: number | null = null;
        const raw = localStorage.getItem(LS_SESSIONS_CACHE_KEY);
        if (raw) {
          try {
            const cache: SessionsCache = JSON.parse(raw);
            if (Date.now() - cache.cachedAt < SESSIONS_CACHE_TTL_MS) {
              count = cache.count;
            }
          } catch {
            /* ignore */
          }
        }
        if (count === null) {
          const { data: rel } = await supabase
            .from('parent_child_relationships')
            .select('child_id')
            .eq('parent_id', userId);
          const childIds = (rel ?? []).map((r) => r.child_id).filter(Boolean) as string[];
          if (childIds.length === 0) return;
          const { count: c } = await supabase
            .from('learning_sessions')
            .select('id', { count: 'exact', head: true })
            .in('user_id', childIds);
          count = c ?? 0;
          localStorage.setItem(
            LS_SESSIONS_CACHE_KEY,
            JSON.stringify({ count, cachedAt: Date.now() } satisfies SessionsCache),
          );
        }
        if (count < MIN_SESSIONS) return;

        if (!cancelled) setShouldShow(true);
      } catch {
        // silent
      }
    };

    // Delay a bit so we don't fight with first paint
    const t = setTimeout(run, 1500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [userId, role]);

  const dismiss = (response: 'rated' | 'later' | 'dismissed') => {
    setShouldShow(false);
    const cooldownDays = response === 'later' ? 14 : 365;
    localStorage.setItem(
      LS_COOLDOWN_KEY,
      String(Date.now() + cooldownDays * 86400000),
    );
    if (userId) {
      supabase
        .from('profiles')
        .update({
          last_rating_prompt_at: new Date().toISOString(),
          rating_prompt_response: response,
        })
        .eq('id', userId)
        .then(() => {});
    }
  };

  return { shouldShow, dismiss };
}