// Parametrized Template Service für Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface ParametrizedTemplate {
  id: string;
  student_prompt: string;
  parameter_definitions: Record<string, any>;
  curriculum_rules: Record<string, any>;
  solution: string;
  distractors: string[];
  question_type: string;
  domain: string;
  grade: number;
  quarter_app: string;
}

export interface RenderedQuestion {
  grade: number;
  subject: string;
  variant: string;
  body: string;
  data: any;
  explanation: string;
  need_image: boolean;
}

export class EdgeParametrizedTemplateService {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Generiere parametrisierte Fragen für Edge Function
   */
  async generateParametrizedQuestions(
    grade: number,
    subject: string,
    count: number = 1
  ): Promise<RenderedQuestion[]> {
    try {
      console.log(`🎯 Edge Function: Generiere ${count} parametrisierte Fragen für ${subject} Klasse ${grade}`);

      // Bestimme Quarter basierend auf aktuellem Datum (vereinfacht)
      const currentMonth = new Date().getMonth() + 1;
      const quarter = this.getQuarterFromMonth(currentMonth);

      // Lade parametrisierte Templates
      const templates = await this.fetchParametrizedTemplates(subject, grade, quarter);
      
      if (templates.length === 0) {
        console.warn(`⚠️ Keine parametrisierten Templates für ${subject} Klasse ${grade} gefunden`);
        return [];
      }

      const questions: RenderedQuestion[] = [];
      
      for (let i = 0; i < count; i++) {
        const template = templates[i % templates.length];
        const question = await this.renderTemplate(template, grade, quarter);
        
        if (question) {
          questions.push(question);
        }
      }

      console.log(`✅ Generiert: ${questions.length} parametrisierte Fragen`);
      return questions;
    } catch (error) {
      console.error('❌ Fehler bei parametrisierter Fragengeneration in Edge Function:', error);
      return [];
    }
  }

  /**
   * Lade parametrisierte Templates aus Datenbank
   */
  private async fetchParametrizedTemplates(
    subject: string,
    grade: number,
    quarter: string
  ): Promise<ParametrizedTemplate[]> {
    try {
      const domainFilters = this.getSubjectDomains(subject);
      
      let query = this.supabase
        .from('templates')
        .select('*')
        .eq('is_parametrized', true)
        .eq('status', 'ACTIVE')
        .gte('grade', Math.max(1, grade - 1))
        .lte('grade', Math.min(10, grade + 1));

      if (domainFilters.length > 0) {
        query = query.in('domain', domainFilters);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;

      // Filtere nur richtig parametrisierte Templates
      const validTemplates = (data || []).filter((template: any) => {
        return template.parameter_definitions && 
               Object.keys(template.parameter_definitions).length > 0 &&
               template.curriculum_rules &&
               template.student_prompt?.includes('{');
      });

      console.log(`📊 Gefunden: ${validTemplates.length} parametrisierte Templates für ${subject}`);
      return validTemplates as ParametrizedTemplate[];
    } catch (error) {
      console.error('❌ Fehler beim Laden parametrisierter Templates:', error);
      return [];
    }
  }

  /**
   * Rendere Template mit generierten Parametern
   */
  private async renderTemplate(
    template: ParametrizedTemplate,
    grade: number,
    quarter: string
  ): Promise<RenderedQuestion | null> {
    try {
      // Lade Curriculum-Regeln aus Datenbank
      const curriculumRules = await this.getCurriculumRules(grade, quarter);
      if (!curriculumRules) {
        console.warn(`⚠️ Keine Curriculum-Regeln für Klasse ${grade} ${quarter} gefunden`);
        return null;
      }

      // Generiere Parameter
      const parameters = await this.generateParameters(template, curriculumRules);
      if (!parameters) {
        console.warn(`⚠️ Parameter-Generation für Template ${template.id} fehlgeschlagen`);
        return null;
      }

      // Rendere Template
      const renderedPrompt = this.replacePlaceholders(template.student_prompt, parameters);
      const renderedSolution = this.replacePlaceholders(template.solution, parameters);

      // Erstelle Question-Data basierend auf Typ
      let questionData: any = {};

      if (template.question_type === 'text-input') {
        questionData = {
          expected: renderedSolution,
          grading: "exact"
        };
      } else {
        // Multiple Choice
        const renderedDistractors = template.distractors.map(d => 
          this.replacePlaceholders(d, parameters)
        );
        
        const options = [renderedSolution, ...renderedDistractors.slice(0, 3)];
        const shuffledOptions = this.shuffleArray(options);
        const correctIndex = shuffledOptions.indexOf(renderedSolution);

        questionData = {
          options: shuffledOptions,
          correct_idx: correctIndex
        };
      }

      return {
        grade: template.grade,
        subject: this.mapDomainToSubject(template.domain),
        variant: template.question_type.toUpperCase(),
        body: renderedPrompt,
        data: questionData,
        explanation: `Parametrisierte Aufgabe basierend auf Lehrplan Klasse ${grade}`,
        need_image: false
      };
    } catch (error) {
      console.error(`❌ Fehler beim Rendern von Template ${template.id}:`, error);
      return null;
    }
  }

  /**
   * Generiere Parameter für Template basierend auf Curriculum
   */
  private async generateParameters(
    template: ParametrizedTemplate,
    curriculumRule: any
  ): Promise<Record<string, any> | null> {
    try {
      const parameters: Record<string, any> = {};

      for (const [paramName, definition] of Object.entries(template.parameter_definitions)) {
        const paramDef = definition as any;

        switch (paramDef.curriculum_rule) {
          case 'zahlenraum_grade_quarter':
            if (paramDef.type === 'number') {
              const min = Math.max(curriculumRule.zahlenraum_min || 1, 1);
              const max = Math.min(curriculumRule.zahlenraum_max || 10, 1000);
              parameters[paramName] = Math.floor(Math.random() * (max - min + 1)) + min;
            }
            break;

          case 'age_appropriate_names':
            parameters[paramName] = this.getRandomName();
            break;

          case 'context_objects':
            parameters[paramName] = this.getRandomObject(curriculumRule.allowed_contexts || ['objekte']);
            break;

          default:
            // Fallback zu Bereich oder Werten
            if (paramDef.type === 'number' && paramDef.range) {
              const [min, max] = paramDef.range;
              parameters[paramName] = Math.floor(Math.random() * (max - min + 1)) + min;
            } else if (paramDef.values && paramDef.values.length > 0) {
              parameters[paramName] = paramDef.values[Math.floor(Math.random() * paramDef.values.length)];
            }
        }
      }

      // Validiere Zahlenraum-Compliance
      if (!this.validateParameters(parameters, curriculumRule)) {
        console.warn('❌ Parameter validieren Curriculum nicht, generiere neu...');
        return null;
      }

      return parameters;
    } catch (error) {
      console.error('❌ Fehler bei Parameter-Generation:', error);
      return null;
    }
  }

  /**
   * Lade Curriculum-Regeln für Grade/Quarter
   */
  private async getCurriculumRules(grade: number, quarter: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('curriculum_parameter_rules')
        .select('*')
        .eq('grade', grade)
        .eq('quarter', quarter)
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Fehler beim Laden der Curriculum-Regeln:', error);
      return null;
    }
  }

