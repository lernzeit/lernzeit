import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface ChildDaySummary {
  id: string;
  name: string | null;
  questionsToday: number;
  correctToday: number;
  minutesEarned: number;
  pendingRequests: number;
  streak: number;
}

export function useChildDaySummary(userId: string, linkedChildren: { id: string; name: string | null }[]) {
  const [summaries, setSummaries] = useState<Map<string, ChildDaySummary>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (linkedChildren.length === 0) {
      setLoading(false);
      return;
    }
    loadSummaries();
  }, [linkedChildren]);

  const loadSummaries = async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      const results = await Promise.all(
        linkedChildren.map(async (child) => {
          const [sessionsRes, requestsRes, streakRes] = await Promise.all([
            supabase
              .from('game_sessions')
              .select('correct_answers, total_questions, time_earned')
              .eq('user_id', child.id)
              .gte('session_date', todayISO),
            supabase
              .from('screen_time_requests')
              .select('id')
              .eq('child_id', child.id)
              .eq('parent_id', userId)
              .eq('status', 'pending'),
            supabase
              .from('game_sessions')
              .select('session_date')
              .eq('user_id', child.id)
              .order('session_date', { ascending: false })
              .limit(30),
          ]);

          const sessions = sessionsRes.data || [];
          const questionsToday = sessions.reduce((s, r) => s + (r.total_questions || 0), 0);
          const correctToday = sessions.reduce((s, r) => s + (r.correct_answers || 0), 0);
          const minutesEarned = Math.ceil(sessions.reduce((s, r) => s + (r.time_earned || 0), 0) / 60);
          const pendingRequests = requestsRes.data?.length || 0;

          let streak = 0;
          if (streakRes.data && streakRes.data.length > 0) {
            const uniqueDays = new Set(
              streakRes.data.map((s) => new Date(s.session_date!).toDateString())
            );
            const today = new Date();
            for (let i = 0; i < 30; i++) {
              const d = new Date(today);
              d.setDate(d.getDate() - i);
              if (uniqueDays.has(d.toDateString())) {
                streak++;
              } else if (i > 0) break;
              else continue;
            }
          }

          return {
            id: child.id,
            name: child.name,
            questionsToday,
            correctToday,
            minutesEarned,
            pendingRequests,
            streak,
          } as ChildDaySummary;
        })
      );

      const map = new Map<string, ChildDaySummary>();
      results.forEach((r) => map.set(r.id, r));
      setSummaries(map);
    } catch (err) {
      console.error('Error loading daily summaries:', err);
    } finally {
      setLoading(false);
    }
  };

  return { summaries, loading, refresh: loadSummaries };
}
