import { useState, useEffect, useCallback } from 'react';
import { SmartContextRotationEngine, SmartRotationMetrics } from '@/utils/contextual/SmartContextRotationEngine';
import { MultiContextTemplateEngine, GeneratedMultiContextQuestion } from '@/utils/contextual/MultiContextTemplateEngine';
import { ContextCombination } from '@/utils/contextual/ContextualDiversityEngine';
import { supabase } from "@/integrations/supabase/client";
import { SelectionQuestion } from '@/types/questionTypes';

interface SmartContextRotationProps {
  userId: string;
  category: string;
  grade: number;
  totalQuestions?: number;
  enableMultiContextTemplates?: boolean;
}

interface SmartRotationResult {
  problems: SelectionQuestion[];
  isGenerating: boolean;
  rotationMetrics: SmartRotationMetrics | null;
  contextHistory: ContextCombination[];
  multiContextQuestions: GeneratedMultiContextQuestion[];
  generateSmartProblems: () => Promise<void>;
  generateMultiContextProblems: () => Promise<void>;
  refreshRotationData: () => Promise<void>;
  error: string | null;
  rotationStrategy: string | null;
}

export function useSmartContextRotation({
  userId,
  category,
  grade,
  totalQuestions = 5,
  enableMultiContextTemplates = true
}: SmartContextRotationProps): SmartRotationResult {
  const [problems, setProblems] = useState<SelectionQuestion[]>([]);
  const [multiContextQuestions, setMultiContextQuestions] = useState<GeneratedMultiContextQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [rotationMetrics, setRotationMetrics] = useState<SmartRotationMetrics | null>(null);
  const [contextHistory, setContextHistory] = useState<ContextCombination[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rotationStrategy, setRotationStrategy] = useState<string | null>(null);

  // Initialize engines
  const smartRotationEngine = new SmartContextRotationEngine(userId, category, grade);
  const multiContextEngine = new MultiContextTemplateEngine();

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!userId || !category || !grade) return;

      try {
        const [history, metrics] = await Promise.all([
          smartRotationEngine.getUserContextHistory(),
          smartRotationEngine.calculateSmartRotationMetrics()
        ]);
        
        setContextHistory(history);
        setRotationMetrics(metrics);
      } catch (err) {
        console.error('Error loading smart rotation data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load rotation data');
      }
    };

    loadInitialData();
  }, [userId, category, grade]);

  /**
   * Generate problems using smart context rotation
   */
  const generateSmartProblems = useCallback(async () => {
    if (!userId || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setRotationStrategy('smart_rotation');

    try {
      console.log('🧠 Starting Smart Context Rotation Generation...');

      // Generate smart rotated contexts
      const smartContexts = await smartRotationEngine.generateSmartRotatedContexts(totalQuestions);
      console.log('Generated smart contexts:', smartContexts);

      // Calculate current rotation metrics
      const currentMetrics = await smartRotationEngine.calculateSmartRotationMetrics();
      setRotationMetrics(currentMetrics);

      // Get recent contexts to avoid repetition
      const recentContexts = await smartRotationEngine.getUserContextHistory(7);

      // Create enhanced prompt with smart rotation instructions
      const enhancedPrompt = smartRotationEngine.getSmartRotationPromptInstructions(
        smartContexts,
        currentMetrics
      );

      // Call the question generation API
      const { data: apiResponse, error: apiError } = await supabase.functions.invoke('generate-problems', {
        body: {
          category,
          grade,
          count: totalQuestions,
          userId,
          enhancedPrompt: enhancedPrompt,
          smartContexts: smartContexts,
          excludedContexts: recentContexts,
          rotationMode: 'smart',
          rotationMetrics: currentMetrics
        }
      });

      if (apiError) {
        throw new Error(apiError.message || 'Smart rotation API call failed');
      }

      if (!apiResponse?.problems || !Array.isArray(apiResponse.problems)) {
        throw new Error('Invalid smart rotation API response format');
      }

      // Convert to SelectionQuestion format
      const generatedProblems: SelectionQuestion[] = apiResponse.problems.map((problem: any, index: number) => ({
        id: Date.now() + index,
        questionType: problem.questionType || 'text-input',
        question: problem.question || '',
        answer: problem.answer || '',
        type: problem.type || category,
        explanation: problem.explanation || '',
        options: problem.options || [],
        correctAnswer: problem.correctAnswer || '',
        selectableWords: problem.selectableWords || [],
        items: problem.items || [],
        categories: problem.categories || [],
        ...(smartContexts[index] && { context: smartContexts[index] }),
        diversity_source: 'smart_rotation_engine',
        rotation_strategy: 'multi_strategy_weighted'
      } as any)) as SelectionQuestion[];

      setProblems(generatedProblems);

      // Record context usage for smart rotation tracking
      for (let i = 0; i < generatedProblems.length && i < smartContexts.length; i++) {
        const context = smartContexts[i];
        const problem = generatedProblems[i];
        
        if (Object.keys(context).length > 0) {
          const scenarioFamilies = await smartRotationEngine.getScenarioFamilies();
          const defaultFamily = scenarioFamilies[0];
          
          if (defaultFamily) {
            await smartRotationEngine.recordContextUsage(
              context, 
              defaultFamily.id, 
              problem.id.toString()
            );
          }
        }
      }

      // Update metrics and history
      const updatedMetrics = await smartRotationEngine.calculateSmartRotationMetrics();
      const updatedHistory = await smartRotationEngine.getUserContextHistory();
      
      setRotationMetrics(updatedMetrics);
      setContextHistory(updatedHistory);

      // Store diversity metrics (convert metrics if needed)
      const diversityMetrics = await smartRotationEngine.calculateDiversityMetrics();
      await smartRotationEngine.storeDiversityMetrics(diversityMetrics);

      console.log('✅ Smart Context Rotation completed:', {
        problemsGenerated: generatedProblems.length,
        contextsUsed: smartContexts.length,
        rotationMetrics: updatedMetrics
      });

    } catch (err) {
      console.error('❌ Smart rotation generation failed:', err);
      setError(err instanceof Error ? err.message : 'Smart rotation generation failed');
      
      // Fallback to basic contextual generation
      try {
        console.log('🔄 Falling back to basic contextual generation...');
        const fallbackContexts = await smartRotationEngine.generateDiverseContexts(totalQuestions);
        
        const { data: fallbackResponse, error: fallbackError } = await supabase.functions.invoke('generate-problems', {
          body: {
            category,
            grade,
            count: totalQuestions,
            userId,
            diverseContexts: fallbackContexts
          }
        });

        if (!fallbackError && fallbackResponse?.problems) {
          const fallbackProblems: SelectionQuestion[] = fallbackResponse.problems.map((problem: any, index: number) => ({
            id: Date.now() + index + 1000,
            questionType: problem.questionType || 'text-input',
            question: problem.question || '',
            answer: problem.answer || '',
            type: problem.type || category,
            explanation: problem.explanation || '',
            options: problem.options || [],
            correctAnswer: problem.correctAnswer || '',
            selectableWords: problem.selectableWords || [],
            items: problem.items || [],
            categories: problem.categories || [],
            diversity_source: 'fallback_contextual'
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
  }, [userId, category, grade, totalQuestions]);

  /**
   * Generate problems using multi-context templates
   */
  const generateMultiContextProblems = useCallback(async () => {
    if (!userId || isGenerating || !enableMultiContextTemplates) return;

    setIsGenerating(true);
    setError(null);
    setRotationStrategy('multi_context_templates');

    try {
      console.log('🎨 Starting Multi-Context Template Generation...');

      // Get multi-context templates for this category and grade
      const templates = await multiContextEngine.getMultiContextTemplates(category, grade);
      
      if (templates.length === 0) {
        throw new Error('No multi-context templates available for this category and grade');
      }

      // Generate smart rotated contexts
      const smartContexts = await smartRotationEngine.generateSmartRotatedContexts(totalQuestions);

      const generatedQuestions: GeneratedMultiContextQuestion[] = [];
      const generatedProblems: SelectionQuestion[] = [];

      // Generate questions using templates
      for (let i = 0; i < totalQuestions && i < smartContexts.length; i++) {
        const context = smartContexts[i];
        const template = templates[i % templates.length]; // Cycle through available templates

        const multiContextQuestion = await multiContextEngine.generateQuestionFromTemplate(
          template,
          context,
          grade
        );

        if (multiContextQuestion) {
          generatedQuestions.push(multiContextQuestion);

          // Convert to SelectionQuestion format
          const selectionQuestion: SelectionQuestion = {
            id: Date.now() + i,
            questionType: multiContextQuestion.question_type,
            question: multiContextQuestion.question_text,
            answer: multiContextQuestion.answer,
            type: category,
            explanation: `Komplexität: ${(multiContextQuestion.complexity_score * 100).toFixed(1)}%, Kognitive Last: ${(multiContextQuestion.cognitive_load * 100).toFixed(1)}%`,
            options: Array.isArray(multiContextQuestion.answer) ? multiContextQuestion.answer : [],
            correctAnswer: typeof multiContextQuestion.answer === 'object' && multiContextQuestion.answer.correct ? multiContextQuestion.answer.correct : '',
            selectableWords: [],
            items: [],
            categories: [],
            // Add custom fields
            context: multiContextQuestion.context_combination,
            diversity_source: 'multi_context_template',
            template_id: multiContextQuestion.template_id,
            complexity_score: multiContextQuestion.complexity_score,
            cognitive_load: multiContextQuestion.cognitive_load
          } as any;

          generatedProblems.push(selectionQuestion);

          // Update template usage statistics
          await multiContextEngine.updateTemplateUsage(
            multiContextQuestion.template_id,
            multiContextQuestion.pattern_id,
            true, // Assume successful for now
            multiContextQuestion.complexity_score,
            multiContextQuestion.cognitive_load
          );
        }
      }

      setMultiContextQuestions(generatedQuestions);
      setProblems(generatedProblems);

      // Record context usage
      for (let i = 0; i < generatedQuestions.length; i++) {
        const question = generatedQuestions[i];
        const context = question.context_combination;
        
        if (Object.keys(context).length > 0) {
          const scenarioFamilies = await smartRotationEngine.getScenarioFamilies();
          const defaultFamily = scenarioFamilies[0];
          
          if (defaultFamily) {
            await smartRotationEngine.recordContextUsage(
              context,
              defaultFamily.id,
              question.id
            );
          }
        }
      }

      // Update metrics
      const updatedMetrics = await smartRotationEngine.calculateSmartRotationMetrics();
      const updatedHistory = await smartRotationEngine.getUserContextHistory();
      
      setRotationMetrics(updatedMetrics);
      setContextHistory(updatedHistory);

      console.log('✅ Multi-Context Template Generation completed:', {
        questionsGenerated: generatedQuestions.length,
        templatesUsed: new Set(generatedQuestions.map(q => q.template_id)).size,
        avgComplexity: generatedQuestions.reduce((sum, q) => sum + q.complexity_score, 0) / generatedQuestions.length,
        avgCognitiveLoad: generatedQuestions.reduce((sum, q) => sum + q.cognitive_load, 0) / generatedQuestions.length
      });

    } catch (err) {
      console.error('❌ Multi-context template generation failed:', err);
      setError(err instanceof Error ? err.message : 'Multi-context template generation failed');
      
      // Fallback to smart rotation
      await generateSmartProblems();
    } finally {
      setIsGenerating(false);
    }
  }, [userId, category, grade, totalQuestions, enableMultiContextTemplates, generateSmartProblems]);

  /**
   * Refresh rotation data
   */
  const refreshRotationData = useCallback(async () => {
    if (!userId) return;

    try {
      const [newHistory, newMetrics] = await Promise.all([
        smartRotationEngine.getUserContextHistory(),
        smartRotationEngine.calculateSmartRotationMetrics()
      ]);
      
      setContextHistory(newHistory);
      setRotationMetrics(newMetrics);
    } catch (err) {
      console.error('Error refreshing rotation data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh rotation data');
    }
  }, [userId]);

  return {
    problems,
    isGenerating,
    rotationMetrics,
    contextHistory,
    multiContextQuestions,
    generateSmartProblems,
    generateMultiContextProblems,
    refreshRotationData,
    error,
    rotationStrategy
  };
}