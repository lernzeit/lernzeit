import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Topic {
  id: string;
  grade: number;
  subject: string;
  title: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useTopics = (grade?: number, subject?: string) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let query = supabase
          .from('topics')
          .select('*')
          .eq('is_active', true)
          .order('grade', { ascending: true })
          .order('title', { ascending: true });

        if (grade) {
          query = query.eq('grade', grade);
        }

        if (subject) {
          query = query.eq('subject', subject);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setTopics(data || []);
      } catch (err) {
        console.error('Error fetching topics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch topics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopics();
  }, [grade, subject]);

  return { topics, isLoading, error };
};
