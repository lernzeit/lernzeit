import { useCallback, useRef } from 'react';
import { useAchievements } from '@/hooks/useAchievements';
import { useStreak } from '@/hooks/useStreak';
import { supabase } from '@/integrations/supabase/client';

interface SessionAchievementData {
  userId: string;
  category: string; // e.g., 'math', 'german', 'english'
  correctAnswers: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  earnedSeconds: number;
  score: number; // percentage 0-100
}

interface TrackingResult {
  newAchievements: Array<{
    name: string;
    description: string;
    reward_minutes: number;
    icon: string;
    color: string;
  }>;
  trackedTypes: string[];
}

/**
 * Comprehensive achievement tracker that handles ALL achievement types
 * based on game session data and user activity patterns.
 */
export function useAchievementTracker(userId?: string) {
  const { updateProgress, reload: reloadAchievements } = useAchievements(userId, { suppressToast: true });
  const { streak, reload: reloadStreak } = useStreak(userId);
  const trackingInProgress = useRef(false);

  /**
   * Calculate fresh streak directly from database
   */
  const calculateFreshStreak = useCallback(async (uid: string): Promise<number> => {
    try {
      const [learningSessionsRes, gameSessionsRes] = await Promise.all([
        supabase
          .from('learning_sessions')
          .select('session_date')
          .eq('user_id', uid)
          .order('session_date', { ascending: false }),
        supabase
          .from('game_sessions')
          .select('session_date')
          .eq('user_id', uid)
          .order('session_date', { ascending: false })
      ]);

      const allDates = new Set<string>();
      
      if (learningSessionsRes.data) {
        learningSessionsRes.data.forEach(session => {
          if (session.session_date) {
            const date = new Date(session.session_date).toISOString().split('T')[0];
            allDates.add(date);
          }
        });
      }

      if (gameSessionsRes.data) {
        gameSessionsRes.data.forEach(session => {
          if (session.session_date) {
            const date = new Date(session.session_date).toISOString().split('T')[0];
            allDates.add(date);
          }
        });
      }

      const sortedDates = Array.from(allDates).sort((a, b) => b.localeCompare(a));
      
      if (sortedDates.length === 0) return 0;

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const mostRecentDate = sortedDates[0];
      if (mostRecentDate !== today && mostRecentDate !== yesterday) {
        return 0;
      }

      let currentStreak = 0;
      let checkDate = new Date();
      
      if (mostRecentDate === yesterday) {
        checkDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      }

      for (let i = 0; i < sortedDates.length; i++) {
        const expectedDate = new Date(checkDate.getTime() - i * 24 * 60 * 60 * 1000)
          .toISOString().split('T')[0];
        
        if (sortedDates[i] === expectedDate) {
          currentStreak++;
        } else {
          break;
        }
      }

      return currentStreak;
    } catch (error) {
      console.error('Error calculating fresh streak:', error);
      return 0;
    }
  }, []);

  /**
   * Map frontend subject names to achievement category names
   */
  const mapSubjectToCategory = (subject: string): string => {
    const subjectMap: Record<string, string> = {
      'mathe': 'math',
      'mathematik': 'math',
      'math': 'math',
      'deutsch': 'german',
      'german': 'german',
      'englisch': 'english',
      'english': 'english',
      'geografie': 'geography',
      'geographie': 'geography',
      'geography': 'geography',
      'geschichte': 'history',
      'history': 'history',
      'physik': 'physics',
      'physics': 'physics',
      'biologie': 'biology',
      'biology': 'biology',
      'chemie': 'chemistry',
      'chemistry': 'chemistry',
      'latein': 'latin',
      'latin': 'latin',
    };
    return subjectMap[subject.toLowerCase()] || 'general';
  };

  /**
   * Track all achievements after a completed game session
   */
  const trackSessionAchievements = useCallback(async (
    data: SessionAchievementData
  ): Promise<TrackingResult> => {
    if (!userId || trackingInProgress.current) {
      return { newAchievements: [], trackedTypes: [] };
    }

    trackingInProgress.current = true;
    const allNewAchievements: TrackingResult['newAchievements'] = [];
    const trackedTypes: string[] = [];

    try {
      console.log('🎯 Starting comprehensive achievement tracking:', data);

      const category = mapSubjectToCategory(data.category);
      const isWeekend = [0, 6].includes(new Date().getDay());
      const currentHour = new Date().getHours();
      const isNightOwl = currentHour >= 21 || currentHour < 6;
      const isMidnightScholar = currentHour >= 0 && currentHour < 4;
      const avgSecondsPerQuestion = data.timeSpentSeconds / data.totalQuestions;
      const isFastSession = avgSecondsPerQuestion < 20;
      const isMarathonSession = data.totalQuestions >= 20;
      const isPerfectSession = data.score === 100;
      const isHighAccuracy = data.score >= 90;

      // 1. Track subject-specific questions_solved (only correct answers count!)
      if (data.correctAnswers > 0) {
        console.log(`📊 Tracking ${data.correctAnswers} questions_solved for ${category}`);
        const subjectAchievements = await updateProgress(category, 'questions_solved', data.correctAnswers);
        if (subjectAchievements?.length) {
          allNewAchievements.push(...subjectAchievements);
        }
        trackedTypes.push(`${category}:questions_solved`);
      }

      // 2. Track total_questions (across all subjects)
      if (data.correctAnswers > 0) {
        console.log(`📊 Tracking ${data.correctAnswers} total_questions`);
        const totalAchievements = await updateProgress('general', 'total_questions', data.correctAnswers);
        if (totalAchievements?.length) {
          allNewAchievements.push(...totalAchievements);
        }
        trackedTypes.push('general:total_questions');
      }

      // 3. Track streak (reload and use fresh value)
      await reloadStreak();
      // Small delay to ensure streak state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get current streak from a fresh calculation
      const streakValue = await calculateFreshStreak(userId);
      if (streakValue > 0) {
        console.log(`🔥 Tracking streak: ${streakValue} days`);
        // For streak, we set the absolute value because it's a cumulative metric
        const streakAchievements = await updateProgress('general', 'streak', streakValue);
        if (streakAchievements?.length) {
          allNewAchievements.push(...streakAchievements);
        }
        trackedTypes.push('general:streak');
      }

      // 4. Track perfect_sessions (100% correct)
      if (isPerfectSession) {
        console.log('⭐ Tracking perfect_session');
        const perfectAchievements = await updateProgress('general', 'perfect_sessions', 1);
        if (perfectAchievements?.length) {
          allNewAchievements.push(...perfectAchievements);
        }
        trackedTypes.push('general:perfect_sessions');
      }

      // 5. Track fast_sessions (under 20s average per question)
      if (isFastSession) {
        console.log('⚡ Tracking fast_session');
        const fastAchievements = await updateProgress('general', 'fast_sessions', 1);
        if (fastAchievements?.length) {
          allNewAchievements.push(...fastAchievements);
        }
        trackedTypes.push('general:fast_sessions');
      }

      // 6. Track speed_master (under 10s average)
      if (avgSecondsPerQuestion < 10 && data.score >= 80) {
        console.log('🚀 Tracking speed_master');
        const speedAchievements = await updateProgress('general', 'speed_master', 1);
        if (speedAchievements?.length) {
          allNewAchievements.push(...speedAchievements);
        }
        trackedTypes.push('general:speed_master');
      }

      // 7. Track marathon_sessions (20+ questions in one session)
      if (isMarathonSession) {
        console.log('🏃 Tracking marathon_session');
        const marathonAchievements = await updateProgress('general', 'marathon_sessions', 1);
        if (marathonAchievements?.length) {
          allNewAchievements.push(...marathonAchievements);
        }
        trackedTypes.push('general:marathon_sessions');
      }

      // 8. Track accuracy_master (90%+ accuracy)
      if (isHighAccuracy) {
        console.log('🎯 Tracking accuracy_master');
        const accuracyAchievements = await updateProgress('general', 'accuracy_master', 1);
        if (accuracyAchievements?.length) {
          allNewAchievements.push(...accuracyAchievements);
        }
        trackedTypes.push('general:accuracy_master');
      }

      // 9. Track night_owl (playing after 21:00 or before 6:00)
      if (isNightOwl) {
        console.log('🦉 Tracking night_owl');
        const nightAchievements = await updateProgress('general', 'night_owl', 1);
        if (nightAchievements?.length) {
          allNewAchievements.push(...nightAchievements);
        }
        trackedTypes.push('general:night_owl');
      }

      // 10. Track midnight_scholar (playing between midnight and 4 AM)
      if (isMidnightScholar) {
        console.log('🌙 Tracking midnight_scholar');
        const midnightAchievements = await updateProgress('general', 'midnight_scholar', 1);
        if (midnightAchievements?.length) {
          allNewAchievements.push(...midnightAchievements);
        }
        trackedTypes.push('general:midnight_scholar');
      }

      // 11. Track weekend_warrior (playing on weekends)
      if (isWeekend) {
        console.log('🎮 Tracking weekend_warrior');
        const weekendAchievements = await updateProgress('general', 'weekend_warrior', 1);
        if (weekendAchievements?.length) {
          allNewAchievements.push(...weekendAchievements);
        }
        trackedTypes.push('general:weekend_warrior');
      }

      // 12. Track overtime_learning (earned extra time beyond base)
      const earnedMinutes = Math.ceil(data.earnedSeconds / 60);
      if (earnedMinutes > 0) {
        console.log(`⏰ Tracking overtime_learning: ${earnedMinutes} minutes`);
        const overtimeAchievements = await updateProgress('general', 'overtime_learning', earnedMinutes);
        if (overtimeAchievements?.length) {
          allNewAchievements.push(...overtimeAchievements);
        }
        trackedTypes.push('general:overtime_learning');
      }

      // 13. Track subjects_mastered (based on unique subjects played today)
      await trackSubjectsMastered();

      // 14. Track knowledge_thirst (total questions answered ever)
      // This is already covered by total_questions, but some achievements use this type
      if (data.correctAnswers > 0) {
        const knowledgeAchievements = await updateProgress('general', 'knowledge_thirst', data.correctAnswers);
        if (knowledgeAchievements?.length) {
          allNewAchievements.push(...knowledgeAchievements);
        }
        trackedTypes.push('general:knowledge_thirst');
      }

      console.log('✅ Achievement tracking complete:', {
        newAchievements: allNewAchievements.length,
        trackedTypes
      });

      // Reload achievements to update UI
      await reloadAchievements();

      return { newAchievements: allNewAchievements, trackedTypes };
    } catch (error) {
      console.error('❌ Error tracking achievements:', error);
      return { newAchievements: [], trackedTypes: [] };
    } finally {
      trackingInProgress.current = false;
    }
  }, [userId, updateProgress, streak, reloadStreak, reloadAchievements]);

  /**
   * Track subjects_mastered based on unique subjects the user has played
   */
  const trackSubjectsMastered = useCallback(async () => {
    if (!userId) return;

    try {
      // Count unique subjects from game_sessions
      const { data: sessions, error } = await supabase
        .from('game_sessions')
        .select('category')
        .eq('user_id', userId);

      if (error) throw error;

      const uniqueSubjects = new Set(sessions?.map(s => s.category).filter(Boolean));
      const subjectCount = uniqueSubjects.size;

      if (subjectCount > 0) {
        console.log(`📚 Tracking subjects_mastered: ${subjectCount} subjects`);
        // Set to absolute value (not increment) for subjects mastered
        await updateProgress('general', 'subjects_mastered', subjectCount);
        
        // Also track subject_explorer
        await updateProgress('general', 'subject_explorer', subjectCount);
      }
    } catch (error) {
      console.error('Error tracking subjects mastered:', error);
    }
  }, [userId, updateProgress]);

  /**
   * Track improvement achievements based on comparing recent vs past performance
   */
  const trackImprovement = useCallback(async () => {
    if (!userId) return;

    try {
      // Get last 10 sessions
      const { data: recentSessions, error } = await supabase
        .from('game_sessions')
        .select('score, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error || !recentSessions || recentSessions.length < 10) return;

      // Compare last 5 sessions vs previous 5
      const last5Avg = recentSessions.slice(0, 5).reduce((sum, s) => sum + (s.score || 0), 0) / 5;
      const prev5Avg = recentSessions.slice(5, 10).reduce((sum, s) => sum + (s.score || 0), 0) / 5;

      // If improved by at least 10%, track improvement
      if (last5Avg > prev5Avg + 10) {
        console.log(`📈 Tracking improvement: ${prev5Avg.toFixed(1)}% → ${last5Avg.toFixed(1)}%`);
        await updateProgress('general', 'improvement', 1);
      }
    } catch (error) {
      console.error('Error tracking improvement:', error);
    }
  }, [userId, updateProgress]);

  /**
   * Track consistency achievements (playing X days in a row)
   */
  const trackConsistency = useCallback(async () => {
    if (!userId || streak < 3) return;

    try {
      console.log(`📅 Tracking consistency: ${streak} day streak`);
      await updateProgress('general', 'consistency', streak);
    } catch (error) {
      console.error('Error tracking consistency:', error);
    }
  }, [userId, streak, updateProgress]);

  /**
   * Track time_traveler (playing in multiple time zones / at different hours)
   */
  const trackTimePatterns = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: sessions, error } = await supabase
        .from('game_sessions')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !sessions) return;

      // Count unique hours played
      const uniqueHours = new Set(
        sessions.map(s => new Date(s.created_at!).getHours())
      );

      if (uniqueHours.size >= 4) {
        console.log(`🕐 Tracking time_traveler: ${uniqueHours.size} different hours`);
        await updateProgress('general', 'time_traveler', uniqueHours.size);
      }
    } catch (error) {
      console.error('Error tracking time patterns:', error);
    }
  }, [userId, updateProgress]);

  /**
   * Track supernova (exceptional performance in a single session)
   */
  const trackSupernova = useCallback(async (data: SessionAchievementData) => {
    // Supernova: 100% accuracy + fast completion + 10+ questions
    const avgSecondsPerQuestion = data.timeSpentSeconds / data.totalQuestions;
    const isSupernova = data.score === 100 && 
                        avgSecondsPerQuestion < 15 && 
                        data.totalQuestions >= 10;

    if (isSupernova) {
      console.log('🌟 Tracking supernova achievement!');
      await updateProgress('general', 'supernova', 1);
    }
  }, [updateProgress]);

  /**
   * Full tracking call that includes all achievement types
   */
  const trackAllAchievements = useCallback(async (
    data: SessionAchievementData
  ): Promise<TrackingResult> => {
    const result = await trackSessionAchievements(data);
    
    // Run additional tracking in parallel (these don't return new achievements immediately)
    await Promise.all([
      trackImprovement(),
      trackConsistency(),
      trackTimePatterns(),
      trackSupernova(data)
    ]);

    return result;
  }, [trackSessionAchievements, trackImprovement, trackConsistency, trackTimePatterns, trackSupernova]);

  return {
    trackAllAchievements,
    trackSessionAchievements,
    trackSubjectsMastered,
    trackImprovement,
    trackConsistency,
    mapSubjectToCategory
  };
}
