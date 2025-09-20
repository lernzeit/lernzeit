import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface EarnedMinutesTrackerProps {
  userId: string;
  sessionId: string;
  sessionType: 'learning' | 'game';
  minutesEarned: number;
}

export function useEarnedMinutesTracker() {
  const trackEarnedMinutes = async ({ 
    userId, 
    sessionId, 
    sessionType, 
    minutesEarned 
  }: EarnedMinutesTrackerProps) => {
    try {
      // Insert earned minutes record
      const { error } = await supabase
        .from('user_earned_minutes')
        .insert({
          user_id: userId,
          session_id: sessionId,
          session_type: sessionType,
          minutes_earned: minutesEarned,
          minutes_requested: 0 // Initially 0, will be updated when requested
        });

      if (error) {
        console.error('Error tracking earned minutes:', error);
        return false;
      }

      console.log(`Tracked ${minutesEarned} earned minutes for ${sessionType} session`);
      return true;
    } catch (error) {
      console.error('Error in trackEarnedMinutes:', error);
      return false;
    }
  };

  const getTodaySessionMinutes = async (userId: string): Promise<number> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get earned minutes from today's sessions only
      const [gameSessionsRes, learningSessionsRes] = await Promise.all([
        supabase
          .from('game_sessions')
          .select('time_earned, session_date')
          .eq('user_id', userId)
          .gte('session_date', today)
          .lt('session_date', today + 'T23:59:59.999Z'),
        supabase
          .from('learning_sessions')
          .select('time_earned, session_date')
          .eq('user_id', userId)
          .gte('session_date', today)
          .lt('session_date', today + 'T23:59:59.999Z')
      ]);

      if (gameSessionsRes.error || learningSessionsRes.error) {
        console.error('Error getting today session minutes:', gameSessionsRes.error || learningSessionsRes.error);
        return 0;
      }

      // Calculate today's earned minutes from sessions
      const gameMinutes = (gameSessionsRes.data || []).reduce((sum: number, session: any) => {
        const earned = Number(session.time_earned) || 0;
        // Convert seconds to minutes if needed (values > 60 are likely seconds)
        return sum + (earned > 60 ? Math.ceil(earned / 60) : earned);
      }, 0);

      const learningMinutes = (learningSessionsRes.data || []).reduce((sum: number, session: any) => {
        const earned = Number(session.time_earned) || 0;
        // Convert seconds to minutes if needed (values > 60 are likely seconds)
        return sum + (earned > 60 ? Math.ceil(earned / 60) : earned);
      }, 0);

      return gameMinutes + learningMinutes;
    } catch (error) {
      console.error('Error in getTodaySessionMinutes:', error);
      return 0;
    }
  };

  const getAchievementMinutes = async (userId: string): Promise<number> => {
    try {
      // Get all completed achievements and their reward minutes
      const { data: userAchievements, error } = await supabase
        .from('user_achievements')
        .select(`
          achievements_template (reward_minutes)
        `)
        .eq('user_id', userId)
        .eq('is_completed', true);

      if (error) {
        console.error('Error getting achievement minutes:', error);
        return 0;
      }

      return (userAchievements || []).reduce((sum: number, ua: any) => {
        return sum + (ua.achievements_template?.reward_minutes || 0);
      }, 0);
    } catch (error) {
      console.error('Error in getAchievementMinutes:', error);
      return 0;
    }
  };

  const getTotalRequestedMinutes = async (userId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('screen_time_requests')
        .select('requested_minutes')
        .eq('child_id', userId);

      if (error) {
        console.error('Error getting requested minutes:', error);
        return 0;
      }

      return (data || []).reduce((sum: number, request: any) => {
        return sum + (Number(request.requested_minutes) || 0);
      }, 0);
    } catch (error) {
      console.error('Error in getTotalRequestedMinutes:', error);  
      return 0;
    }
  };

  const getAvailableMinutes = async (userId: string): Promise<number> => {
    try {
      // Get minutes from different sources
      const [todaySessionMinutes, achievementMinutes, totalRequestedMinutes] = await Promise.all([
        getTodaySessionMinutes(userId),
        getAchievementMinutes(userId), 
        getTotalRequestedMinutes(userId)
      ]);

      // Total available = today's sessions + all achievements - all requests
      const totalAvailable = todaySessionMinutes + achievementMinutes;
      const availableMinutes = Math.max(0, totalAvailable - totalRequestedMinutes);

      console.log('Available minutes calculation:', {
        todaySessionMinutes,
        achievementMinutes,
        totalAvailable,
        totalRequestedMinutes,
        availableMinutes
      });

      return availableMinutes;
    } catch (error) {
      console.error('Error in getAvailableMinutes:', error);
      return 0;
    }
  };

  const getTodayRequestedMinutes = async (userId: string): Promise<number> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_request_summary')
        .select('total_minutes_requested')
        .eq('user_id', userId)
        .eq('request_date', today)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error getting today requested minutes:', error);
        return 0;
      }

      return data?.total_minutes_requested || 0;
    } catch (error) {
      console.error('Error in getTodayRequestedMinutes:', error);
      return 0;
    }
  };

  const getAvailableMinutesBreakdown = async (userId: string) => {
    try {
      const [todaySessionMinutes, achievementMinutes, totalRequestedMinutes] = await Promise.all([
        getTodaySessionMinutes(userId),
        getAchievementMinutes(userId),
        getTotalRequestedMinutes(userId)
      ]);

      const totalAvailable = todaySessionMinutes + achievementMinutes;
      const availableMinutes = Math.max(0, totalAvailable - totalRequestedMinutes);

      return {
        todaySessionMinutes,
        achievementMinutes,
        totalAvailable,
        totalRequestedMinutes,
        availableMinutes
      };
    } catch (error) {
      console.error('Error in getAvailableMinutesBreakdown:', error);
      return {
        todaySessionMinutes: 0,
        achievementMinutes: 0,
        totalAvailable: 0,
        totalRequestedMinutes: 0,
        availableMinutes: 0
      };
    }
  };

  return {
    trackEarnedMinutes,
    getAvailableMinutes,
    getTodayRequestedMinutes,
    getAvailableMinutesBreakdown,
    getTodaySessionMinutes,
    getAchievementMinutes,
    getTotalRequestedMinutes
  };
}