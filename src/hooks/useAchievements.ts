import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  requirement_value: number;
  reward_minutes: number;
  icon: string;
  color: string;
  current_progress?: number;
  is_completed?: boolean;
  earned_at?: string;
}

export interface NewAchievement {
  name: string;
  description: string;
  reward_minutes: number;
  icon: string;
  color: string;
}

export function useAchievements(userId?: string, options?: { suppressToast?: boolean }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      loadAchievements();
    }
  }, [userId]);

  const loadAchievements = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);

      // Lade alle Achievement-Templates
      const { data: templates, error: templatesError } = await supabase
        .from('achievements_template')
        .select('*')
        .order('category, requirement_value');

      if (templatesError) throw templatesError;

      // Lade User-Achievements
      const { data: userAchs, error: userError } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievements_template (*)
        `)
        .eq('user_id', userId);

      if (userError) throw userError;

      setAchievements(templates || []);
      
      // Kombiniere Templates mit User-Progress
      const combinedAchievements = templates?.map(template => {
        const userAch = userAchs?.find(ua => ua.achievement_id === template.id);
        return {
          ...template,
          current_progress: userAch?.current_progress || 0,
          is_completed: userAch?.is_completed || false,
          earned_at: userAch?.earned_at
        };
      }) || [];

      setUserAchievements(combinedAchievements);
    } catch (error: any) {
      console.error('Fehler beim Laden der Achievements:', error);
      if (!options?.suppressToast) {
        toast({
          title: "Fehler",
          description: "Achievements konnten nicht geladen werden.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (
    category: string, 
    type: string, 
    increment: number = 1
  ): Promise<NewAchievement[]> => {
    if (!userId) return [];

    try {
      console.log('🎯 Updating achievement progress:', { userId, category, type, increment });
      
      const { data, error } = await supabase.rpc('update_achievement_progress', {
        p_user_id: userId,
        p_category: category,
        p_type: type,
        p_increment: increment
      });

      if (error) {
        console.error('❌ Achievement RPC error:', error);
        throw error;
      }

      console.log('✅ Achievement update result:', data);

      // Lade Achievements neu
      await loadAchievements();

      return (data as any)?.new_achievements || [];
    } catch (error: any) {
      console.error('❌ Fehler beim Aktualisieren des Achievement-Progress:', error);
      return [];
    }
  };

  const getAchievementsByCategory = (category: string) => {
    return userAchievements.filter(achievement => 
      achievement.category === category
    );
  };

  const getCompletedAchievements = () => {
    return userAchievements.filter(achievement => achievement.is_completed);
  };

  const getRecentAchievements = (days: number = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return userAchievements.filter(achievement => 
      achievement.is_completed && 
      achievement.earned_at && 
      new Date(achievement.earned_at) > cutoffDate
    );
  };

  const getTotalRewardMinutes = () => {
    return getCompletedAchievements().reduce(
      (total, achievement) => total + achievement.reward_minutes, 
      0
    );
  };

  return {
    achievements,
    userAchievements,
    loading,
    updateProgress,
    getAchievementsByCategory,
    getCompletedAchievements,
    getRecentAchievements,
    getTotalRewardMinutes,
    reload: loadAchievements
  };
}