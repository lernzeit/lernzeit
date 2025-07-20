import { useState, useEffect, useCallback } from 'react';
import { SelectionQuestion } from '@/types/questionTypes';
import { supabase } from '@/lib/supabase';
import { 
  questionTemplates, 
  getTemplatesForCategory, 
  selectTemplateIntelligently,
  QuestionTemplate,
  GeneratedQuestion
} from '@/utils/questionTemplates';
import { TemplateCore } from '@/utils/templates/templateCore';
import { TemplateValidator } from '@/utils/templates/templateValidator';
import { QuestionGenerator } from '@/utils/templates/questionGenerator';

// Storage utilities for template combinations and usage tracking
const TEMPLATE_COMBINATIONS_KEY = (category: string, grade: number, userId: string) => 
  `template_combinations_${category}_${grade}_${userId}`;

const TEMPLATE_USAGE_KEY = (category: string, grade: number, userId: string) => 
  `template_usage_${category}_${grade}_${userId}`;

const getUsedCombinations = (category: string, grade: number, userId: string): Set<string> => {
  try {
    const stored = localStorage.getItem(TEMPLATE_COMBINATIONS_KEY(category, grade, userId));
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
};

const getTemplateUsage = (category: string, grade: number, userId: string): Map<string, number> => {
  try {
    const stored = localStorage.getItem(TEMPLATE_USAGE_KEY(category, grade, userId));
    const usageObj = stored ? JSON.parse(stored) : {};
    return new Map(Object.entries(usageObj).map(([key, value]) => [key, value as number]));
  } catch {
    return new Map();
  }
};

const storeUsedCombinations = (category: string, grade: number, userId: string, combinations: Set<string>) => {
  try {
    const combinationsArray = Array.from(combinations);
    localStorage.setItem(TEMPLATE_COMBINATIONS_KEY(category, grade, userId), JSON.stringify(combinationsArray));
    console.log(`💾 Stored ${combinationsArray.length} template combinations`);
  } catch (e) {
    console.warn('Failed to store template combinations:', e);
  }
};

const storeTemplateUsage = (category: string, grade: number, userId: string, usage: Map<string, number>) => {
  try {
    const usageObj = Object.fromEntries(usage);
    localStorage.setItem(TEMPLATE_USAGE_KEY(category, grade, userId), JSON.stringify(usageObj));
    console.log(`📊 Stored template usage statistics:`, usageObj);
  } catch (e) {
    console.warn('Failed to store template usage:', e);
  }
};

export function useTemplateQuestionGeneration(
  category: string, 
  grade: number, 
  userId: string, 
  totalQuestions: number = 5
) {
  const [problems, setProblems] = useState<SelectionQuestion[]>([]);
  const [usedCombinations, setUsedCombinations] = useState<Set<string>>(new Set());
  const [templateUsage, setTemplateUsage] = useState<Map<string, number>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<'template' | 'ai' | 'fallback' | null>(null);
  const [sessionId] = useState(() => `template_session_${Date.now()}_${Math.random()}`);
  const [generationErrors, setGenerationErrors] = useState<string[]>([]);

  // Memoize initialization to prevent infinite loops
  const initializeData = useCallback(() => {
    const storedCombinations = getUsedCombinations(category, grade, userId);
    const storedUsage = getTemplateUsage(category, grade, userId);
    setUsedCombinations(storedCombinations);
    setTemplateUsage(storedUsage);
    console.log(`🔄 Loaded ${storedCombinations.size} used template combinations for ${category} Grade ${grade}`);
    console.log(`📊 Loaded template usage statistics:`, Object.fromEntries(storedUsage));
  }, [category, grade, userId]);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  const validateTemplatesForCategory = useCallback((templates: QuestionTemplate[]) => {
    console.log('🔍 Validating templates for category:', category);
    const validationResults = TemplateValidator.runComprehensiveValidation(templates);
    
    console.log(`📊 Template validation results:`, {
      overallHealth: Math.round(validationResults.overallHealth * 100) + '%',
      validTemplates: validationResults.validTemplates,
      totalTemplates: templates.length,
      totalIssues: validationResults.totalIssues,
      criticalIssues: validationResults.criticalIssues.length
    });

    if (validationResults.criticalIssues.length > 0) {
      console.warn('🚨 Critical template issues found:', validationResults.criticalIssues.slice(0, 3));
      setGenerationErrors(prev => [...prev, ...validationResults.criticalIssues.slice(0, 3)]);
    }

    return validationResults.overallHealth >= 0.7; // At least 70% of templates should be valid
  }, [category]);

  const generateProblems = useCallback(async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setGenerationErrors([]);
    
    try {
      console.log(`🎯 Generating template-based problems for ${category}, Grade ${grade}`);
      console.log(`📝 Used combinations: ${usedCombinations.size}`);
      console.log(`📊 Template usage:`, Object.fromEntries(templateUsage));

      // Get available templates for this category and grade
      const availableTemplates = getTemplatesForCategory(category, grade);
      console.log(`📋 Available templates: ${availableTemplates.length}`);

      if (availableTemplates.length === 0) {
        console.log('⚠️ No templates available, falling back to AI generation');
        await fallbackToAI();
        return;
      }

      // Validate templates before using them
      const templatesAreHealthy = validateTemplatesForCategory(availableTemplates);
      if (!templatesAreHealthy) {
        console.warn('⚠️ Template validation failed, falling back to AI generation');
        await fallbackToAI();
        return;
      }

      // Generate questions using intelligent template selection
      const templateProblems = await generateTemplateProblemsIntelligently(availableTemplates);
      
      if (templateProblems.length >= totalQuestions) {
        const selectedProblems = templateProblems.slice(0, totalQuestions);
        setProblems(selectedProblems);
        setGenerationSource('template');
        
        console.log(`✅ Using template-generated problems: ${selectedProblems.length}`);
        console.log(`📊 Questions:`, selectedProblems.map(p => p.question.substring(0, 30) + '...'));
      } else {
        console.log(`⚠️ Templates generated only ${templateProblems.length}/${totalQuestions} questions, trying AI fallback`);
        await fallbackToAI();
      }

    } catch (error) {
      console.error('❌ Template generation failed:', error);
      setGenerationErrors(prev => [...prev, `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      await fallbackToAI();
    } finally {
      setIsGenerating(false);
    }
  }, [category, grade, usedCombinations, templateUsage, totalQuestions, isGenerating, validateTemplatesForCategory]);

  const generateTemplateProblemsIntelligently = async (templates: QuestionTemplate[]): Promise<SelectionQuestion[]> => {
    const problems: SelectionQuestion[] = [];
    const updatedCombinations = new Set(usedCombinations);
    const updatedUsage = new Map(templateUsage);
    const errors: string[] = [];

    const getDifficultyForQuestion = (questionIndex: number): 'easy' | 'medium' | 'hard' | undefined => {
      if (questionIndex < 2) return 'easy';
      if (questionIndex < 4) return 'medium';
      return 'hard';
    };

    const maxAttempts = totalQuestions * 20; // Increased attempts for better reliability
    let attempts = 0;

    while (problems.length < totalQuestions && attempts < maxAttempts) {
      attempts++;

      const preferredDifficulty = getDifficultyForQuestion(problems.length);
      const selectedTemplate = selectTemplateIntelligently(templates, updatedUsage, preferredDifficulty);
      
      if (!selectedTemplate) {
        errors.push('No suitable template could be selected');
        console.warn('⚠️ No template could be selected');
        break;
      }

      // Generate question with improved error handling
      const generatedQuestion = TemplateCore.generateQuestionFromTemplate(selectedTemplate, updatedCombinations);

      if (generatedQuestion) {
        try {
          const selectionQuestion = convertToSelectionQuestion(generatedQuestion);
          problems.push(selectionQuestion);
          
          // Update usage statistics
          updatedUsage.set(selectedTemplate.id, (updatedUsage.get(selectedTemplate.id) || 0) + 1);
          
          console.log(`✅ Generated: "${generatedQuestion.question.substring(0, 40)}..." (Template: ${selectedTemplate.id}, Difficulty: ${selectedTemplate.difficulty})`);
        } catch (conversionError) {
          console.error('Error converting generated question:', conversionError);
          errors.push(`Conversion failed for template ${selectedTemplate.id}`);
        }
      } else {
        errors.push(`Failed to generate question from template ${selectedTemplate.id}`);
      }
    }

    // Store updated data
    setUsedCombinations(updatedCombinations);
    setTemplateUsage(updatedUsage);
    storeUsedCombinations(category, grade, userId, updatedCombinations);
    storeTemplateUsage(category, grade, userId, updatedUsage);

    if (errors.length > 0) {
      console.warn('Generation errors:', errors);
      setGenerationErrors(prev => [...prev, ...errors.slice(0, 3)]);
    }

    // Log generation audit trail
    const auditLog = QuestionGenerator.getAuditLog();
    const recentEntries = auditLog.slice(-5);
    console.log('📝 Recent generation audit log:', recentEntries);

    return problems;
  };

  const convertToSelectionQuestion = (generated: GeneratedQuestion): SelectionQuestion => {
    const base = {
      id: generated.id,
      question: generated.question,
      type: generated.type as any,
      explanation: generated.explanation
    };

    switch (generated.questionType) {
      case 'multiple-choice':
        return {
          ...base,
          questionType: 'multiple-choice',
          options: generated.options || [],
          correctAnswer: generated.correctAnswer || 0
        };
      
      case 'word-selection':
        return {
          ...base,
          questionType: 'word-selection',
          sentence: generated.question,
          selectableWords: generated.selectableWords || []
        };
      
      case 'matching':
        return {
          ...base,
          questionType: 'matching',
          items: generated.items || [],
          categories: generated.categories || []
        };
      
      case 'drag-drop':
        return {
          ...base,
          questionType: 'drag-drop',
          items: generated.items || [],
          categories: generated.categories || []
        };
      
      case 'text-input':
      default:
        return {
          ...base,
          questionType: 'text-input',
          answer: generated.answer
        };
    }
  };

  const fallbackToAI = async (): Promise<void> => {
    try {
      console.log('🤖 Attempting AI generation as fallback...');
      
      const excludeQuestions = Array.from(usedCombinations);
      
      const response = await supabase.functions.invoke('generate-problems', {
        body: {
          category,
          grade,
          count: totalQuestions + 2,
          excludeQuestions,
          sessionId,
          globalQuestionCount: usedCombinations.size,
          requestId: `${Date.now()}_${Math.random()}`
        }
      });

      if (response.error) {
        console.error('❌ AI fallback failed:', response.error);
        generateFallbackProblems();
        return;
      }

      const aiProblems = response.data?.problems || [];
      if (aiProblems.length >= totalQuestions) {
        const selectedProblems = aiProblems.slice(0, totalQuestions);
        setProblems(selectedProblems);
        setGenerationSource('ai');
        console.log(`✅ Using AI fallback: ${selectedProblems.length} problems`);
      } else {
        generateFallbackProblems();
      }
    } catch (error) {
      console.error('❌ AI fallback error:', error);
      generateFallbackProblems();
    }
  };

  const generateFallbackProblems = (): void => {
    console.log('⚡ Using simple fallback generation...');
    const fallbackProblems: SelectionQuestion[] = [];
    
    for (let i = 0; i < totalQuestions; i++) {
      if (category === 'Mathematik') {
        const a = Math.floor(Math.random() * 20) + 5;
        const b = Math.floor(Math.random() * 15) + 2;
        const operation = Math.random() > 0.5 ? '+' : '-';
        const answer = operation === '+' ? a + b : Math.max(0, a - b);
        
        fallbackProblems.push({
          id: Math.floor(Math.random() * 1000000),
          questionType: 'text-input',
          question: `${operation === '+' ? a : Math.max(a, b)} ${operation} ${operation === '+' ? b : Math.min(a, b)} = ?`,
          answer: answer,
          type: 'math',
          explanation: `Einfache ${operation === '+' ? 'Addition' : 'Subtraktion'}`
        });
      } else if (category === 'Deutsch') {
        const words = ['Hund', 'Katze', 'Baum', 'Haus', 'Auto'];
        const word = words[Math.floor(Math.random() * words.length)];
        const syllableCount = Math.max(1, Math.floor(word.length / 2));
        
        fallbackProblems.push({
          id: Math.floor(Math.random() * 1000000),
          questionType: 'text-input',
          question: `Wie viele Silben hat das Wort "${word}"?`,
          answer: syllableCount,
          type: 'german',
          explanation: 'Silben zählen'
        });
      } else {
        const num = Math.floor(Math.random() * 100) + 1;
        fallbackProblems.push({
          id: Math.floor(Math.random() * 1000000),
          questionType: 'text-input',
          question: `Was ist ${num} + 1?`,
          answer: num + 1,
          type: category.toLowerCase() as 'math' | 'german' | 'english' | 'geography' | 'history' | 'physics' | 'biology' | 'chemistry' | 'latin',
          explanation: 'Einfache Rechnung'
        });
      }
    }
    
    setProblems(fallbackProblems);
    setGenerationSource('fallback');
  };

  const getGenerationStats = () => {
    return {
      totalCombinations: usedCombinations.size,
      templateUsage: Object.fromEntries(templateUsage),
      availableTemplates: getTemplatesForCategory(category, grade).length,
      generationSource,
      generationErrors,
      auditLog: QuestionGenerator.getAuditLog().slice(-10) // Last 10 entries
    };
  };

  return {
    problems,
    usedCombinations,
    templateUsage,
    sessionId,
    isGenerating,
    generationSource,
    generationErrors,
    generateProblems,
    getGenerationStats
  };
}
