import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useChildSettings } from '@/hooks/useChildSettings';

export function useScreenTimeLimit(userId: string) {
  const [todayMinutesUsed, setTodayMinutesUsed] = useState(0);
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

      // Load all earning sessions from today
      const [gameSessionsRes, learningSessionsRes] = await Promise.all([
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
          .lt('session_date', endOfDay.toISOString())
      ]);

      let totalMinutesEarned = 0;

      if (gameSessionsRes.data) {
        totalMinutesEarned += gameSessionsRes.data.reduce((sum, session) => sum + session.time_earned, 0);
      }

      if (learningSessionsRes.data) {
        totalMinutesEarned += learningSessionsRes.data.reduce((sum, session) => sum + session.time_earned, 0);
      }

      setTodayMinutesUsed(totalMinutesEarned);

      // Calculate limit based on day of week
      const isWeekend = today.getDay() === 0 || today.getDay() === 6; // Sunday = 0, Saturday = 6
      const dailyLimit = isWeekend ? settings.weekend_max_minutes : settings.weekday_max_minutes;
      
      const remaining = Math.max(0, dailyLimit - totalMinutesEarned);
      setRemainingMinutes(remaining);
      setIsAtLimit(remaining <= 0);

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
    todayMinutesUsed,
    remainingMinutes,
    isAtLimit,
    loading,
    canEarnMoreTime,
    getDailyLimit,
    refreshUsage: loadTodayUsage
  };
}