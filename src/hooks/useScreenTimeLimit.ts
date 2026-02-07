import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useChildSettings } from '@/hooks/useChildSettings';

export function useScreenTimeLimit(userId: string) {
  const [todayMinutesEarned, setTodayMinutesEarned] = useState(0);
  const [todayAchievementMinutes, setTodayAchievementMinutes] = useState(0);
  const [remainingMinutes, setRemainingMinutes] = useState(0);
  const [isAtLimit, setIsAtLimit] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { settings } = useChildSettings(userId);

  useEffect(() => {
    if (userId && settings) {
      loadTodayUsage();
    }
  }, [userId, settings]);

  const loadTodayUsage = async () => {
    try {
      setLoading(true);
      
      // Get today's start and end
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Load all earning sessions AND achievements from today
      const [gameSessionsRes, learningSessionsRes, achievementsRes] = await Promise.all([
        supabase
          .from('game_sessions')
          .select('time_earned')
          .eq('user_id', userId)
          .gte('session_date', startOfDay.toISOString())
          .lt('session_date', endOfDay.toISOString()),
        supabase
          .from('learning_sessions')
          .select('time_earned')
          .eq('user_id', userId)
          .gte('session_date', startOfDay.toISOString())
          .lt('session_date', endOfDay.toISOString()),
        supabase
          .from('user_achievements')
          .select(`
            achievements_template (reward_minutes)
          `)
          .eq('user_id', userId)
          .eq('is_completed', true)
          .gte('earned_at', startOfDay.toISOString())
          .lt('earned_at', endOfDay.toISOString())
      ]);

      // Aggregate today's earned time from sessions
      // IMPORTANT: time_earned is ALWAYS stored in SECONDS
      const gameValues = (gameSessionsRes.data ?? []).map((s: any) => Number(s.time_earned) || 0);
      const learningValues = (learningSessionsRes.data ?? []).map((s: any) => Number(s.time_earned) || 0);
      const allSessionValues = [...gameValues, ...learningValues];

      // Sum all seconds and convert to minutes
      const totalSessionSeconds = allSessionValues.reduce((sum: number, v: number) => sum + (Number.isFinite(v) ? v : 0), 0);
      const sessionMinutes = Math.ceil(totalSessionSeconds / 60);

      // Calculate achievement bonus minutes
      const achievementMinutes = (achievementsRes.data ?? []).reduce((sum: number, ua: any) => {
        return sum + (ua.achievements_template?.reward_minutes || 0);
      }, 0);

      // Total earned = sessions + achievements
      const totalMinutesEarned = sessionMinutes + achievementMinutes;

      setTodayMinutesEarned(totalMinutesEarned);
      setTodayAchievementMinutes(achievementMinutes);

      // Calculate limit based on day of week
      const isWeekend = today.getDay() === 0 || today.getDay() === 6; // Sunday = 0, Saturday = 6
      const dailyLimit = isWeekend ? settings.weekend_max_minutes : settings.weekday_max_minutes;
      
      const remaining = Math.max(0, dailyLimit - totalMinutesEarned);
      setRemainingMinutes(remaining);
      setIsAtLimit(remaining <= 0);

      console.info('⏱️ ScreenTime (today):', { 
        sessions: allSessionValues.length, 
        totalSessionSeconds, 
        sessionMinutes,
        achievementMinutes,
        totalMinutesEarned,
        dailyLimit, 
        remaining 
      });

    } catch (error) {
      console.error('Error loading today\'s usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const canEarnMoreTime = () => {
    if (!settings || loading) return false;
    return !isAtLimit;
  };

  const getDailyLimit = () => {
    if (!settings) return 0;
    const today = new Date();
    const isWeekend = today.getDay() === 0 || today.getDay() === 6;
    return isWeekend ? settings.weekend_max_minutes : settings.weekday_max_minutes;
  };

  return {
    todayMinutesUsed: todayMinutesEarned,
    todayAchievementMinutes,
    remainingMinutes,
    isAtLimit,
    loading,
    canEarnMoreTime,
    getDailyLimit,
    refreshUsage: loadTodayUsage
  };
}