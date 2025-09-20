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

  const getAvailableMinutes = async (userId: string): Promise<number> => {
    try {
      // Get earned minutes from session tables
      const [gameSessionsRes, learningSessionsRes, requestsRes] = await Promise.all([
        supabase
          .from('game_sessions')
          .select('time_earned')
          .eq('user_id', userId),
        supabase
          .from('learning_sessions')
          .select('time_earned')
          .eq('user_id', userId),
        supabase
          .from('screen_time_requests')
          .select('requested_minutes')
          .eq('child_id', userId)
      ]);

      if (gameSessionsRes.error || learningSessionsRes.error || requestsRes.error) {
        console.error('Error getting available minutes:', gameSessionsRes.error || learningSessionsRes.error || requestsRes.error);
        return 0;
      }

      // Calculate total earned minutes from sessions
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

      const totalEarnedMinutes = gameMinutes + learningMinutes;

      // Calculate total requested minutes (all time, not just today)
      const totalRequestedMinutes = (requestsRes.data || []).reduce((sum: number, request: any) => {
        return sum + (Number(request.requested_minutes) || 0);
      }, 0);

      // Available minutes = earned - already requested
      const availableMinutes = Math.max(0, totalEarnedMinutes - totalRequestedMinutes);

      console.log('Available minutes calculation:', {
        gameMinutes,
        learningMinutes,  
        totalEarnedMinutes,
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

  return {
    trackEarnedMinutes,
    getAvailableMinutes,
    getTodayRequestedMinutes
  };
}