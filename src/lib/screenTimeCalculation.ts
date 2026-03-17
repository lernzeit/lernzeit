import { supabase } from '@/lib/supabase';

export interface TodayAchievementDetail {
  name: string;
  icon: string;
  reward_minutes: number;
  earned_at: string;
}

export interface TodayScreenTimeBreakdown {
  todaySessionMinutes: number;
  todayAchievementMinutes: number;
  totalEarnedToday: number;
  todayApprovedMinutes: number;
  todayPendingMinutes: number;
  todayRequestedMinutes: number;
  totalClaimedToday: number;
  availableMinutes: number;
  achievementDetails: TodayAchievementDetail[];
}

export const EMPTY_TODAY_SCREEN_TIME_BREAKDOWN: TodayScreenTimeBreakdown = {
  todaySessionMinutes: 0,
  todayAchievementMinutes: 0,
  totalEarnedToday: 0,
  todayApprovedMinutes: 0,
  todayPendingMinutes: 0,
  todayRequestedMinutes: 0,
  totalClaimedToday: 0,
  availableMinutes: 0,
  achievementDetails: [],
};

export function getTodayUtcRange(referenceDate = new Date()) {
  const start = new Date(referenceDate);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    start,
    end,
    dateKey: start.toISOString().split('T')[0],
  };
}

export function isUtcWeekend(referenceDate = new Date()) {
  const day = referenceDate.getUTCDay();
  return day === 0 || day === 6;
}

function sumTimeEarned(records: Array<{ time_earned?: number | null }> | null | undefined) {
  return (records || []).reduce((sum, record) => sum + (Number(record.time_earned) || 0), 0);
}

function sumRequestedMinutes(
  requests: Array<{ requested_minutes?: number | null; status?: string | null }> | null | undefined,
  statuses?: string[]
) {
  return (requests || []).reduce((sum, request) => {
    if (statuses && !statuses.includes(request.status || '')) {
      return sum;
    }

    return sum + (Number(request.requested_minutes) || 0);
  }, 0);
}

export async function fetchTodayScreenTimeBreakdown(userId: string): Promise<TodayScreenTimeBreakdown> {
  if (!userId) {
    return { ...EMPTY_TODAY_SCREEN_TIME_BREAKDOWN };
  }

  const { start, end } = getTodayUtcRange();
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const [gameSessionsRes, learningSessionsRes, achievementsRes, requestsRes] = await Promise.all([
    supabase
      .from('game_sessions')
      .select('time_earned')
      .eq('user_id', userId)
      .gte('session_date', startIso)
      .lt('session_date', endIso),
    supabase
      .from('learning_sessions')
      .select('time_earned')
      .eq('user_id', userId)
      .gte('session_date', startIso)
      .lt('session_date', endIso),
    supabase
      .from('user_achievements')
      .select(`
        earned_at,
        achievements_template (name, icon, reward_minutes)
      `)
      .eq('user_id', userId)
      .eq('is_completed', true)
      .gte('earned_at', startIso)
      .lt('earned_at', endIso)
      .order('earned_at', { ascending: false }),
    supabase
      .from('screen_time_requests')
      .select('requested_minutes, status')
      .eq('child_id', userId)
      .gte('created_at', startIso)
      .lt('created_at', endIso),
  ]);

  const queryErrors = [
    gameSessionsRes.error,
    learningSessionsRes.error,
    achievementsRes.error,
    requestsRes.error,
  ].filter(Boolean);

  if (queryErrors.length > 0) {
    console.error('Error loading canonical screen time breakdown:', queryErrors);
    throw queryErrors[0];
  }

  const totalSessionSeconds = sumTimeEarned(gameSessionsRes.data) + sumTimeEarned(learningSessionsRes.data);
  const todaySessionMinutes = Math.ceil(totalSessionSeconds / 60);

  const achievementDetails: TodayAchievementDetail[] = (achievementsRes.data || [])
    .filter((achievement: any) => (achievement.achievements_template?.reward_minutes || 0) > 0)
    .map((achievement: any) => ({
      name: achievement.achievements_template?.name || 'Unbekannt',
      icon: achievement.achievements_template?.icon || '🏆',
      reward_minutes: achievement.achievements_template?.reward_minutes || 0,
      earned_at: achievement.earned_at,
    }));

  const todayAchievementMinutes = achievementDetails.reduce(
    (sum, achievement) => sum + achievement.reward_minutes,
    0,
  );

  const todayApprovedMinutes = sumRequestedMinutes(requestsRes.data, ['approved']);
  const todayPendingMinutes = sumRequestedMinutes(requestsRes.data, ['pending']);
  const todayRequestedMinutes = sumRequestedMinutes(requestsRes.data);
  const totalEarnedToday = todaySessionMinutes + todayAchievementMinutes;
  const totalClaimedToday = todayApprovedMinutes + todayPendingMinutes;
  const availableMinutes = Math.max(0, totalEarnedToday - totalClaimedToday);

  return {
    todaySessionMinutes,
    todayAchievementMinutes,
    totalEarnedToday,
    todayApprovedMinutes,
    todayPendingMinutes,
    todayRequestedMinutes,
    totalClaimedToday,
    availableMinutes,
    achievementDetails,
  };
}
