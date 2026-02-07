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
      // IMPORTANT: time_earned is stored in SECONDS, so we always convert to minutes
      const gameMinutes = (gameSessionsRes.data || []).reduce((sum: number, session: any) => {
        const earnedSeconds = Number(session.time_earned) || 0;
        // Always treat as seconds and convert to minutes
        return sum + Math.ceil(earnedSeconds / 60);
      }, 0);

      const learningMinutes = (learningSessionsRes.data || []).reduce((sum: number, session: any) => {
        const earnedSeconds = Number(session.time_earned) || 0;
        // Always treat as seconds and convert to minutes
        return sum + Math.ceil(earnedSeconds / 60);
      }, 0);

      console.log('📊 Today session minutes calculation:', {
        gameSessions: gameSessionsRes.data?.length || 0,
        gameMinutes,
        learningSessions: learningSessionsRes.data?.length || 0,
        learningMinutes,
        total: gameMinutes + learningMinutes
      });

      return gameMinutes + learningMinutes;
    } catch (error) {
      console.error('Error in getTodaySessionMinutes:', error);
      return 0;
    }
  };

  const getTodayAchievementMinutes = async (userId: string): Promise<number> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get achievements completed TODAY only
      const { data: userAchievements, error } = await supabase
        .from('user_achievements')
        .select(`
          achievements_template (reward_minutes),
          earned_at
        `)
        .eq('user_id', userId)
        .eq('is_completed', true)
        .gte('earned_at', today)
        .lt('earned_at', today + 'T23:59:59.999Z');

      if (error) {
        console.error('Error getting today achievement minutes:', error);
        return 0;
      }

      const todayMinutes = (userAchievements || []).reduce((sum: number, ua: any) => {
        return sum + (ua.achievements_template?.reward_minutes || 0);
      }, 0);

      console.log('Today achievement minutes:', todayMinutes);
      return todayMinutes;
    } catch (error) {
      console.error('Error in getTodayAchievementMinutes:', error);
      return 0;
    }
  };

  interface TodayAchievementDetail {
    name: string;
    icon: string;
    reward_minutes: number;
    earned_at: string;
  }

  const getTodayAchievementDetails = async (userId: string): Promise<TodayAchievementDetail[]> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get achievements completed TODAY with full details
      const { data: userAchievements, error } = await supabase
        .from('user_achievements')
        .select(`
          earned_at,
          achievements_template (name, icon, reward_minutes)
        `)
        .eq('user_id', userId)
        .eq('is_completed', true)
        .gte('earned_at', today)
        .lt('earned_at', today + 'T23:59:59.999Z')
        .order('earned_at', { ascending: false });

      if (error) {
        console.error('Error getting today achievement details:', error);
        return [];
      }

      const details: TodayAchievementDetail[] = (userAchievements || [])
        .filter((ua: any) => ua.achievements_template?.reward_minutes > 0)
        .map((ua: any) => ({
          name: ua.achievements_template?.name || 'Unbekannt',
          icon: ua.achievements_template?.icon || '🏆',
          reward_minutes: ua.achievements_template?.reward_minutes || 0,
          earned_at: ua.earned_at
        }));

      console.log('Today achievement details:', details);
      return details;
    } catch (error) {
      console.error('Error in getTodayAchievementDetails:', error);
      return [];
    }
  };

  const getTodayApprovedMinutes = async (userId: string): Promise<number> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get only APPROVED requests from TODAY
      const { data, error } = await supabase
        .from('screen_time_requests')
        .select('requested_minutes')
        .eq('child_id', userId)
        .eq('status', 'approved')
        .gte('created_at', today)
        .lt('created_at', today + 'T23:59:59.999Z');

      if (error) {
        console.error('Error getting today approved minutes:', error);
        return 0;
      }

      const approvedMinutes = (data || []).reduce((sum: number, request: any) => {
        return sum + (Number(request.requested_minutes) || 0);
      }, 0);

      console.log('Today approved minutes:', approvedMinutes);
      return approvedMinutes;
    } catch (error) {
      console.error('Error in getTodayApprovedMinutes:', error);  
      return 0;
    }
  };

  const getAvailableMinutes = async (userId: string): Promise<number> => {
    try {
      // Get minutes from different sources - TODAY ONLY
      const [todaySessionMinutes, todayAchievementMinutes, todayApprovedMinutes] = await Promise.all([
        getTodaySessionMinutes(userId),
        getTodayAchievementMinutes(userId), 
        getTodayApprovedMinutes(userId)
      ]);

      // Total available = today's sessions + today's achievements - today's approved requests
      const totalEarnedToday = todaySessionMinutes + todayAchievementMinutes;
      const availableMinutes = Math.max(0, totalEarnedToday - todayApprovedMinutes);

      console.log('Available minutes calculation (TODAY ONLY):', {
        todaySessionMinutes,
        todayAchievementMinutes,
        totalEarnedToday,
        todayApprovedMinutes,
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
      const [todaySessionMinutes, todayAchievementMinutes, todayApprovedMinutes, achievementDetails] = await Promise.all([
        getTodaySessionMinutes(userId),
        getTodayAchievementMinutes(userId),
        getTodayApprovedMinutes(userId),
        getTodayAchievementDetails(userId)
      ]);

      const totalEarnedToday = todaySessionMinutes + todayAchievementMinutes;
      const availableMinutes = Math.max(0, totalEarnedToday - todayApprovedMinutes);

      return {
        todaySessionMinutes,
        todayAchievementMinutes,
        totalEarnedToday,
        todayApprovedMinutes,
        availableMinutes,
        achievementDetails
      };
    } catch (error) {
      console.error('Error in getAvailableMinutesBreakdown:', error);
      return {
        todaySessionMinutes: 0,
        todayAchievementMinutes: 0,
        totalEarnedToday: 0,
        todayApprovedMinutes: 0,
        availableMinutes: 0,
        achievementDetails: []
      };
    }
  };

  return {
    trackEarnedMinutes,
    getAvailableMinutes,
    getTodayRequestedMinutes,
    getAvailableMinutesBreakdown,
    getTodaySessionMinutes,
    getTodayAchievementMinutes,
    getTodayApprovedMinutes,
    getTodayAchievementDetails
  };
}