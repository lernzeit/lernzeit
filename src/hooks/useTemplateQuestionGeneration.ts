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
import { ParameterGenerator } from '@/utils/templates/parameterGenerator';

// Storage utilities for template combinations and usage tracking
const TEMPLATE_COMBINATIONS_KEY = (category: string, grade: number, userId: string) => 
  `template_combinations_${category}_${grade}_${userId}`;

const TEMPLATE_USAGE_KEY = (category: string, grade: number, userId: string) => 
  `template_usage_${category}_${grade}_${userId}`;

const SESSION_TEMPLATES_KEY = (category: string, grade: number, userId: string) => 
  `session_templates_${category}_${grade}_${userId}`;

// FIXED: Better storage management with rotation
const getUsedCombinations = (category: string, grade: number, userId: string): Set<string> => {
  try {
    if (typeof Storage === "undefined") {
      console.warn('📝 LocalStorage not available, using session memory');
      return new Set();
    }

    const stored = localStorage.getItem(TEMPLATE_COMBINATIONS_KEY(category, grade, userId));
    if (!stored) {
      console.log('📝 No stored combinations found, starting fresh');
      return new Set();
    }

    const parsed = JSON.parse(stored);
    const combinations = new Set(Array.isArray(parsed) ? parsed : []);
    
    // FIXED: Auto-rotate if too many combinations stored
    const maxCombinations = 500;
    if (combinations.size > maxCombinations) {
      console.log(`🔄 Rotating combinations (${combinations.size} -> ${maxCombinations / 2})`);
      const recentCombinations = Array.from(combinations).slice(-maxCombinations / 2);
      const rotatedSet = new Set(recentCombinations);
      storeUsedCombinations(category, grade, userId, rotatedSet);
      return rotatedSet;
    }
    
    console.log(`📝 Loaded ${combinations.size} used combinations for ${category} Grade ${grade}`);
    return combinations;
  } catch (error) {
    console.warn('📝 Failed to load combinations, clearing corrupted data:', error);
    try {
      localStorage.removeItem(TEMPLATE_COMBINATIONS_KEY(category, grade, userId));
    } catch {}
    return new Set();
  }
};

const getTemplateUsage = (category: string, grade: number, userId: string): Map<string, number> => {
  try {
    if (typeof Storage === "undefined") {
      return new Map();
    }

    const stored = localStorage.getItem(TEMPLATE_USAGE_KEY(category, grade, userId));
    if (!stored) {
      return new Map();
    }

    const usageObj = JSON.parse(stored);
    const usage = new Map(Object.entries(usageObj).map(([key, value]) => [key, value as number]));
    console.log(`📊 Loaded template usage:`, Object.fromEntries(usage));
    return usage;
  } catch (error) {
    console.warn('📊 Failed to load usage statistics:', error);
    try {
      localStorage.removeItem(TEMPLATE_USAGE_KEY(category, grade, userId));
    } catch {}
    return new Map();
  }
};

// FIXED: New session template tracking
const getSessionTemplates = (category: string, grade: number, userId: string): Set<string> => {
  try {
    if (typeof Storage === "undefined") {
      return new Set();
    }

    const stored = localStorage.getItem(SESSION_TEMPLATES_KEY(category, grade, userId));
    if (!stored) {
      return new Set();
    }

    return new Set(JSON.parse(stored));
  } catch (error) {
    console.warn('📝 Failed to load session templates:', error);
    return new Set();
  }
};

const storeUsedCombinations = (category: string, grade: number, userId: string, combinations: Set<string>) => {
  try {
    if (typeof Storage === "undefined") {
      console.warn('📝 LocalStorage not available, cannot persist combinations');
      return;
    }

    const combinationsArray = Array.from(combinations);
    localStorage.setItem(TEMPLATE_COMBINATIONS_KEY(category, grade, userId), JSON.stringify(combinationsArray));
    console.log(`💾 Stored ${combinationsArray.length} template combinations`);
  } catch (error) {
    console.warn('💾 Failed to store template combinations:', error);
  }
};

const storeTemplateUsage = (category: string, grade: number, userId: string, usage: Map<string, number>) => {
  try {
    if (typeof Storage === "undefined") {
      return;
    }

    const usageObj = Object.fromEntries(usage);
    localStorage.setItem(TEMPLATE_USAGE_KEY(category, grade, userId), JSON.stringify(usageObj));
    console.log(`📊 Stored template usage statistics:`, usageObj);
  } catch (error) {
    console.warn('📊 Failed to store template usage:', error);
  }
};