  /**
   * Validiere Parameter gegen Curriculum-Regeln
   */
  private validateParameters(parameters: Record<string, any>, rule: any): boolean {
    // Grundlegende Zahlenraum-Validierung
    for (const value of Object.values(parameters)) {
      if (typeof value === 'number') {
        if (value < rule.zahlenraum_min || value > rule.zahlenraum_max) {
          return false;
        }
      }
    }

    // Summen-Validierung für Addition
    const numbers = Object.values(parameters).filter(v => typeof v === 'number') as number[];
    if (numbers.length >= 2) {
      const sum = numbers[0] + numbers[1];
      if (sum > rule.zahlenraum_max) {
        return false;
      }
    }

    return true;
  }

  /**
   * Helper Methoden
   */
  private replacePlaceholders(template: string, parameters: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(parameters)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value.toString());
    }
    return result;
  }

  private getQuarterFromMonth(month: number): string {
    if (month >= 9 || month <= 1) return 'Q1';
    if (month >= 2 && month <= 4) return 'Q2';
    if (month >= 5 && month <= 7) return 'Q3';
    return 'Q4';
  }

  private getSubjectDomains(subject: string): string[] {
    const domainMap: Record<string, string[]> = {
      'mathematik': ['Zahlen & Operationen', 'Raum & Form', 'Größen & Messen', 'Gleichungen & Funktionen', 'Daten & Zufall'],
      'math': ['Zahlen & Operationen', 'Raum & Form', 'Größen & Messen', 'Gleichungen & Funktionen', 'Daten & Zufall'],
      'deutsch': ['Sprache', 'Lesen', 'Schreiben', 'Grammatik'],
      'german': ['Sprache', 'Lesen', 'Schreiben', 'Grammatik']
    };
    return domainMap[subject.toLowerCase()] || [];
  }

  private mapDomainToSubject(domain: string): string {
    const lowerDomain = domain?.toLowerCase() || '';
    if (lowerDomain.includes('zahlen') || lowerDomain.includes('raum') || lowerDomain.includes('größen')) return 'mathematik';
    if (lowerDomain.includes('sprache') || lowerDomain.includes('deutsch')) return 'deutsch';
    return 'mathematik'; // Fallback
  }

  private getRandomName(): string {
    const names = ['Anna', 'Ben', 'Clara', 'David', 'Emma', 'Felix', 'Greta', 'Hans', 'Ida', 'Jonas'];
    return names[Math.floor(Math.random() * names.length)];
  }

  private getRandomObject(contexts: string[]): string {
    const objects = ['Äpfel', 'Bücher', 'Stifte', 'Bälle', 'Autos', 'Spielsachen'];
    return objects[Math.floor(Math.random() * objects.length)];
  }

  private shuffleArray(array: any[]): any[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}