// Phase 2: Balanced template selection with quality filtering
import { useState, useCallback } from 'react';
import { SelectionQuestion } from '@/types/questionTypes';
import { supabase } from '@/lib/supabase';
import { parseTemplateContentUniversal } from '../utils/templates/universalTemplateParser';
import { EnhancedFallbackGenerator } from '@/utils/templates/enhancedFallbackGenerator';

interface TemplateSelectionConfig {
  qualityThreshold: number;
  diversityWeight: number;
  usageBalancing: boolean;
  sessionTracking: boolean;
}

interface SessionState {
  usedCategories: Set<string>;
  usedTypes: Set<string>;
  templateUsage: Map<string, number>;
  qualityDistribution: Map<string, number>;
}

export function useBalancedTemplateSelection(
  category: string,
  grade: number,
  userId: string,
  totalQuestions: number = 5,
  config: Partial<TemplateSelectionConfig> = {}
) {
  const [problems, setProblems] = useState<SelectionQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<'template' | 'ai' | 'fallback' | null>(null);
  const [sessionId] = useState(() => `balanced_${Date.now()}_${Math.random()}`);
  const [sessionState, setSessionState] = useState<SessionState>({
    usedCategories: new Set(),
    usedTypes: new Set(),
    templateUsage: new Map(),
    qualityDistribution: new Map()
  });

  const defaultConfig: TemplateSelectionConfig = {
    qualityThreshold: 0.7,
    diversityWeight: 0.3,
    usageBalancing: true,
    sessionTracking: true,
    ...config
  };

  // Phase 2: Enhanced template loading with quality filtering
  const loadHighQualityTemplates = async (): Promise<any[]> => {
    console.log('🎯 Loading high-quality templates with filters');
    console.log(`📊 Quality threshold: ${defaultConfig.qualityThreshold}`);
    
    try {
      // Comprehensive category variations for better template discovery
      const categoryVariations = [
        category,
        category.toLowerCase(),
        category.toUpperCase(),
        category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(),
        'Mathematik', 'math', 'MATH', 'Mathe', 'mathematics', 'Math',
        'Deutsch', 'german', 'GERMAN', 'Sprache', 'Language', 'German',
        'deutsch', 'grammatik', 'rechtschreibung'
      ].filter((v, i, arr) => arr.indexOf(v) === i); // Remove duplicates

      // Enhanced query with more aggressive template loading
      const { data: templates, error } = await supabase
        .from('templates')
        .select('*')
        .in('domain', categoryVariations)
        .eq('grade', grade)
        .eq('status', 'ACTIVE')
        .gte('plays', 5) // Use plays as minimum usage indicator
        .order('plays', { ascending: false })
        .order('plays', { ascending: true }) // Prefer less-used templates
        .limit(100); // Load many more templates for better selection

      if (error) {
        console.error('❌ Database error:', error);
        return [];
      }

      console.log(`📈 Quality-filtered templates: ${templates?.length || 0} found`);
      
      if (templates && templates.length > 0) {
        const qualityStats = analyzeQualityDistribution(templates);
        console.log('📊 Quality distribution:', qualityStats);
      }

      return templates || [];
    } catch (error) {
      console.error('❌ Error loading templates:', error);
      return [];
    }
  };

  // Quality analysis helper
  const analyzeQualityDistribution = (templates: any[]) => {
    const distribution = { high: 0, medium: 0, low: 0 };
    templates.forEach(t => {
      const score = t.rating_count > 0 ? t.rating_sum / t.rating_count : 0;
      if (score >= 0.8) distribution.high++;
      else if (score >= 0.6) distribution.medium++;
      else distribution.low++;
    });
    return distribution;
  };

  // Phase 2: Intelligent template selection with diversity
  const selectDiverseTemplates = (templates: any[]): any[] => {
    console.log('🎲 Applying diversity selection algorithm');
    
    if (templates.length <= totalQuestions) {
      return templates;
    }

    const selected: any[] = [];
    const typeTracker = new Map<string, number>();
    const qualityTiers = groupByQuality(templates);
    
    // Strategy: Ensure type diversity while maintaining quality
    for (let i = 0; i < totalQuestions; i++) {
      let bestTemplate: any = null;
      let bestScore = -1;

      for (const template of templates) {
        if (selected.includes(template)) continue;

        const diversityScore = calculateDiversityScore(
          template, 
          selected, 
          typeTracker, 
          sessionState
        );
        
        const qualityScore = template.quality_score || 0;
        const usageScore = 1 / (1 + (template.usage_count || 0)); // Prefer less-used
        
        const combinedScore = 
          qualityScore * 0.4 + 
          diversityScore * defaultConfig.diversityWeight + 
          usageScore * 0.3;

        if (combinedScore > bestScore) {
          bestScore = combinedScore;
          bestTemplate = template;
        }
      }

      if (bestTemplate) {
        selected.push(bestTemplate);
        const type = bestTemplate.question_type || 'text-input';
        typeTracker.set(type, (typeTracker.get(type) || 0) + 1);
      }
    }

    console.log(`✅ Selected ${selected.length} diverse templates`);
    console.log('📊 Type distribution:', Object.fromEntries(typeTracker));
    
    return selected;
  };

  const groupByQuality = (templates: any[]) => {
    return {
      high: templates.filter(t => (t.quality_score || 0) >= 0.8),
      medium: templates.filter(t => (t.quality_score || 0) >= 0.6 && (t.quality_score || 0) < 0.8),
      low: templates.filter(t => (t.quality_score || 0) < 0.6)
    };
  };

  const calculateDiversityScore = (
    template: any,
    selected: any[],
    typeTracker: Map<string, number>,
    sessionState: SessionState
  ): number => {
    const templateType = template.question_type || 'text-input';
    const currentTypeCount = typeTracker.get(templateType) || 0;
    const sessionTypeCount = sessionState.usedTypes.has(templateType) ? 1 : 0;
    
    // Encourage type diversity
    const typeDiversityScore = Math.max(0, 1 - (currentTypeCount * 0.3) - (sessionTypeCount * 0.2));
    
    // Consider content similarity (basic implementation)
    const contentSimilarity = calculateContentSimilarity(template, selected);
    const contentDiversityScore = Math.max(0, 1 - contentSimilarity);
    
    return (typeDiversityScore + contentDiversityScore) / 2;
  };

  const calculateContentSimilarity = (template: any, selected: any[]): number => {
    if (selected.length === 0) return 0;
    
    const templateTopics = extractTopics(template.content || '');
    let maxSimilarity = 0;
    
    for (const selectedTemplate of selected) {
      const selectedTopics = extractTopics(selectedTemplate.content || '');
      const similarity = topicSimilarity(templateTopics, selectedTopics);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
    return maxSimilarity;
  };

  const extractTopics = (content: string): Set<string> => {
    const topics = new Set<string>();
    const mathTopics = ['addition', 'subtraktion', 'multiplikation', 'division', 'geometrie', 'bruch'];
    const germanTopics = ['rechtschreibung', 'grammatik', 'wortart', 'satzbau'];
    
    const allTopics = [...mathTopics, ...germanTopics];
    const contentLower = content.toLowerCase();
    
    allTopics.forEach(topic => {
      if (contentLower.includes(topic)) {
        topics.add(topic);
      }
    });
    
    return topics;
  };

  const topicSimilarity = (topics1: Set<string>, topics2: Set<string>): number => {
    if (topics1.size === 0 && topics2.size === 0) return 0;
    if (topics1.size === 0 || topics2.size === 0) return 0;
    
    const intersection = new Set([...topics1].filter(t => topics2.has(t)));
    const union = new Set([...topics1, ...topics2]);
    
    return intersection.size / union.size;
  };

  // Enhanced parsing with validation
  const parseAndValidateTemplates = (templates: any[]): SelectionQuestion[] => {
    console.log('🔧 Parsing and validating templates with enhanced logic');
    
    const questions: SelectionQuestion[] = [];
    const parseErrors: string[] = [];
    
    for (const template of templates) {
      try {
        const result = parseTemplateWithFallback(template);
        
        if (result.success && validateQuestionQuality(result.question)) {
          questions.push(result.question);
          
          // Update session tracking
          if (defaultConfig.sessionTracking) {
            updateSessionState(template, result.question);
          }
        } else {
          parseErrors.push(`Template ${template.id}: ${result.error || 'Quality validation failed'}`);
        }
      } catch (error) {
        parseErrors.push(`Template ${template.id}: Parse exception - ${error}`);
      }
    }
    
    if (parseErrors.length > 0) {
      console.warn(`⚠️ Template parsing issues: ${parseErrors.length}/${templates.length}`);
      console.warn('First few errors:', parseErrors.slice(0, 3));
    }
    
    console.log(`✅ Successfully parsed ${questions.length}/${templates.length} templates`);
    return questions;
  };

  const parseTemplateWithFallback = (template: any): { success: boolean; question?: SelectionQuestion; error?: string } => {
    try {
      // Use universal parser
      const parseResult = parseTemplateContentUniversal(template);
      if (parseResult.success) {
        const questionType = (parseResult.questionType as "text-input" | "multiple-choice" | "word-selection" | "drag-drop" | "matching") || 'text-input';
        return {
          success: true,
          question: questionType === 'multiple-choice' ? {
            id: Math.floor(Math.random() * 1000000),
            question: parseResult.questionText!,
            questionType: 'multiple-choice',
            explanation: parseResult.explanation!,
            type: template.category === 'Mathematik' ? 'math' : 'german',
            options: parseResult.options || [],
            correctAnswer: parseResult.correctAnswer || 0
          } : {
            id: Math.floor(Math.random() * 1000000),
            question: parseResult.questionText!,
            questionType: 'text-input',
            explanation: parseResult.explanation!,
            type: template.category === 'Mathematik' ? 'math' : 'german',
            answer: parseResult.answerValue || ''
          }
        };
      } else {
        console.warn(`Failed to parse template ${template.id}: ${parseResult.error}`);
        return { success: false, error: parseResult.error };
      }
      
      // Strategy 2: Math expression parsing - now more aggressive
      const mathResult = parseMathExpression(template.content);
      if (mathResult.success) {
        return {
          success: true,
          question: createMathQuestion(template, mathResult.question, mathResult.answer)
        };
      }
      
      // Strategy 3: Pattern-based parsing
      const patternResult = parseWithPatterns(template);
      if (patternResult.success) {
        return patternResult;
      }
      
      // Strategy 4: Extract question from raw content (never fail)
      const extractedResult = extractQuestionFromRawContent(template);
      return {
        success: true,
        question: extractedResult
      };
      
    } catch (error) {
      // Final fallback - never let templates fail completely
      const extractedResult = extractQuestionFromRawContent(template);
      return {
        success: true,
        question: extractedResult
      };
    }
  };

  const parseMathExpression = (content: string): { success: boolean; question?: string; answer?: string } => {
    // More comprehensive math parsing
    const patterns = [
      /(.+?)=\s*\?/,
      /(.+?)\s*\?\s*$/,
      /berechne[:\s]*(.+)/i,
      /ergebnis[:\s]*(.+)/i,
      /was ist\s*(.+?)\?/i,
      /löse[:\s]*(.+)/i,
      /wie viel ist\s*(.+?)\?/i,
      /(.+?)\s*=\s*$/,
      // Roman numerals
      /(.+?[IVX]+.+?[IVX]+)/,
      // Simple math expressions
      /(\d+\s*[+\-*/÷×:]\s*\d+)/
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        try {
          let expression = match[1].trim();
          
          // Handle Roman numerals
          if (/[IVX]/.test(expression)) {
            const romanResult = parseRomanMath(expression);
            if (romanResult.success) {
              return {
                success: true,
                question: content,
                answer: romanResult.answer
              };
            }
          }
          
          // Use safe math evaluator instead of eval
          const { safeMathEvaluate } = await import('@/utils/safeMathEvaluator');
          const result = safeMathEvaluate(expression);
          
          if (result !== null) {
            const answer = Number.isInteger(result) ? result.toString() : result.toFixed(2);
            
            return {
              success: true,
              question: content,
              answer
            };
          }
        } catch (evalError) {
          continue;
        }
      }
    }
    
    return { success: false };
  };

  const parseRomanMath = (expression: string): { success: boolean; answer?: string } => {
    try {
      const romanToDecimal = (roman: string): number => {
        const romanNumerals: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
        let result = 0;
        for (let i = 0; i < roman.length; i++) {
          const current = romanNumerals[roman[i]];
          const next = romanNumerals[roman[i + 1]];
          if (next && current < next) {
            result += next - current;
            i++;
          } else {
            result += current;
          }
        }
        return result;
      };

      const decimalToRoman = (num: number): string => {
        const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
        const symbols = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
        let result = '';
        for (let i = 0; i < values.length; i++) {
          while (num >= values[i]) {
            result += symbols[i];
            num -= values[i];
          }
        }
        return result;
      };

      const romanPattern = /([IVX]+)\s*([+\-])\s*([IVX]+)/;
      const match = expression.match(romanPattern);
      
      if (match) {
        const num1 = romanToDecimal(match[1]);
        const operator = match[2];
        const num2 = romanToDecimal(match[3]);
        
        let result: number;
        if (operator === '+') {
          result = num1 + num2;
        } else if (operator === '-') {
          result = num1 - num2;
        } else {
          return { success: false };
        }
        
        return {
          success: true,
          answer: decimalToRoman(result)
        };
      }
      
      return { success: false };
    } catch (error) {
      return { success: false };
    }
  };

  const parseWithPatterns = (template: any): { success: boolean; question?: SelectionQuestion; error?: string } => {
    const content = template.content;
    
    // More comprehensive answer patterns
    const answerPatterns = [
      /antwort[:\s]*([^.!?\n]*)/i,
      /lösung[:\s]*([^.!?\n]*)/i,
      /richtig[:\s]*([^.!?\n]*)/i,
      /ergebnis[:\s]*([^.!?\n]*)/i,
      /korrekt[:\s]*([^.!?\n]*)/i,
      /antworten[:\s]*\[([^\]]+)\]/i, // Array format
      /optionen[:\s]*\[([^\]]+)\]/i,
      /auswahl[:\s]*([^.!?\n]*)/i
    ];
    
    for (const pattern of answerPatterns) {
      const match = content.match(pattern);
      if (match && match[1].trim()) {
        return {
          success: true,
          question: createTextInputQuestion(template, content, match[1].trim())
        };
      }
    }
    
    return { success: false, error: 'No pattern matched' };
  };

  // New function: Never let a template fail completely
  const extractQuestionFromRawContent = (template: any): SelectionQuestion => {
    const content = template.content || '';
    const lines = content.split('\n').filter(line => line.trim());
    
    // Try to find a question-like line
    let questionText = lines.find(line => 
      line.includes('?') || 
      line.toLowerCase().includes('was ist') ||
      line.toLowerCase().includes('berechne') ||
      line.toLowerCase().includes('löse')
    ) || lines[0] || 'Aufgabe';
    
    // Try to extract or generate an answer
    let answer = 'Antwort';
    
    // Look for obvious answer patterns
    const answerLine = lines.find(line => 
      line.toLowerCase().includes('antwort') ||
      line.toLowerCase().includes('lösung') ||
      /^\d+$/.test(line.trim()) ||
      /^[a-zA-Z]$/.test(line.trim())
    );
    
    if (answerLine) {
      const answerMatch = answerLine.match(/(?:antwort|lösung)[:\s]*([^.!?\n]*)/i);
      if (answerMatch) {
        answer = answerMatch[1].trim();
      } else if (/^\d+$/.test(answerLine.trim())) {
        answer = answerLine.trim();
      }
    }
    
    // For math problems, try to calculate if possible
    if (questionText.includes('=') || /\d+\s*[+\-*/]\s*\d+/.test(questionText)) {
      const mathResult = parseMathExpression(questionText);
      if (mathResult.success && mathResult.answer) {
        answer = mathResult.answer;
      }
    }
    
    return {
      id: Math.floor(Math.random() * 1000000),
      questionType: 'text-input',
      question: questionText,
      answer,
      type: categorizeQuestionType(template.category || ''),
      explanation: `Die Antwort ist: ${answer}`
    };
  };

  const createQuestionFromParsed = (template: any, parsed: any): SelectionQuestion => {
    const id = Math.floor(Math.random() * 1000000);
    const questionType = template.question_type || 'text-input';
    
    const baseQuestion = {
      id,
      question: parsed.question,
      type: categorizeQuestionType(template.category),
      explanation: parsed.explanation || `Die Antwort ist: ${parsed.answer || parsed.correctAnswer}`
    };
    
    if (questionType === 'multiple-choice') {
      return {
        ...baseQuestion,
        questionType: 'multiple-choice',
        options: parsed.options || [],
        correctAnswer: parsed.correctAnswer || 0
      };
    } else if (questionType === 'word-selection') {
      return {
        ...baseQuestion,
        questionType: 'word-selection',
        sentence: parsed.sentence || baseQuestion.question,
        selectableWords: parsed.selectableWords || []
      };
    } else {
      return {
        ...baseQuestion,
        questionType: 'text-input',
        answer: String(parsed.answer || parsed.correctAnswer || '')
      };
    }
  };

  const createMathQuestion = (template: any, question: string, answer: string): SelectionQuestion => {
    return {
      id: Math.floor(Math.random() * 1000000),
      questionType: 'text-input',
      question,
      answer,
      type: 'math',
      explanation: `Die Lösung ist: ${answer}`
    };
  };

  const createTextInputQuestion = (template: any, question: string, answer: string): SelectionQuestion => {
    return {
      id: Math.floor(Math.random() * 1000000),
      questionType: 'text-input',
      question,
      answer,
      type: categorizeQuestionType(template.category),
      explanation: `Die Antwort ist: ${answer}`
    };
  };

  const categorizeQuestionType = (category: string): 'math' | 'german' => {
    const categoryLower = category.toLowerCase();
    return (categoryLower.includes('math') || categoryLower.includes('mathematik')) ? 'math' : 'german';
  };

  const validateQuestionQuality = (question: SelectionQuestion): boolean => {
    // Basic quality checks
    if (!question.question || question.question.length < 5) return false;
    if (question.question.length > 500) return false;
    
    if (question.questionType === 'text-input') {
      const textInputQ = question as any;
      if (!textInputQ.answer || textInputQ.answer.includes('fehler')) return false;
    }
    
    if (question.questionType === 'multiple-choice') {
      if (!question.options || question.options.length < 2) return false;
      if (question.correctAnswer < 0 || question.correctAnswer >= question.options.length) return false;
    }
    
    return true;
  };

  const updateSessionState = (template: any, question: SelectionQuestion) => {
    setSessionState(prev => ({
      ...prev,
      usedTypes: new Set([...prev.usedTypes, question.questionType]),
      usedCategories: new Set([...prev.usedCategories, template.category]),
      templateUsage: new Map([...prev.templateUsage, [template.id, (prev.templateUsage.get(template.id) || 0) + 1]]),
      qualityDistribution: new Map([...prev.qualityDistribution, [template.id, template.quality_score || 0]])
    }));
  };

  // Main generation function
  const generateProblems = useCallback(async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    console.log('🚀 Starting balanced template selection');
    
    try {
      // Phase 1: Load high-quality templates
      const templates = await loadHighQualityTemplates();
      
      if (templates.length === 0) {
        console.warn('⚠️ No quality templates found, using enhanced fallback');
        const fallbackProblems = category === 'Mathematik' 
          ? await EnhancedFallbackGenerator.generateMathProblems(grade, totalQuestions)
          : await EnhancedFallbackGenerator.generateGermanProblems(grade, totalQuestions);
        
        setProblems(fallbackProblems);
        setGenerationSource('fallback');
        return;
      }
      
      // Phase 2: Apply intelligent selection
      const selectedTemplates = selectDiverseTemplates(templates);
      
      // Phase 3: Parse and validate
      const questions = parseAndValidateTemplates(selectedTemplates);
      
      if (questions.length >= totalQuestions) {
        setProblems(questions.slice(0, totalQuestions));
        setGenerationSource('template');
        console.log(`✅ Generated ${questions.length} high-quality template questions`);
      } else {
        console.warn(`⚠️ Only ${questions.length}/${totalQuestions} templates parsed successfully`);
        // Fill remaining with enhanced fallback
        const needed = totalQuestions - questions.length;
        const fallbackProblems = category === 'Mathematik'
          ? await EnhancedFallbackGenerator.generateMathProblems(grade, needed)
          : await EnhancedFallbackGenerator.generateGermanProblems(grade, needed);
        
        setProblems([...questions, ...fallbackProblems]);
        setGenerationSource('template');
      }
      
    } catch (error) {
      console.error('❌ Balanced template selection failed:', error);
      // Complete fallback
      const fallbackProblems = category === 'Mathematik'
        ? await EnhancedFallbackGenerator.generateMathProblems(grade, totalQuestions)
        : await EnhancedFallbackGenerator.generateGermanProblems(grade, totalQuestions);
      
      setProblems(fallbackProblems);
      setGenerationSource('fallback');
    } finally {
      setIsGenerating(false);
    }
  }, [category, grade, userId, totalQuestions, isGenerating]);

  return {
    problems,
    isGenerating,
    generationSource,
    sessionId,
    sessionState,
    generateProblems
  };
}