
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ChildSettings {
  math_seconds_per_task: number;
  german_seconds_per_task: number;
  english_seconds_per_task: number;
  geography_seconds_per_task: number;
  history_seconds_per_task: number;
  physics_seconds_per_task: number;
  biology_seconds_per_task: number;
  chemistry_seconds_per_task: number;
  latin_seconds_per_task: number;
  weekday_max_minutes: number;
  weekend_max_minutes: number;
}

export function useChildSettings(childId: string) {
  const [settings, setSettings] = useState<ChildSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (childId) {
      loadChildSettings();
    } else {
      // No user - set default settings for demo mode
      setSettings({
        math_seconds_per_task: 30,
        german_seconds_per_task: 30,
        english_seconds_per_task: 30,
        geography_seconds_per_task: 30,
        history_seconds_per_task: 30,
        physics_seconds_per_task: 30,
        biology_seconds_per_task: 30,
        chemistry_seconds_per_task: 30,
        latin_seconds_per_task: 30,
        weekday_max_minutes: 30,
        weekend_max_minutes: 60,
      });
      setLoading(false);
    }
  }, [childId]);

  const refreshSettings = () => {
    if (childId) {
      loadChildSettings();
    }
  };

  const loadChildSettings = async () => {
    if (!childId) {
      console.log('❌ No childId provided to useChildSettings');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔧 Loading child settings for:', childId);
      
      // Get child-specific settings (only source of truth now)
      console.log('🔍 Querying child_settings with child_id:', childId);
      const { data: childSettings, error: childError } = await supabase
        .from('child_settings')
        .select('*')
        .eq('child_id', childId)
        .maybeSingle();

      console.log('🔧 Child settings query result:', { 
        childId, 
        childSettings, 
        childError,
        query: `SELECT * FROM child_settings WHERE child_id = '${childId}'`
      });

      if (childSettings && !childError) {
        console.log('✅ Found child-specific settings:', childSettings);
        setSettings(childSettings);
        return;
      }

      // If no child settings found, use default settings (30 seconds per task)
      console.log('🔧 No child settings found, using default settings (30 seconds per task)');
      const defaultSettings = {
        math_seconds_per_task: 30,
        german_seconds_per_task: 30,
        english_seconds_per_task: 30,
        geography_seconds_per_task: 30,
        history_seconds_per_task: 30,
        physics_seconds_per_task: 30,
        biology_seconds_per_task: 30,
        chemistry_seconds_per_task: 30,
        latin_seconds_per_task: 30,
        weekday_max_minutes: 30,
        weekend_max_minutes: 60,
      };
      
      setSettings(defaultSettings);

    } catch (error) {
      console.error('❌ Error loading child settings:', error);
      
      // Use defaults on error (30 seconds per task)
      const defaultSettings = {
        math_seconds_per_task: 30,
        german_seconds_per_task: 30,
        english_seconds_per_task: 30,
        geography_seconds_per_task: 30,
        history_seconds_per_task: 30,
        physics_seconds_per_task: 30,
        biology_seconds_per_task: 30,
        chemistry_seconds_per_task: 30,
        latin_seconds_per_task: 30,
        weekday_max_minutes: 30,
        weekend_max_minutes: 60,
      };
      
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading, refreshSettings };
}
