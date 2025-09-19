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
      const { data, error } = await supabase
        .from('user_earned_minutes')
        .select('minutes_remaining')
        .eq('user_id', userId)
        .gt('minutes_remaining', 0);

      if (error) {
        console.error('Error getting available minutes:', error);
        return 0;
      }

      return data?.reduce((sum, record) => sum + record.minutes_remaining, 0) || 0;
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