import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { BookOpen, CheckCircle, Clock, Flame, Loader2 } from 'lucide-react';

interface ChildDaySummary {
  id: string;
  name: string | null;
  questionsToday: number;
  correctToday: number;
  minutesEarned: number;
  pendingRequests: number;
  streak: number;
}

interface ParentDailyOverviewProps {
  userId: string;
  linkedChildren: { id: string; name: string | null }[];
}

export function ParentDailyOverview({ userId, linkedChildren }: ParentDailyOverviewProps) {
  const [summaries, setSummaries] = useState<ChildDaySummary[]>([]);
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
            // Simple streak: count consecutive days with sessions
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

          // Calculate streak
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
              } else if (i > 0) break; // Allow today to be missing
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

      setSummaries(results);
    } catch (err) {
      console.error('Error loading daily overview:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Tagesübersicht wird geladen...</span>
        </CardContent>
      </Card>
    );
  }

  if (summaries.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {summaries.map((child) => {
        const hasLearned = child.questionsToday > 0;
        const hasPending = child.pendingRequests > 0;
        const accuracy = child.questionsToday > 0
          ? Math.round((child.correctToday / child.questionsToday) * 100)
          : 0;

        return (
          <Card
            key={child.id}
            className={`transition-colors ${
              hasPending
                ? 'border-orange-400/50 bg-orange-50/30 dark:bg-orange-950/10'
                : hasLearned
                ? 'border-green-400/50 bg-green-50/30 dark:bg-green-950/10'
                : 'border-muted'
            }`}
          >
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm truncate">
                  {child.name || 'Kind'}
                </span>
                {child.streak > 0 && (
                  <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                    <Flame className="h-3 w-3" />
                    {child.streak}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  <span>{child.questionsToday} Fragen</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>{accuracy}% richtig</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{child.minutesEarned} Min</span>
                </div>
              </div>
              {hasPending && (
                <div className="mt-2 text-xs font-medium text-orange-600 dark:text-orange-400">
                  {child.pendingRequests} offene {child.pendingRequests === 1 ? 'Anfrage' : 'Anfragen'}
                </div>
              )}
              {!hasLearned && (
                <div className="mt-2 text-xs text-muted-foreground italic">
                  Heute noch nicht gelernt
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
