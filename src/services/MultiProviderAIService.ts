/**
 * Minimal stub for MultiProviderAIService
 * Redirects to Edge Functions for AI generation
 */

import { supabase } from '@/lib/supabase';

export interface TemplateGenerationRequest {
  grade: number;
  domain: string;
  subcategory: string;
  difficulty: string;
  quarter_app: string;
  quarter?: string;
  tags: string[];
  subject?: string;
}

export interface GeneratedTemplate {
  student_prompt: string;
  solution: any;
  variables: any;
  explanation: string;
  question_type: string;
  grade: number;
  grade_app: number;
  domain: string;
  subcategory: string;
  difficulty: string;
  quarter_app: string;
  tags?: string[];
}

class MultiProviderAIService {
  /**
   * Generate template via Edge Function
   */
  async generateTemplate(request: TemplateGenerationRequest): Promise<GeneratedTemplate> {
    const { data, error } = await supabase.functions.invoke('direct-template-generator', {
      body: {
        grade: request.grade,
        domain: request.domain,
        subcategory: request.subcategory,
        difficulty: request.difficulty,
        quarter_app: request.quarter_app,
        tags: request.tags
      }
    });

    if (error) throw error;
    
    return {
      student_prompt: data.student_prompt || '',
      solution: data.solution || {},
      variables: data.variables || {},
      explanation: data.explanation || '',
      question_type: data.question_type || 'text-input',
      grade: request.grade,
      grade_app: request.grade,
      domain: request.domain,
      subcategory: request.subcategory,
      difficulty: request.difficulty,
      quarter_app: request.quarter_app,
      tags: request.tags
    };
  }

  /**
   * Get provider status (always returns 'online' for Edge Functions)
   */
  async getProviderStatus(): Promise<any[]> {
    return [
      { provider: 'openai', status: 'online', tokensUsed: 0 }
    ];
  }
}

export const multiProviderAIService = new MultiProviderAIService();
