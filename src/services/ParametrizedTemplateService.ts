// Service für parametrisierte Template-Verarbeitung und Rendering
import { supabase } from '@/integrations/supabase/client';
import { CurriculumParameterGenerator, CurriculumTemplate } from '@/utils/templates/CurriculumParameterGenerator';
import { SelectionQuestion, TextInputQuestion, MultipleChoiceQuestion } from '@/types/questionTypes';

interface TemplateWithParameters {
  id: string;
  student_prompt: string;
  solution: any; // Can be string, object, or map format
  distractors: any; // JSON array from Supabase
  explanation: string;
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
    
    // FIXED: Korrekte Quartal-/Grade-Berechnung
    const targetGrade = Math.max(1, grade - 1); // Nie unter Klasse 1 fallen
    const targetQuarter = this.getPreviousQuarter(quarter); // Q1 -> Q4 vom Vorjahr
    
    console.log(`🎯 Generiere ${totalQuestions} Fragen: User G${grade}${quarter} -> Ziel G${targetGrade}${targetQuarter}`);

    try {
      // 1. Lade Templates aus ALLEN Domänen für Diversität
      const allTemplates = await this.fetchDiverseTemplates(targetGrade, targetQuarter);
      
      if (allTemplates.length === 0) {
        console.warn(`⚠️ Keine Templates für G${targetGrade}${targetQuarter} gefunden`);
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

      console.log(`📚 Gefunden: ${allTemplates.length} Templates aus verschiedenen Domänen`);

      // 2. Generiere diverse Fragen
      const questions: SelectionQuestion[] = [];
      const usedDomains = new Set<string>();
      let parametrizedCount = 0;
      let curriculumCompliantCount = 0;

      // Durchmische Templates für maximale Diversität
      const shuffledTemplates = this.shuffleArray([...allTemplates]);

      for (let i = 0; i < totalQuestions && shuffledTemplates.length > 0; i++) {
        // Priorisiere neue Domänen für Abwechslung
        let selectedTemplate = shuffledTemplates[i % shuffledTemplates.length];
        
        // Versuche eine andere Domäne zu finden falls möglich
        if (usedDomains.has(selectedTemplate.domain) && shuffledTemplates.length > usedDomains.size) {
          const unusedTemplate = shuffledTemplates.find(t => !usedDomains.has(t.domain));
          if (unusedTemplate) selectedTemplate = unusedTemplate;
        }
        
        const question = await this.renderTemplate(selectedTemplate, targetGrade, targetQuarter);
        if (question) {
          questions.push(question);
          usedDomains.add(selectedTemplate.domain);
          parametrizedCount++;
          curriculumCompliantCount++;
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
   * Lade diverse Templates aus ALLEN Domänen für Abwechslung
   */
  private async fetchDiverseTemplates(
    grade: number,
    quarter: string
  ): Promise<TemplateWithParameters[]> {
    try {
      console.log(`🎯 Fetching diverse templates for Grade ${grade} ${quarter}`);
      
      // Define domains and their target counts for balanced selection
      const domainTargets = [
        { domain: 'Zahlen & Operationen', count: 4 },
        { domain: 'Raum & Form', count: 3 },
        { domain: 'Größen & Messen', count: 3 },
        { domain: 'Daten & Zufall', count: 2 }
      ];
      
      const allTemplates: any[] = [];
      let totalFetched = 0;
      
      // First, try to get templates from each domain
      for (const { domain, count } of domainTargets) {
        const { data: domainTemplates, error } = await supabase
          .from('templates')
          .select('*')
          .eq('grade', grade)
          .eq('quarter_app', quarter)
          .eq('domain', domain)
          .eq('status', 'ACTIVE')
          .limit(count);

        if (error) {
          console.error(`Error fetching templates for domain ${domain}:`, error);
          continue;
        }

        if (domainTemplates && domainTemplates.length > 0) {
          console.log(`✅ Found ${domainTemplates.length} templates for domain: ${domain}`);
          allTemplates.push(...domainTemplates);
          totalFetched += domainTemplates.length;
        } else {
          console.log(`⚠️ No templates found for domain: ${domain}`);
        }
      }

      // If we don't have enough templates, fetch more without domain restriction
      if (totalFetched < 8) {
        console.log(`🔄 Need more templates (have ${totalFetched}), fetching additional without domain filter...`);
        
        const { data: additionalTemplates, error } = await supabase
          .from('templates')
          .select('*')
          .eq('grade', grade)
          .eq('quarter_app', quarter)
          .eq('status', 'ACTIVE')
          .limit(12 - totalFetched);

        if (additionalTemplates && !error) {
          // Filter out duplicates
          const existingIds = new Set(allTemplates.map(t => t.id));
          const newTemplates = additionalTemplates.filter(t => !existingIds.has(t.id));
          allTemplates.push(...newTemplates);
          totalFetched += newTemplates.length;
          console.log(`✅ Added ${newTemplates.length} additional templates`);
        }

        // Second-level fallback: drop quarter filter if still not enough
        if (allTemplates.length < 8) {
          console.log(`🔄 Still low (${allTemplates.length}), fetching by grade only (no quarter filter)...`);
          const { data: additionalAny, error: errorAny } = await supabase
            .from('templates')
            .select('*')
            .eq('grade', grade)
            .eq('status', 'ACTIVE')
            .limit(12 - allTemplates.length);

          if (additionalAny && !errorAny) {
            const existingIds2 = new Set(allTemplates.map(t => t.id));
            const newTemplates2 = additionalAny.filter(t => !existingIds2.has(t.id));
            allTemplates.push(...newTemplates2);
            console.log(`✅ Added ${newTemplates2.length} additional templates (no quarter filter)`);
          }
        }
      }

      console.log(`📊 Total templates fetched: ${allTemplates.length}`);
      
      // Log domain distribution for debugging
      const domainCounts = allTemplates.reduce((acc, template) => {
        acc[template.domain] = (acc[template.domain] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('🏷️ Domain distribution:', domainCounts);
      
      return allTemplates.map(t => ({
        id: t.id,
        student_prompt: String(t.student_prompt || ''),
        solution: t.solution, // FIXED: Behalte Original-Objekt-Struktur
        distractors: Array.isArray(t.distractors) ? t.distractors : [],
        explanation: String(t.explanation || ''),
        question_type: String(t.question_type || 'multiple-choice'),
        domain: String(t.domain || ''),
        subcategory: String(t.subcategory || ''),
        difficulty: String(t.difficulty || 'easy'),
        grade: Number(t.grade || 1),
        quarter_app: String(t.quarter_app || 'Q1'),
        is_parametrized: Boolean(t.is_parametrized),
        parameter_definitions: typeof t.parameter_definitions === 'object' ? t.parameter_definitions : {},
        curriculum_rules: typeof t.curriculum_rules === 'object' ? t.curriculum_rules : {}
      } as TemplateWithParameters));
    } catch (error) {
      console.error('❌ Fehler beim Laden diverser Templates:', error);
      return [];
    }
  }

  /**
   * Rendere Template (parametrisiert oder normal)
   */
  private async renderTemplate(
    template: TemplateWithParameters,
    grade: number,
    quarter: string
  ): Promise<SelectionQuestion | null> {
    try {
      // Filter out drawing/sketching questions  
      const prompt = template.student_prompt || "";
      if (this.containsDrawingInstructions(prompt)) {
        console.log(`🚫 Filtered drawing question: ${prompt.substring(0, 50)}...`);
        return null;
      }

      let renderedPrompt = template.student_prompt;
      let renderedSolution = template.solution;
      let renderedDistractors: string[] = [];

      // Falls parametrisiertes Template
      if (template.is_parametrized && template.parameter_definitions && Object.keys(template.parameter_definitions).length > 0) {
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
        
        // Ersetze Platzhalter mit Parametern
        renderedPrompt = this.replacePlaceholders(template.student_prompt, parameters);
        renderedSolution = this.extractSolutionValue(template.solution, parameters);
        
        const distractors = Array.isArray(template.distractors) ? template.distractors.map(d => String(d)) : [];
        renderedDistractors = distractors.map(d => this.replacePlaceholders(d, parameters));
      } else {
        // Normales Template - extrahiere Lösung direkt
        renderedSolution = this.extractSolutionValue(template.solution, {});
        renderedDistractors = Array.isArray(template.distractors) ? template.distractors.map(d => String(d)) : [];
      }

      // Erstelle Question basierend auf Typ
      const baseQuestion = {
        id: Date.now() + Math.random(),
        question: renderedPrompt,
        type: this.mapDomainToSubject(template.domain),
        explanation: template.explanation || ""
      };

      if (template.question_type === 'text-input') {
        return {
          ...baseQuestion,
          questionType: 'text-input',
          answer: renderedSolution
        } as TextInputQuestion;
      } else {
        // Multiple Choice mit korrekter Lösung und Distractors
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
   * Extrahiere korrekten Lösungswert aus verschiedenen Formaten - COMPLETELY FIXED
   */
  private extractSolutionValue(solution: any, parameters: Record<string, any>): string {
    console.log('🔍 PHASE 3: Extracting solution from:', solution, typeof solution);
    
    // Falls solution bereits ein String ist
    if (typeof solution === 'string') {
      // CRITICAL FIX: Prüfe auf "map[value:...]" Format aus der Datenbank
      const mapMatch = solution.match(/map\[value:(.+?)\]/);
      if (mapMatch) {
        let extractedValue = mapMatch[1];
        console.log('✅ Extracted value from map format:', extractedValue);
        return this.replacePlaceholders(extractedValue, parameters);
      }
      // Ansonsten normal Platzhalter ersetzen
      return this.replacePlaceholders(solution, parameters);
    }
    
    // Falls solution ein Objekt ist
    if (typeof solution === 'object' && solution !== null) {
      // Standard format: {"value": "6,25"}
      if (solution.value !== undefined) {
        let value = String(solution.value);
        console.log('✅ PHASE 3: Extracted solution.value:', value);
        return this.replacePlaceholders(value, parameters);
      }
      
      // Direct JSON number
      if (typeof solution === 'number') {
        return String(solution);
      }
      
      // Fallback für unbekannte Objekt-Struktur - prüfe alle Keys
      console.warn('⚠️ Unknown object solution structure:', solution);
      const keys = Object.keys(solution);
      for (const key of keys) {
        const val = solution[key];
        if (typeof val === 'string' || typeof val === 'number') {
          console.log('✅ Found fallback value in key', key, ':', val);
          return this.replacePlaceholders(String(val), parameters);
        }
      }
      
      return JSON.stringify(solution);
    }
    
    // Direct number
    if (typeof solution === 'number') {
      return String(solution);
    }
    
    console.error('❌ PHASE 3: Failed to extract solution from:', solution, typeof solution);
    return String(solution || '0');
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
      'konstruiere', 'konstruiert', 'konstruieren',
      'entwirf', 'entwirft', 'entwerfen',
      'bild', 'bilder', 'abbildung',
      'ordne', 'ordnet', 'ordnen', 'zuordnen',
      'verbind', 'verbindet', 'verbinden',
      'netz', 'netze', 'körper',
      'diagramm', 'graph', 'graphen',
      'tabelle passt', 'welches bild'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    return drawingKeywords.some(keyword => lowerPrompt.includes(keyword));
  }
  /**
   * Berechne vorheriges Quartal (Q1 -> Q4, Q2 -> Q1, etc.)
   */
  private getPreviousQuarter(quarter: string): string {
    const quarterMap: Record<string, string> = {
      'Q1': 'Q4',
      'Q2': 'Q1', 
      'Q3': 'Q2',
      'Q4': 'Q3'
    };
    return quarterMap[quarter] || 'Q4';
  }

  resetSession(): void {
    this.usedCombinations.clear();
  }
}