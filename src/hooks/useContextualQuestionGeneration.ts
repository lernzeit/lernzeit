import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { SelectionQuestion } from '@/types/questionTypes';
import { ContextualDiversityEngine, ContextCombination, DiversityMetrics } from '@/utils/contextual/ContextualDiversityEngine';

interface ContextualQuestionGenerationProps {
  category: string;
  grade: number;
  userId: string;
  totalQuestions?: number;
}

interface ContextualGenerationResult {
  problems: SelectionQuestion[];
  isGenerating: boolean;
  diversityMetrics: DiversityMetrics | null;
  contextHistory: ContextCombination[];
  generateProblems: () => Promise<void>;
  refreshContexts: () => Promise<void>;
  error: string | null;
}

export function useContextualQuestionGeneration({
  category,
  grade,
  userId,
  totalQuestions = 5
}: ContextualQuestionGenerationProps): ContextualGenerationResult {
  const [problems, setProblems] = useState<SelectionQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [diversityMetrics, setDiversityMetrics] = useState<DiversityMetrics | null>(null);
  const [contextHistory, setContextHistory] = useState<ContextCombination[]>([]);
  const [error, setError] = useState<string | null>(null);

  const diversityEngine = new ContextualDiversityEngine(userId, category, grade);

  // Load initial context history and metrics
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [history, metrics] = await Promise.all([
          diversityEngine.getUserContextHistory(),
          diversityEngine.calculateDiversityMetrics()
        ]);
        
        setContextHistory(history);
        setDiversityMetrics(metrics);
      } catch (err) {
        console.error('Error loading initial contextual data:', err);
      }
    };

    if (userId && category && grade) {
      loadInitialData();
    }
  }, [userId, category, grade]);

  const generateProblems = async () => {
    if (!userId || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Generate diverse contexts
      const diverseContexts = await diversityEngine.generateDiverseContexts(totalQuestions);
      console.log('Generated diverse contexts:', diverseContexts);

      // Get recent contexts to avoid repetition
      const recentContexts = await diversityEngine.getUserContextHistory(7);

      // Prepare the enhanced prompt with contextual diversity
      const basePrompt = `Erstelle ${totalQuestions} verschiedene ${category}-Aufgaben für Klasse ${grade}.`;
      const enhancedPrompt = diversityEngine.getEnhancedPromptInstructions(recentContexts);

      // Call the question generation API with contextual enhancement
      const { data: apiResponse, error: apiError } = await supabase.functions.invoke('generate-problems', {
        body: {
          category,
          grade,
          count: totalQuestions,
          userId,
          enhancedPrompt: enhancedPrompt,
          diverseContexts: diverseContexts,
          excludedContexts: recentContexts
        }
      });

      if (apiError) {
        throw new Error(apiError.message || 'API call failed');
      }

      if (!apiResponse?.problems || !Array.isArray(apiResponse.problems)) {
        throw new Error('Invalid API response format');
      }

      const generatedProblems: SelectionQuestion[] = apiResponse.problems.map((problem: any, index: number) => ({
        id: Date.now() + index, // Number ID as expected by SelectionQuestion
        questionType: problem.questionType || 'text-input',
        question: problem.question || '',
        answer: problem.answer || '',
        type: problem.type || 'math',
        explanation: problem.explanation || '',
        options: problem.options || [],
        correctAnswer: problem.correctAnswer || '',
        selectableWords: problem.selectableWords || [],
        items: problem.items || [],
        categories: problem.categories || [],
        ...(diverseContexts[index] && { context: diverseContexts[index] }), // Only add if exists
        ...(true && { diversity_source: 'contextual_engine' }) // Add custom field
      } as any)) as SelectionQuestion[];

      setProblems(generatedProblems);

      // Record context usage for each generated problem
      for (let i = 0; i < generatedProblems.length && i < diverseContexts.length; i++) {
        const context = diverseContexts[i];
        const problem = generatedProblems[i];
        
        // We'd need to get the scenario family ID from the context generation
        // For now, we'll use a placeholder approach
        if (Object.keys(context).length > 0) {
          const scenarioFamilies = await diversityEngine.getScenarioFamilies();
          const defaultFamily = scenarioFamilies[0];
          
          if (defaultFamily) {
            await diversityEngine.recordContextUsage(context, defaultFamily.id, problem.id.toString());
          }
        }
      }

      // Update diversity metrics
      const updatedMetrics = await diversityEngine.calculateDiversityMetrics();
      setDiversityMetrics(updatedMetrics);
      await diversityEngine.storeDiversityMetrics(updatedMetrics);

      // Update context history
      const updatedHistory = await diversityEngine.getUserContextHistory();
      setContextHistory(updatedHistory);

      console.log('✅ Contextual question generation completed:', {
        problemsGenerated: generatedProblems.length,
        contextsUsed: diverseContexts.length,
        diversityMetrics: updatedMetrics
      });

    } catch (err) {
      console.error('❌ Contextual generation failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      
      // Fallback to basic generation if contextual fails
      try {
        const { data: fallbackResponse, error: fallbackError } = await supabase.functions.invoke('generate-problems', {
          body: {
            category,
            grade,
            count: totalQuestions,
            userId
          }
        });

        if (!fallbackError && fallbackResponse?.problems) {
          const fallbackProblems: SelectionQuestion[] = fallbackResponse.problems.map((problem: any, index: number) => ({
            id: Date.now() + index + 1000, // Number ID
            questionType: problem.questionType || 'text-input',
            question: problem.question || '',
            answer: problem.answer || '',
            type: problem.type || 'math',
            explanation: problem.explanation || '',
            options: problem.options || [],
            correctAnswer: problem.correctAnswer || '',
            selectableWords: problem.selectableWords || [],
            items: problem.items || [],
            categories: problem.categories || [],
            diversity_source: 'fallback'
          }));
          
          setProblems(fallbackProblems);
          console.log('🔄 Fallback generation successful');
        }
      } catch (fallbackErr) {
        console.error('❌ Fallback generation also failed:', fallbackErr);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const refreshContexts = async () => {
    try {
      const [newHistory, newMetrics] = await Promise.all([
        diversityEngine.getUserContextHistory(),
        diversityEngine.calculateDiversityMetrics()
      ]);
      
      setContextHistory(newHistory);
      setDiversityMetrics(newMetrics);
    } catch (err) {
      console.error('Error refreshing contexts:', err);
    }
  };

  return {
    problems,
    isGenerating,
    diversityMetrics,
    contextHistory,
    generateProblems,
    refreshContexts,
    error
  };
}