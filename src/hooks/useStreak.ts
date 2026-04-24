import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

const dayKey = (date: Date) => date.toISOString().split('T')[0];
const daysBetween = (from: string, to: string) => Math.max(0, Math.floor((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000));

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
        (supabase as any).from('user_streak_states').select('streak_value, last_activity_date, status').eq('user_id', userId).maybeSingle(),
      ]);

      const allDates = new Set<string>();
      learningSessionsRes.data?.forEach((session) => {
        if (session.session_date) allDates.add(dayKey(new Date(session.session_date)));
      });
      gameSessionsRes.data?.forEach((session) => {
        if (session.session_date) allDates.add(dayKey(new Date(session.session_date)));
      });

      const sortedDates = Array.from(allDates).sort((a, b) => b.localeCompare(a));
      const today = dayKey(new Date());

      if (sortedDates.length === 0) {
        setStreak(0);
        setStatus('active');
        setInactiveDays(0);
        setLastActivityDate(null);
        return;
      }

      const mostRecentDate = sortedDates[0];
      const inactive = daysBetween(mostRecentDate, today);
      const nextStatus: StreakStatus = inactive === 0 ? 'active' : inactive === 1 ? 'dim' : 'frozen';

      let currentStreak = 0;
      if (inactive <= 2) {
        let checkDate = new Date(`${mostRecentDate}T00:00:00`);
        for (let i = 0; i < sortedDates.length; i++) {
          const expectedDate = dayKey(new Date(checkDate.getTime() - i * 86400000));
          if (sortedDates[i] === expectedDate) currentStreak++;
          else break;
        }
      }

      const visibleStreak = inactive >= 3 ? 0 : Math.max(currentStreak, Number(storedStateRes.data?.streak_value) || 0);

      setStreak(visibleStreak);
      setStatus(inactive >= 3 ? 'active' : nextStatus);
      setInactiveDays(inactive);
      setLastActivityDate(mostRecentDate);

      await (supabase as any).from('user_streak_states').upsert({
        user_id: userId,
        streak_value: visibleStreak,
        status: inactive >= 3 ? 'active' : nextStatus,
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