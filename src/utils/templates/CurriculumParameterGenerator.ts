// Enhanced Parameter Generator für curriculum-konforme Template-Parametrisierung
import { supabase } from '@/integrations/supabase/client';

export interface CurriculumParameterRule {
  id: string;
  grade: number;
  quarter: string;
  domain: string;
  zahlenraum_min: number;
  zahlenraum_max: number;
  operation_types: string[];
  allowed_contexts: string[];
  complexity_level: string;
}

export interface ParameterDefinition {
  type: 'number' | 'word' | 'list';
  curriculum_rule: string;
  constraints?: string[];
  range?: [number, number];
  values?: string[];
}

export interface CurriculumTemplate {
  parameter_definitions: Record<string, ParameterDefinition>;
  curriculum_rules: {
    grade: number;
    quarter: string;
    zahlenraum_max: number;
    operation_types: string[];
    contexts: string[];
  };
}

export interface GeneratedParameters {
  parameters: Record<string, any>;
  isValid: boolean;
  errors: string[];
  curriculumCompliant: boolean;
}

export class CurriculumParameterGenerator {
  private static curriculumCache = new Map<string, CurriculumParameterRule[]>();
  private static cacheExpiry = new Map<string, number>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 Minuten

  /**
   * Generiere Parameter basierend auf Lehrplan-Regeln
   */
  static async generateCurriculumParameters(
    template: CurriculumTemplate,
    grade: number,
    quarter: string,
    usedCombinations?: Set<string>
  ): Promise<GeneratedParameters> {
    try {
      // Lade Curriculum-Regeln
      const curriculumRules = await this.getCurriculumRules(grade, quarter);
      if (!curriculumRules.length) {
        return {
          parameters: {},
          isValid: false,
          errors: [`Keine Curriculum-Regeln für Klasse ${grade} Quartal ${quarter} gefunden`],
          curriculumCompliant: false
        };
      }

      const maxAttempts = 500;
      let attempts = 0;

      while (attempts < maxAttempts) {
        attempts++;
        const params: Record<string, any> = {};
        const errors: string[] = [];
        let valid = true;

        // Generiere Parameter basierend auf Curriculum-Regeln
        for (const [paramName, definition] of Object.entries(template.parameter_definitions)) {
          try {
            const paramValue = await this.generateSingleParameter(
              paramName,
              definition,
              curriculumRules,
              template.curriculum_rules
            );
            
            if (paramValue !== null) {
              params[paramName] = paramValue;
            } else {
              errors.push(`Konnte Parameter ${paramName} nicht generieren`);
              valid = false;
              break;
            }
          } catch (error) {
            errors.push(`Fehler bei Parameter ${paramName}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
            valid = false;
            break;
          }
        }

        if (!valid) continue;

        // Prüfe Curriculum-Compliance
        const complianceCheck = this.validateCurriculumCompliance(params, curriculumRules, template.curriculum_rules);
        if (!complianceCheck.valid) {
          console.log(`⚠️ Curriculum-Compliance failed (${attempts}/${maxAttempts}):`, complianceCheck.errors);
          continue;
        }

        // Prüfe auf Duplikate wenn Set bereitgestellt
        if (usedCombinations) {
          const combinationKey = this.generateCombinationKey(params);
          if (usedCombinations.has(combinationKey)) {
            console.log(`🔄 Duplikat entdeckt, erneuter Versuch... (${attempts}/${maxAttempts})`);
            continue;
          }
          usedCombinations.add(combinationKey);
        }

        console.log(`✅ Curriculum-konforme Parameter nach ${attempts} Versuchen generiert:`, params);
        return {
          parameters: params,
          isValid: true,
          errors: [],
          curriculumCompliant: true
        };
      }

      // Fallback nach maximalen Versuchen
      console.warn(`❌ Konnte nach ${maxAttempts} Versuchen keine gültigen Parameter generieren`);
      return {
        parameters: {},
        isValid: false,
        errors: [`Maximale Versuche (${maxAttempts}) erreicht ohne gültige Parameter`],
        curriculumCompliant: false
      };
    } catch (error) {
      console.error('❌ Curriculum Parameter Generation Error:', error);
      return {
        parameters: {},
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unbekannter Fehler'],
        curriculumCompliant: false
      };
    }
  }

  /**
   * Generiere einzelnen Parameter basierend auf Curriculum-Regel
   */
  private static async generateSingleParameter(
    paramName: string,
    definition: ParameterDefinition,
    curriculumRules: CurriculumParameterRule[],
    templateRules: CurriculumTemplate['curriculum_rules']
  ): Promise<any> {
    const rule = curriculumRules[0]; // Verwende erste passende Regel

    switch (definition.curriculum_rule) {
      case 'zahlenraum_grade_quarter':
        if (definition.type === 'number') {
          const min = Math.max(rule.zahlenraum_min, 1);
          const max = Math.min(rule.zahlenraum_max, templateRules.zahlenraum_max);
          return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        break;

      case 'age_appropriate_names':
        if (definition.type === 'word') {
          const names = this.getAgeAppropriateNames(templateRules.grade);
          return names[Math.floor(Math.random() * names.length)];
        }
        break;

      case 'context_objects':
        if (definition.type === 'word') {
          const objects = this.getContextObjects(rule.allowed_contexts);
          return objects[Math.floor(Math.random() * objects.length)];
        }
        break;

      case 'multiplication_range':
        if (definition.type === 'number') {
          // Einmaleins-gerechte Zahlen basierend auf Klassenstufe
          const maxFactor = templateRules.grade <= 2 ? 10 : templateRules.grade <= 4 ? 12 : 20;
          return Math.floor(Math.random() * maxFactor) + 1;
        }
        break;
    }

    // Fallback zu Standard-Generierung
    if (definition.type === 'number' && definition.range) {
      const [min, max] = definition.range;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    if (definition.type === 'word' && definition.values) {
      return definition.values[Math.floor(Math.random() * definition.values.length)];
    }

    return null;
  }

  /**
   * Lade Curriculum-Regeln aus Datenbank mit Caching
   */
  private static async getCurriculumRules(grade: number, quarter: string): Promise<CurriculumParameterRule[]> {
    const cacheKey = `${grade}_${quarter}`;
    const now = Date.now();

    // Check Cache
    if (this.curriculumCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (now - expiry < this.CACHE_TTL) {
        return this.curriculumCache.get(cacheKey)!;
      }
    }

    try {
      const { data, error } = await supabase
        .from('curriculum_parameter_rules')
        .select('*')
        .eq('grade', grade)
        .eq('quarter', quarter)
        .order('id');

      if (error) throw error;

      const rules = data || [];
      
      // Update Cache
      this.curriculumCache.set(cacheKey, rules);
      this.cacheExpiry.set(cacheKey, now);

      return rules;
    } catch (error) {
      console.error('❌ Fehler beim Laden der Curriculum-Regeln:', error);
      return [];
    }
  }

  /**
   * Validiere Curriculum-Compliance der generierten Parameter
   */
  private static validateCurriculumCompliance(
    parameters: Record<string, any>,
    curriculumRules: CurriculumParameterRule[],
    templateRules: CurriculumTemplate['curriculum_rules']
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const rule = curriculumRules[0];

    if (!rule) {
      errors.push('Keine Curriculum-Regel verfügbar');
      return { valid: false, errors };
    }

    // Prüfe Zahlenraum-Compliance
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'number') {
        if (value < rule.zahlenraum_min || value > rule.zahlenraum_max) {
          errors.push(`${key}=${value} außerhalb Zahlenraum ${rule.zahlenraum_min}-${rule.zahlenraum_max}`);
        }
      }
    }

    // Prüfe Operationen-Compliance 
    const { zahl1, zahl2 } = parameters;
    if (typeof zahl1 === 'number' && typeof zahl2 === 'number') {
      const sum = zahl1 + zahl2;
      const product = zahl1 * zahl2;

      // Addition darf Zahlenraum nicht überschreiten
      if (sum > rule.zahlenraum_max) {
        errors.push(`Summe ${sum} überschreitet Zahlenraum ${rule.zahlenraum_max}`);
      }

      // Multiplikation nur wenn erlaubt
      if (product > rule.zahlenraum_max && rule.operation_types.some(op => op.includes('multiplication'))) {
        errors.push(`Produkt ${product} überschreitet Zahlenraum ${rule.zahlenraum_max}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Generiere Combination-Key für Duplikat-Erkennung
   */
  private static generateCombinationKey(parameters: Record<string, any>): string {
    const sortedEntries = Object.entries(parameters).sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(sortedEntries);
  }

  /**
   * Altersgerechte Namen basierend auf Klassenstufe
   */
  private static getAgeAppropriateNames(grade: number): string[] {
    if (grade <= 4) {
      return ['Anna', 'Ben', 'Clara', 'David', 'Emma', 'Felix', 'Greta', 'Hans', 'Ida', 'Jonas'];
    } else if (grade <= 7) {
      return ['Alexander', 'Beatrice', 'Christian', 'Diana', 'Erik', 'Franziska', 'Gabriel', 'Helena'];
    } else {
      return ['Adrian', 'Bianca', 'Constantin', 'Dominique', 'Elisabeth', 'Friedrich', 'Gabrielle'];
    }
  }

  /**
   * Kontext-Objekte basierend auf erlaubten Kontexten
   */
  private static getContextObjects(allowedContexts: string[]): string[] {
    const contextMap: Record<string, string[]> = {
      'spielzeug': ['Bälle', 'Puppen', 'Autos', 'Bausteine', 'Puzzle'],
      'tiere': ['Katzen', 'Hunde', 'Vögel', 'Fische', 'Hamster'],
      'obst': ['Äpfel', 'Bananen', 'Orangen', 'Birnen', 'Trauben'],
      'einkaufen': ['Brötchen', 'Milchpackungen', 'Äpfel', 'Bücher', 'Stifte'],
      'sport': ['Bälle', 'Tore', 'Sprünge', 'Laps', 'Punkte'],
      'wissenschaft': ['Experimente', 'Messungen', 'Proben', 'Daten', 'Ergebnisse'],
      'technik': ['Computer', 'Bauteile', 'Maschinen', 'Programme', 'Systeme']
    };

    const allObjects: string[] = [];
    for (const context of allowedContexts) {
      if (contextMap[context]) {
        allObjects.push(...contextMap[context]);
      }
    }

    return allObjects.length > 0 ? allObjects : ['Gegenstände', 'Objekte', 'Dinge', 'Elemente'];
  }
}