// FIXED: Store session templates
const storeSessionTemplates = (category: string, grade: number, userId: string, templates: Set<string>) => {
  try {
    if (typeof Storage === "undefined") {
      return;
    }

    localStorage.setItem(SESSION_TEMPLATES_KEY(category, grade, userId), JSON.stringify(Array.from(templates)));
    console.log(`🎯 Stored ${templates.size} session templates`);
  } catch (error) {
    console.warn('🎯 Failed to store session templates:', error);
  }
};

// FIXED: Force template rotation with weighted selection
const selectTemplateWithRotation = (templates: QuestionTemplate[], usage: Map<string, number>, sessionTemplates: Set<string>, difficulty?: string): QuestionTemplate | null => {
  if (templates.length === 0) return null;

  // Filter out recently used templates in this session
  const availableTemplates = templates.filter(t => !sessionTemplates.has(t.id));
  
  if (availableTemplates.length === 0) {
    console.log('🔄 All templates used in session, resetting session tracking');
    return selectTemplateWithRotation(templates, usage, new Set(), difficulty);
  }

  // Weight templates by inverse usage (less used = higher weight)
  const weights = availableTemplates.map(template => {
    const usageCount = usage.get(template.id) || 0;
    const difficultyBonus = difficulty && template.difficulty === difficulty ? 2 : 1;
    return Math.max(1, (10 - usageCount) * difficultyBonus);
  });

  // Weighted random selection
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let randomValue = Math.random() * totalWeight;
  
  for (let i = 0; i < availableTemplates.length; i++) {
    randomValue -= weights[i];
    if (randomValue <= 0) {
      const selected = availableTemplates[i];
      console.log(`🎯 Selected template ${selected.id} (weight: ${weights[i]}, usage: ${usage.get(selected.id) || 0})`);
      return selected;
    }
  }

  // Fallback to first available template
  return availableTemplates[0];
};

