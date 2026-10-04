import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { berechneStreak } from '@/lib/streak';

export type StreakStatus = 'active' | 'dim' | 'frozen';

interface StreakState {
  streak: number;
  status: StreakStatus;
  inactiveDays: number;
  canRecover: boolean;
  lastActivityDate: string | null;
  loading: boolean;
  reload: () => Promise<void>;
}

export function useStreak(userId?: string): StreakState {
  const [streak, setStreak] = useState(0);
  const [status, setStatus] = useState<StreakStatus>('active');
  const [inactiveDays, setInactiveDays] = useState(0);
  const [lastActivityDate, setLastActivityDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const calculateStreak = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [learningSessionsRes, gameSessionsRes, storedStateRes] = await Promise.all([
        supabase.from('learning_sessions').select('session_date').eq('user_id', userId).order('session_date', { ascending: false }).limit(400),
        supabase.from('game_sessions').select('session_date').eq('user_id', userId).order('session_date', { ascending: false }).limit(400),
        supabase.from('user_streak_states').select('streak_value, last_activity_date, status').eq('user_id', userId).maybeSingle(),
      ]);

      const zeitpunkte: string[] = [];
      learningSessionsRes.data?.forEach((session) => {
        if (session.session_date) zeitpunkte.push(session.session_date);
      });
      gameSessionsRes.data?.forEach((session) => {
        if (session.session_date) zeitpunkte.push(session.session_date);
      });

      // Kalendertage in Ortszeit — frueher Ortszeit und UTC gemischt, siehe
      // src/lib/streak.ts.
      const { streak: currentStreak, inaktiveTage: inactive, letzterTag: mostRecentDate } = berechneStreak(zeitpunkte);

      if (!mostRecentDate) {
        setStreak(0);
        setStatus('active');
        setInactiveDays(0);
        setLastActivityDate(null);
        return;
      }

      const nextStatus: StreakStatus = inactive === 0 ? 'active' : inactive === 1 ? 'dim' : 'frozen';

      const visibleStreak = inactive >= 3 ? 0 : Math.max(currentStreak, Number(storedStateRes.data?.streak_value) || 0);
      const visibleStatus: StreakStatus = inactive >= 3 ? 'frozen' : nextStatus;

      setStreak(visibleStreak);
      setStatus(visibleStatus);
      setInactiveDays(inactive);
      setLastActivityDate(mostRecentDate);

      await supabase.from('user_streak_states').upsert({
        user_id: userId,
        streak_value: visibleStreak,
        status: visibleStatus,
        last_activity_date: mostRecentDate,
      }, { onConflict: 'user_id' });
    } catch (error) {
      console.error('Fehler beim Berechnen des Streaks:', error);
      setStreak(0);
      setStatus('active');
      setInactiveDays(0);
      setLastActivityDate(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    calculateStreak();
  }, [calculateStreak]);

  return {
    streak,
    status,
    inactiveDays,
    canRecover: inactiveDays > 0 && inactiveDays <= 2 && streak > 0,
    lastActivityDate,
    loading,
    reload: calculateStreak,
  };
}