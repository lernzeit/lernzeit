import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface DailyChallenge {
  id?: string;
  challenge_type: 'subject' | 'speed' | 'perfect';
  challenge_params: {
    subject?: string;
    target_questions: number;
    target_accuracy?: number;
    max_seconds?: number;
  };
  reward_minutes: number;
  is_completed: boolean;
  completed_at?: string;
}

const SUBJECTS = ['math', 'german', 'english', 'geography', 'history', 'physics', 'biology', 'chemistry', 'latin'];
const SUBJECT_NAMES: Record<string, string> = {
  math: 'Mathe', german: 'Deutsch', english: 'Englisch',
  geography: 'Geographie', history: 'Geschichte', physics: 'Physik',
  biology: 'Biologie', chemistry: 'Chemie', latin: 'Latein',
};

/**
 * Deterministically generate today's challenge from date + userId.
 * No backend call needed.
 */
function generateChallenge(userId: string, dateStr: string): Omit<DailyChallenge, 'id' | 'is_completed' | 'completed_at'> {
  // Simple hash from date + userId
  let hash = 0;
  const seed = `${dateStr}-${userId}`;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const positiveHash = Math.abs(hash);

  const challengeTypes: ('subject' | 'speed' | 'perfect')[] = ['subject', 'speed', 'perfect'];
  const type = challengeTypes[positiveHash % 3];

  switch (type) {
    case 'subject': {
      const subject = SUBJECTS[positiveHash % SUBJECTS.length];
      return {
        challenge_type: 'subject',
        challenge_params: {
          subject,
          target_questions: 10,
          target_accuracy: 70,
        },
        reward_minutes: 3,
      };
    }
    case 'speed': {
      return {
        challenge_type: 'speed',
        challenge_params: {
          target_questions: 5,
          max_seconds: 180,
        },
        reward_minutes: 2,
      };
    }
    case 'perfect': {
      return {
        challenge_type: 'perfect',
        challenge_params: {
          target_questions: 5,
          target_accuracy: 100,
        },
        reward_minutes: 3,
      };
    }
  }
}

function getTodayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function useDailyChallenge(userId?: string) {
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrCreate = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const today = getTodayDateStr();

    try {
      // Check if challenge exists for today
      const { data: existing } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('user_id', userId)
        .eq('challenge_date', today)
        .maybeSingle();

      if (existing) {
        setChallenge({
          id: existing.id,
          challenge_type: existing.challenge_type as DailyChallenge['challenge_type'],
          challenge_params: existing.challenge_params as DailyChallenge['challenge_params'],
          reward_minutes: existing.reward_minutes,
          is_completed: existing.is_completed,
          completed_at: existing.completed_at,
        });
      } else {
        // Generate deterministically and save
        const generated = generateChallenge(userId, today);
        const { data: inserted, error } = await supabase
          .from('daily_challenges')
          .insert({
            user_id: userId,
            challenge_date: today,
            ...generated,
            challenge_params: generated.challenge_params as any,
          })
          .select()
          .single();

        if (inserted && !error) {
          setChallenge({
            id: inserted.id,
            challenge_type: inserted.challenge_type as DailyChallenge['challenge_type'],
            challenge_params: inserted.challenge_params as DailyChallenge['challenge_params'],
            reward_minutes: inserted.reward_minutes,
            is_completed: inserted.is_completed,
            completed_at: inserted.completed_at,
          });
        } else {
          // Might be a race condition (duplicate key), try to read again
          const { data: retry } = await supabase
            .from('daily_challenges')
            .select('*')
            .eq('user_id', userId)
            .eq('challenge_date', today)
            .maybeSingle();
          if (retry) {
            setChallenge({
              id: retry.id,
              challenge_type: retry.challenge_type as DailyChallenge['challenge_type'],
              challenge_params: retry.challenge_params as DailyChallenge['challenge_params'],
              reward_minutes: retry.reward_minutes,
              is_completed: retry.is_completed,
              completed_at: retry.completed_at,
            });
          }
        }
      }
    } catch (err) {
      console.error('Error loading daily challenge:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadOrCreate();
  }, [loadOrCreate]);

  /**
   * Check if a completed session satisfies today's challenge.
   * Call after each game session is saved.
   */
  const checkCompletion = useCallback(async (sessionData: {
    subject: string;
    correctAnswers: number;
    totalQuestions: number;
    timeSpentSeconds: number;
  }): Promise<boolean> => {
    if (!userId || !challenge || challenge.is_completed) return false;

    const today = getTodayDateStr();
    const todayStart = new Date(today + 'T00:00:00').toISOString();

    const params = challenge.challenge_params;

    switch (challenge.challenge_type) {
      case 'subject': {
        // Need X questions in a specific subject with Y% accuracy today
        if (!params.subject) return false;
        const { data: sessions } = await supabase
          .from('game_sessions')
          .select('correct_answers, total_questions')
          .eq('user_id', userId)
          .eq('category', params.subject)
          .gte('session_date', todayStart);

        if (!sessions) return false;
        const totalQ = sessions.reduce((s, r) => s + (r.total_questions || 0), 0);
        const totalC = sessions.reduce((s, r) => s + (r.correct_answers || 0), 0);
        const accuracy = totalQ > 0 ? (totalC / totalQ) * 100 : 0;

        if (totalQ >= params.target_questions && accuracy >= (params.target_accuracy || 0)) {
          return await markCompleted();
        }
        return false;
      }

      case 'speed': {
        // Complete X questions in under Y seconds (single session)
        if (
          sessionData.totalQuestions >= (params.target_questions || 5) &&
          sessionData.timeSpentSeconds <= (params.max_seconds || 180)
        ) {
          return await markCompleted();
        }
        return false;
      }

      case 'perfect': {
        // Get 100% accuracy in a session with at least X questions
        if (
          sessionData.totalQuestions >= (params.target_questions || 5) &&
          sessionData.correctAnswers === sessionData.totalQuestions
        ) {
          return await markCompleted();
        }
        return false;
      }
    }

    return false;
  }, [userId, challenge]);

  const markCompleted = async (): Promise<boolean> => {
    if (!challenge?.id) return false;

    const { error } = await supabase
      .from('daily_challenges')
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq('id', challenge.id);

    if (!error) {
      setChallenge(prev => prev ? { ...prev, is_completed: true, completed_at: new Date().toISOString() } : null);
      return true;
    }
    return false;
  };

  return {
    challenge,
    loading,
    checkCompletion,
    refresh: loadOrCreate,
    getDescription: () => {
      if (!challenge) return '';
      const p = challenge.challenge_params;
      switch (challenge.challenge_type) {
        case 'subject':
          return `Beantworte ${p.target_questions} ${SUBJECT_NAMES[p.subject || ''] || p.subject}-Fragen mit mind. ${p.target_accuracy}% richtig`;
        case 'speed':
          return `Löse ${p.target_questions} Aufgaben in unter ${Math.floor((p.max_seconds || 180) / 60)} Minuten`;
        case 'perfect':
          return `Beantworte ${p.target_questions} Fragen alle richtig – 100% Genauigkeit`;
      }
    },
    getEmoji: () => {
      if (!challenge) return '🎯';
      switch (challenge.challenge_type) {
        case 'subject': return '📚';
        case 'speed': return '⚡';
        case 'perfect': return '💎';
      }
    },
    getTitle: () => {
      if (!challenge) return 'Tägliche Herausforderung';
      switch (challenge.challenge_type) {
        case 'subject': return 'Fach-Challenge';
        case 'speed': return 'Speed-Challenge';
        case 'perfect': return 'Perfekt-Challenge';
      }
    },
  };
}