// FIXED: Reset function for development/debugging
const clearAllStorage = (category: string, grade: number, userId: string) => {
  try {
    localStorage.removeItem(TEMPLATE_COMBINATIONS_KEY(category, grade, userId));
    localStorage.removeItem(TEMPLATE_USAGE_KEY(category, grade, userId));
    localStorage.removeItem(SESSION_TEMPLATES_KEY(category, grade, userId));
    console.log('🧹 Cleared all template storage');
  } catch (error) {
    console.warn('🧹 Failed to clear storage:', error);
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
  const [sessionTemplates, setSessionTemplates] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<'template' | 'ai' | 'fallback' | null>(null);
  const [sessionId] = useState(() => `template_session_${Date.now()}_${Math.random()}`);
  const [generationErrors, setGenerationErrors] = useState<string[]>([]);

  // FIXED: Initialize data on component mount
  const initializeData = useCallback(() => {
    const storedCombinations = getUsedCombinations(category, grade, userId);
    const storedUsage = getTemplateUsage(category, grade, userId);
    const storedSessionTemplates = getSessionTemplates(category, grade, userId);
    
    setUsedCombinations(storedCombinations);
    setTemplateUsage(storedUsage);
    setSessionTemplates(storedSessionTemplates);
    
    console.log(`🔄 Initialized: ${storedCombinations.size} combinations, ${storedUsage.size} usage entries, ${storedSessionTemplates.size} session templates`);
  }, [category, grade, userId]);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // FIXED: Better template validation
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

    return validationResults.overallHealth >= 0.3; // Lower threshold for more flexibility
  }, [category]);

  const generateProblems = useCallback(async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setGenerationErrors([]);
    
    try {
      console.log(`🎯 Generating template-based problems for ${category}, Grade ${grade}`);
      console.log(`📝 Used combinations: ${usedCombinations.size}, Session templates: ${sessionTemplates.size}`);

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

      // FIXED: Generate questions with improved template selection
      const templateProblems = await generateTemplateProblemsWithImprovedSelection(availableTemplates);
      
      if (templateProblems.length >= totalQuestions) {
        const selectedProblems = templateProblems.slice(0, totalQuestions);
        setProblems(selectedProblems);
        setGenerationSource('template');
        
        console.log(`✅ Using template-generated problems: ${selectedProblems.length}`);
        console.log(`📋 Questions:`, selectedProblems.map(p => `"${p.question.substring(0, 40)}..."`));
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
  }, [category, grade, usedCombinations, templateUsage, sessionTemplates, totalQuestions, isGenerating, validateTemplatesForCategory]);

  // FIXED: Completely rewritten template selection with proper rotation
  const generateTemplateProblemsWithImprovedSelection = async (templates: QuestionTemplate[]): Promise<SelectionQuestion[]> => {
    const problems: SelectionQuestion[] = [];
    const updatedCombinations = new Set(usedCombinations);
    const updatedUsage = new Map(templateUsage);
    const updatedSessionTemplates = new Set(sessionTemplates);
    const errors: string[] = [];

    const maxAttempts = totalQuestions * 50;
    let attempts = 0;

    while (problems.length < totalQuestions && attempts < maxAttempts) {
      attempts++;
      const questionIndex = problems.length;
      
      // FIXED: Progressive difficulty system
      const getDifficultyForQuestion = (index: number): string | undefined => {
        if (index < 2) return 'easy';
        if (index < 4) return 'medium';
        return 'hard';
      };
      
      const preferredDifficulty = getDifficultyForQuestion(questionIndex);
      
      // FIXED: Use new template selection with proper rotation
      const selectedTemplate = selectTemplateWithRotation(
        templates, 
        updatedUsage, 
        updatedSessionTemplates, 
        preferredDifficulty
      );
      
      if (!selectedTemplate) {
        errors.push('No template could be selected');
        console.error('❌ Template selection failed');
        break;
      }

      console.log(`🔄 Attempt ${attempts}: Using template ${selectedTemplate.id} (${selectedTemplate.difficulty || 'unknown'})`);
      
      // FIXED: Use improved parameter generation with collision detection
      const parameterResult = ParameterGenerator.generateUniqueParameters(selectedTemplate, updatedCombinations);

      if (parameterResult.isValid) {
        try {
          // Generate the question text and options
          const generatedQuestion = QuestionGenerator.generateQuestionFromTemplate(selectedTemplate, updatedCombinations);
          
          if (generatedQuestion) {
            const selectionQuestion = convertToSelectionQuestion(generatedQuestion);
            problems.push(selectionQuestion);
            
            // Update all tracking
            const combinationKey = `${selectedTemplate.id}_${JSON.stringify(parameterResult.parameters)}`;
            updatedCombinations.add(combinationKey);
            updatedUsage.set(selectedTemplate.id, (updatedUsage.get(selectedTemplate.id) || 0) + 1);
            updatedSessionTemplates.add(selectedTemplate.id);
            
            console.log(`✅ Generated #${problems.length}: "${generatedQuestion.question.substring(0, 50)}..." (${selectedTemplate.id})`);
          } else {
            console.warn(`⚠️ Template ${selectedTemplate.id} failed to generate question`);
            errors.push(`Failed to generate question from template ${selectedTemplate.id}`);
          }
        } catch (conversionError) {
          console.error('❌ Error converting generated question:', conversionError);
          errors.push(`Conversion failed for template ${selectedTemplate.id}`);
        }
      } else {
        console.warn(`⚠️ Parameter generation failed for template ${selectedTemplate.id}`);
        errors.push(`Parameter generation failed for template ${selectedTemplate.id}`);
      }

      // FIXED: Reset session templates if we've used too many
      if (updatedSessionTemplates.size >= Math.floor(templates.length * 0.8)) {
        console.log('🔄 Resetting session template tracking to ensure variety');
        updatedSessionTemplates.clear();
      }
    }

    // Store updated data
    setUsedCombinations(updatedCombinations);
    setTemplateUsage(updatedUsage);
    setSessionTemplates(updatedSessionTemplates);
    storeUsedCombinations(category, grade, userId, updatedCombinations);
    storeTemplateUsage(category, grade, userId, updatedUsage);
    storeSessionTemplates(category, grade, userId, updatedSessionTemplates);

    if (errors.length > 0) {
      console.warn(`⚠️ Generation completed with ${errors.length} errors:`, errors.slice(0, 5));
      setGenerationErrors(prev => [...prev, ...errors.slice(0, 3)]);
    }

    console.log(`📊 Generation complete: ${problems.length}/${totalQuestions} questions after ${attempts} attempts`);

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
          leftItems: generated.leftItems || [],
          rightItems: generated.rightItems || [],
          correctMatches: generated.correctMatches || {}
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
          count: totalQuestions + 3,
          excludeQuestions,
          sessionId,
          globalQuestionCount: usedCombinations.size,
          requestId: `fallback_${Date.now()}_${Math.random()}`,
          forceVariation: true,
          templateSessionId: sessionId
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

  // FIXED: Much better fallback with proper randomization
  const generateFallbackProblems = (): void => {
    console.log('⚡ Using improved fallback generation...');
    const fallbackProblems: SelectionQuestion[] = [];
    
    for (let i = 0; i < totalQuestions; i++) {
      const seed = Math.random() * 1000000;
      
      if (category === 'Mathematik') {
        const operations = ['+', '-', '*'];
        const operation = operations[Math.floor(Math.random() * operations.length)];
        
        let a, b, answer, questionText;
        
        if (operation === '+') {
          a = Math.floor(Math.random() * 50) + 10; // 10-59
          b = Math.floor(Math.random() * 40) + 5;  // 5-44
          answer = a + b;
          questionText = `${a} + ${b} = ?`;
        } else if (operation === '-') {
          a = Math.floor(Math.random() * 80) + 30; // 30-109
          b = Math.floor(Math.random() * 25) + 5;  // 5-29
          answer = a - b;
          questionText = `${a} - ${b} = ?`;
        } else { // multiplication
          a = Math.floor(Math.random() * 12) + 3;  // 3-14
          b = Math.floor(Math.random() * 8) + 2;   // 2-9
          answer = a * b;
          questionText = `${a} × ${b} = ?`;
        }
        
        fallbackProblems.push({
          id: Math.floor(seed),
          questionType: 'text-input',
          question: questionText,
          answer: answer,
          type: 'math',
          explanation: `Fallback ${operation === '+' ? 'Addition' : operation === '-' ? 'Subtraktion' : 'Multiplikation'}`
        });
      } else if (category === 'Deutsch') {
        const words = ['Hund', 'Katze', 'Baum', 'Haus', 'Auto', 'Buch', 'Tisch', 'Stuhl', 'Blume', 'Vogel', 'Sonne', 'Mond', 'Stern', 'Wasser', 'Feuer'];
        const word = words[Math.floor(Math.random() * words.length)];
        const syllableCount = Math.max(1, Math.ceil(word.length / 2.5));
        
        fallbackProblems.push({
          id: Math.floor(seed),
          questionType: 'text-input',
          question: `Wie viele Silben hat das Wort "${word}"?`,
          answer: syllableCount,
          type: 'german',
          explanation: 'Silben zählen'
        });
      } else {
        const num = Math.floor(Math.random() * 80) + 20; // 20-99
        const addend = Math.floor(Math.random() * 15) + 1; // 1-15
        fallbackProblems.push({
          id: Math.floor(seed),
          questionType: 'text-input',
          question: `Was ist ${num} + ${addend}?`,
          answer: num + addend,
          type: category.toLowerCase() as any,
          explanation: 'Einfache Rechnung'
        });
      }
    }
    
    console.log('⚡ Generated fallback problems:', fallbackProblems.map(p => p.question));
    setProblems(fallbackProblems);
    setGenerationSource('fallback');
  };

  // FIXED: Enhanced debugging and stats
  const getGenerationStats = () => {
    return {
      totalCombinations: usedCombinations.size,
      sessionTemplates: sessionTemplates.size,
      templateUsage: Object.fromEntries(templateUsage),
      availableTemplates: getTemplatesForCategory(category, grade).length,
      generationSource,
      generationErrors,
      auditLog: QuestionGenerator.getAuditLog().slice(-10),
      // Enhanced reset function
      resetData: () => {
        clearAllStorage(category, grade, userId);
        initializeData();
      },
      // Force refresh
      forceRefresh: () => {
        setSessionTemplates(new Set());
        storeSessionTemplates(category, grade, userId, new Set());
        generateProblems();
      }
    };
  };

  return {
    problems,
    usedCombinations,
    templateUsage,
    sessionUsedTemplates: sessionTemplates,
    sessionId,
    isGenerating,
    generationSource,
    generationErrors,
    generateProblems,
    getGenerationStats
  };
}
