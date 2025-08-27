// Service für parametrisierte Template-Verarbeitung und Rendering
import { supabase } from '@/integrations/supabase/client';
import { CurriculumParameterGenerator, CurriculumTemplate } from '@/utils/templates/CurriculumParameterGenerator';
import { SelectionQuestion, TextInputQuestion, MultipleChoiceQuestion } from '@/types/questionTypes';

interface TemplateWithParameters {
  id: string;
  student_prompt: string;
  solution: string;
  distractors: any; // JSON array from Supabase
  explanation_teacher: string;
  question_type: string;
  domain: string;
  subcategory: string;
  difficulty: string;
  grade: number;
  quarter_app: string;
  is_parametrized: boolean;
  parameter_definitions: any; // JSON object from Supabase
  curriculum_rules: any; // JSON object from Supabase
}

export interface ParametrizedQuestionResult {
  questions: SelectionQuestion[];
  source: 'parametrized-templates' | 'fallback';
  sessionId: string;
  qualityMetrics: {
    parametrizedCount: number;
    curriculumCompliance: number;
    uniquenessScore: number;
  };
}

export class ParametrizedTemplateService {
  private static instance: ParametrizedTemplateService;
  private usedCombinations = new Set<string>();

  static getInstance(): ParametrizedTemplateService {
    if (!ParametrizedTemplateService.instance) {
      ParametrizedTemplateService.instance = new ParametrizedTemplateService();
    }
    return ParametrizedTemplateService.instance;
  }

  /**
   * Generiere parametrisierte Fragen für eine Klassenstufe
   */
  async generateParametrizedQuestions(
    category: string,
    grade: number,
    quarter: string,
    totalQuestions: number = 5,
    userId?: string
  ): Promise<ParametrizedQuestionResult> {
    const sessionId = `pts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🎯 Generiere ${totalQuestions} parametrisierte Fragen für ${category} Klasse ${grade} ${quarter}`);

