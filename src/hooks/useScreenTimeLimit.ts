import { useState, useEffect } from 'react';
import { useChildSettings } from '@/hooks/useChildSettings';
import {
  fetchTodayScreenTimeBreakdown,
  isUtcWeekend,
  type TodayAchievementDetail,
} from '@/lib/screenTimeCalculation';

export type { TodayAchievementDetail } from '@/lib/screenTimeCalculation';

export function useScreenTimeLimit(userId: string) {
  const [todayMinutesEarned, setTodayMinutesEarned] = useState(0);
  const [todayAchievementMinutes, setTodayAchievementMinutes] = useState(0);
  const [todayAchievementDetails, setTodayAchievementDetails] = useState<TodayAchievementDetail[]>([]);
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

      const breakdown = await fetchTodayScreenTimeBreakdown(userId);

      setTodayMinutesEarned(breakdown.totalEarnedToday);
      setTodayAchievementMinutes(breakdown.todayAchievementMinutes);
      setTodayAchievementDetails(breakdown.achievementDetails);

      const dailyLimit = isUtcWeekend()
        ? settings.weekend_max_minutes
        : settings.weekday_max_minutes;

      const remaining = Math.max(0, dailyLimit - breakdown.totalEarnedToday);
      setRemainingMinutes(remaining);
      setIsAtLimit(remaining <= 0);

      console.info('⏱️ ScreenTime (canonical UTC):', {
        sessionMinutes: breakdown.todaySessionMinutes,
        achievementMinutes: breakdown.todayAchievementMinutes,
        totalMinutesEarned: breakdown.totalEarnedToday,
        dailyLimit,
        remaining,
      });
    } catch (error) {
      console.error('Error loading canonical screen time usage:', error);
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
    return isUtcWeekend()
      ? settings.weekend_max_minutes
      : settings.weekday_max_minutes;
  };

  return {
    todayMinutesUsed: todayMinutesEarned,
    todayAchievementMinutes,
    todayAchievementDetails,
    remainingMinutes,
    isAtLimit,
    loading,
    canEarnMoreTime,
    getDailyLimit,
    refreshUsage: loadTodayUsage,
  };
}
