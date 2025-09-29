/**
 * Minimal stub for EnhancedFallbackGenerator
 * Use templateBasedGenerator instead
 */

import { SelectionQuestion } from '@/types/questionTypes';

export class EnhancedFallbackGenerator {
  static async generateFromTemplate(
    template: any,
    params: Record<string, any>,
    context?: any
  ): Promise<SelectionQuestion | null> {
    console.warn('EnhancedFallbackGenerator is deprecated. Use templateBasedGenerator instead.');
    return null;
  }

  static async generateQuestions(
    category: string,
    grade: number,
    count: number,
    difficulty?: string
  ): Promise<SelectionQuestion[]> {
    console.warn('EnhancedFallbackGenerator is deprecated. Use Template Bank system instead.');
    return [];
  }

  static async generateMathProblems(
    grade: number,
    count: number,
    difficulty?: string
  ): Promise<SelectionQuestion[]> {
    console.warn('EnhancedFallbackGenerator is deprecated. Use Template Bank system instead.');
    return [];
  }

  static async generateGermanProblems(
    grade: number,
    count: number,
    difficulty?: string
  ): Promise<SelectionQuestion[]> {
    console.warn('EnhancedFallbackGenerator is deprecated. Use Template Bank system instead.');
    return [];
  }
}