    try {
      // 1. Lade parametrisierte Templates aus Datenbank
      const templates = await this.fetchParametrizedTemplates(category, grade, quarter);
      
      if (templates.length === 0) {
        console.warn(`⚠️ Keine parametrisierten Templates für ${category} Klasse ${grade} ${quarter} gefunden`);
        return {
          questions: [],
          source: 'fallback',
          sessionId,
          qualityMetrics: {
            parametrizedCount: 0,
            curriculumCompliance: 0,
            uniquenessScore: 0
          }
        };
      }

      console.log(`📚 Gefunden: ${templates.length} parametrisierte Templates`);

      // 2. Generiere Fragen aus Templates
      const questions: SelectionQuestion[] = [];
      let parametrizedCount = 0;
      let curriculumCompliantCount = 0;

      for (let i = 0; i < totalQuestions && templates.length > 0; i++) {
        // Round-robin durch Templates für Diversität
        const template = templates[i % templates.length];
        
        const question = await this.renderParametrizedTemplate(template, grade, quarter);
        if (question) {
          questions.push(question);
          parametrizedCount++;
          curriculumCompliantCount++; // Parametrisierte Templates sind per Definition curriculum-compliant
        }
      }

      // 3. Berechne Quality Metrics
      const uniquenessScore = this.calculateUniquenessScore(questions);
      const curriculumCompliance = curriculumCompliantCount / Math.max(1, questions.length);

      console.log(`✅ Generiert: ${questions.length} parametrisierte Fragen`);

      return {
        questions,
        source: 'parametrized-templates',
        sessionId,
        qualityMetrics: {
          parametrizedCount,
          curriculumCompliance,
          uniquenessScore
        }
      };
    } catch (error) {
      console.error('❌ Fehler bei parametrisierter Fragengeneration:', error);
      return {
        questions: [],
        source: 'fallback',
        sessionId,
        qualityMetrics: {
          parametrizedCount: 0,
          curriculumCompliance: 0,
          uniquenessScore: 0
        }
      };
    }
  }

  /**
   * Lade parametrisierte Templates aus Datenbank
   */
  private async fetchParametrizedTemplates(
    category: string,
    grade: number,
    quarter: string
  ): Promise<TemplateWithParameters[]> {
    try {
      let query = supabase
        .from('templates')
        .select('*')
        .eq('is_parametrized', true)
        .eq('status', 'ACTIVE')
        .gte('grade', Math.max(1, grade - 1))
        .lte('grade', Math.min(10, grade + 1))
        .order('created_at', { ascending: false })
        .limit(50);

      // Filter nach Kategorie (Domain-Mapping)
      if (category.toLowerCase() !== 'general') {
        const domainFilters = this.getCategoryDomainFilters(category);
        if (domainFilters.length > 0) {
          query = query.in('domain', domainFilters);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const templates = (data || []).filter((template: any) => {
        // Zusätzliche Validierung für Parametrisierung
        return template.parameter_definitions && 
               typeof template.parameter_definitions === 'object' &&
               template.curriculum_rules &&
               typeof template.curriculum_rules === 'object' &&
               template.student_prompt?.includes('{');
      });

      console.log(`📊 Gefiltert: ${templates.length} parametrisierte Templates`);
      return templates.map(t => ({
        id: t.id,
        student_prompt: String(t.student_prompt || ''),
        solution: String(t.solution || ''),
        distractors: Array.isArray(t.distractors) ? t.distractors : [],
        explanation_teacher: String(t.explanation_teacher || ''),
        question_type: String(t.question_type || 'multiple-choice'),
        domain: String(t.domain || ''),
        subcategory: String(t.subcategory || ''),
        difficulty: String(t.difficulty || 'AFB I'),
        grade: Number(t.grade || 1),
        quarter_app: String(t.quarter_app || 'Q1'),
        is_parametrized: Boolean(t.is_parametrized),
        parameter_definitions: typeof t.parameter_definitions === 'object' ? t.parameter_definitions : {},
        curriculum_rules: typeof t.curriculum_rules === 'object' ? t.curriculum_rules : {}
      } as TemplateWithParameters));
    } catch (error) {
      console.error('❌ Fehler beim Laden parametrisierter Templates:', error);
      return [];
    }
  }

  /**
   * Rendere Template mit generierten Parametern
   */
  private async renderParametrizedTemplate(
    template: TemplateWithParameters,
    grade: number,
    quarter: string
  ): Promise<SelectionQuestion | null> {
    try {
      // Generiere Parameter basierend auf Curriculum
      const paramResult = await CurriculumParameterGenerator.generateCurriculumParameters(
        {
          parameter_definitions: template.parameter_definitions || {},
          curriculum_rules: template.curriculum_rules || {}
        },
        grade,
        quarter,
        this.usedCombinations
      );

      if (!paramResult.isValid || !paramResult.curriculumCompliant) {
        console.warn(`⚠️ Parameter-Generation für Template ${template.id} fehlgeschlagen:`, paramResult.errors);
        return null;
      }

      const { parameters } = paramResult;
      
      // Filter out drawing/sketching questions  
      const prompt = template.student_prompt || "";
      if (this.containsDrawingInstructions(prompt)) {
        console.log(`🚫 Filtered parametrized drawing question: ${prompt.substring(0, 50)}...`);
        return null;
      }

      // Ersetze Platzhalter in Template
      const renderedPrompt = this.replacePlaceholders(template.student_prompt, parameters);
      const renderedSolution = this.replacePlaceholders(template.solution, parameters);
      const distractors = Array.isArray(template.distractors) ? template.distractors.map(d => String(d)) : [];
      const renderedDistractors = distractors.map(d => this.replacePlaceholders(d, parameters));

      // Erstelle Question basierend auf Typ
      const baseQuestion = {
        id: Date.now() + Math.random(),
        question: renderedPrompt,
        type: this.mapDomainToSubject(template.domain),
        explanation: template.explanation_teacher || ""
      };

      if (template.question_type === 'text-input') {
        return {
          ...baseQuestion,
          questionType: 'text-input',
          answer: renderedSolution
        } as TextInputQuestion;
      } else {
        // Multiple Choice mit gerenderter Lösung und Distractors
        const allOptions = [renderedSolution, ...renderedDistractors.slice(0, 3)];
        const shuffledOptions = this.shuffleArray(allOptions);
        const correctIndex = shuffledOptions.indexOf(renderedSolution);

        return {
          ...baseQuestion,
          questionType: 'multiple-choice',
          options: shuffledOptions,
          correctAnswer: correctIndex
        } as MultipleChoiceQuestion;
      }
    } catch (error) {
      console.error(`❌ Fehler beim Rendern von Template ${template.id}:`, error);
      return null;
    }
  }

  /**
   * Ersetze Platzhalter in Template-String
   */
  private replacePlaceholders(template: string, parameters: Record<string, any>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value.toString());
    }
    
    return result;
  }

  /**
   * Berechne Eindeutigkeits-Score basierend auf generierten Fragen
   */
  private calculateUniquenessScore(questions: SelectionQuestion[]): number {
    if (questions.length === 0) return 0;

    const questionTexts = new Set(questions.map(q => q.question));
    return questionTexts.size / questions.length;
  }

  /**
   * Kategorie zu Domain-Filter Mapping
   */
  private getCategoryDomainFilters(category: string): string[] {
    const categoryMap: Record<string, string[]> = {
      'mathematik': ['Zahlen & Operationen', 'Raum & Form', 'Größen & Messen', 'Gleichungen & Funktionen', 'Daten & Zufall'],
      'math': ['Zahlen & Operationen', 'Raum & Form', 'Größen & Messen', 'Gleichungen & Funktionen', 'Daten & Zufall'],
      'deutsch': ['Sprache', 'Lesen', 'Schreiben', 'Grammatik'],
      'german': ['Sprache', 'Lesen', 'Schreiben', 'Grammatik']
    };

    return categoryMap[category.toLowerCase()] || [];
  }

  /**
   * Domain zu Subject Mapping für Question-Typ
   */
  private mapDomainToSubject(domain: string): 'math' | 'german' | 'english' | 'geography' | 'history' | 'physics' | 'biology' | 'chemistry' | 'latin' {
    const lowerDomain = domain?.toLowerCase() || '';
    if (lowerDomain.includes('zahlen') || lowerDomain.includes('raum') || lowerDomain.includes('größen') || lowerDomain.includes('gleichungen') || lowerDomain.includes('daten')) return 'math';
    if (lowerDomain.includes('sprache') || lowerDomain.includes('deutsch') || lowerDomain.includes('lesen') || lowerDomain.includes('schreiben')) return 'german';
    if (lowerDomain.includes('englisch') || lowerDomain.includes('english')) return 'english';
    if (lowerDomain.includes('geographie') || lowerDomain.includes('geography')) return 'geography';
    if (lowerDomain.includes('geschichte') || lowerDomain.includes('history')) return 'history';
    if (lowerDomain.includes('physik') || lowerDomain.includes('physics')) return 'physics';
    if (lowerDomain.includes('biologie') || lowerDomain.includes('biology')) return 'biology';
    if (lowerDomain.includes('chemie') || lowerDomain.includes('chemistry')) return 'chemistry';
    if (lowerDomain.includes('latein') || lowerDomain.includes('latin')) return 'latin';
    return 'math'; // Default fallback
  }

  /**
   * Array shuffeln für Multiple Choice Optionen
   */
  private shuffleArray(array: any[]): any[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Check if question contains drawing/sketching instructions
   */
  private containsDrawingInstructions(prompt: string): boolean {
    const drawingKeywords = [
      'zeichne', 'zeichnet', 'zeichnen',
      'male', 'malt', 'malen', 
      'skizziere', 'skizziert', 'skizzieren',
      'draw', 'drawing', 'sketch',
      'konstruiere', 'konstruiert', 'konstruieren'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    return drawingKeywords.some(keyword => lowerPrompt.includes(keyword));
  }
  resetSession(): void {
    this.usedCombinations.clear();
  }
}