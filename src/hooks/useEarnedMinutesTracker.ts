import { supabase } from '@/lib/supabase';
import {
  EMPTY_TODAY_SCREEN_TIME_BREAKDOWN,
  fetchTodayScreenTimeBreakdown,
  type TodayAchievementDetail,
} from '@/lib/screenTimeCalculation';

interface EarnedMinutesTrackerProps {
  userId: string;
  sessionId: string;
  sessionType: 'learning' | 'game';
  minutesEarned: number;
}

/*
 * Die Funktionen hängen an keinem Zustand und stehen deshalb außerhalb des
 * Hooks: Effekte, die sie als Abhängigkeit führen (EarnedTimeWidget,
 * ScreenTimeRequestWidget, ScreenTimeRequestCard), liefen sonst bei jedem
 * Neuzeichnen erneut. Am 21.10.2026 schickte ein Kinder-Handy so rund
 * 1.900 Abfragen je Minute und Tabelle.
 */
const trackEarnedMinutes = async ({
  userId,
  sessionId,
  sessionType,
  minutesEarned,
}: EarnedMinutesTrackerProps) => {
  try {
    const { error } = await supabase
      .from('user_earned_minutes')
      .insert({
        user_id: userId,
        session_id: sessionId,
        session_type: sessionType,
        minutes_earned: minutesEarned,
        minutes_requested: 0,
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

const getTodayBreakdown = async (userId: string) => {
  try {
    return await fetchTodayScreenTimeBreakdown(userId);
  } catch (error) {
    console.error('Error loading canonical screen time breakdown:', error);
    return { ...EMPTY_TODAY_SCREEN_TIME_BREAKDOWN };
  }
};

const getTodaySessionMinutes = async (userId: string): Promise<number> => {
  const breakdown = await getTodayBreakdown(userId);
  return breakdown.todaySessionMinutes;
};

const getTodayAchievementMinutes = async (userId: string): Promise<number> => {
  const breakdown = await getTodayBreakdown(userId);
  return breakdown.todayAchievementMinutes;
};

const getTodayAchievementDetails = async (userId: string): Promise<TodayAchievementDetail[]> => {
  const breakdown = await getTodayBreakdown(userId);
  return breakdown.achievementDetails;
};

const getTodayApprovedMinutes = async (userId: string): Promise<number> => {
  const breakdown = await getTodayBreakdown(userId);
  return breakdown.todayApprovedMinutes;
};

const getTodayPendingMinutes = async (userId: string): Promise<number> => {
  const breakdown = await getTodayBreakdown(userId);
  return breakdown.todayPendingMinutes;
};

const getAvailableMinutes = async (userId: string): Promise<number> => {
  const breakdown = await getTodayBreakdown(userId);

  console.log('Available minutes calculation (canonical UTC):', {
    todaySessionMinutes: breakdown.todaySessionMinutes,
    todayAchievementMinutes: breakdown.todayAchievementMinutes,
    totalEarnedToday: breakdown.totalEarnedToday,
    todayApprovedMinutes: breakdown.todayApprovedMinutes,
    todayPendingMinutes: breakdown.todayPendingMinutes,
    totalClaimedToday: breakdown.totalClaimedToday,
    availableMinutes: breakdown.availableMinutes,
  });

  return breakdown.availableMinutes;
};

const getTodayRequestedMinutes = async (userId: string): Promise<number> => {
  const breakdown = await getTodayBreakdown(userId);
  return breakdown.todayRequestedMinutes;
};

const getAvailableMinutesBreakdown = async (userId: string) => {
  const breakdown = await getTodayBreakdown(userId);

  console.log('Available minutes breakdown (canonical UTC):', breakdown);
  return breakdown;
};

const TRACKER = {
  trackEarnedMinutes,
  getAvailableMinutes,
  getTodayRequestedMinutes,
  getAvailableMinutesBreakdown,
  getTodaySessionMinutes,
  getTodayAchievementMinutes,
  getTodayApprovedMinutes,
  getTodayPendingMinutes,
  getTodayAchievementDetails,
};

export function useEarnedMinutesTracker() {
  return TRACKER;
}
