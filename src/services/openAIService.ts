import { supabase } from '@/lib/supabase';

export interface OpenAITemplate {
  grade: number;
  subject: string;
  domain: string;
  subcategory: string;
  quarter_app: string;
  difficulty: string;
  question_type: string;
  student_prompt: string;
  solution: any;
  distractors?: any[];
  explanation?: string;
  unit?: string;
}

export interface GenerationRequest {
  grade: number;
  domain: string;
  subcategory: string;
  quarter: string;
  count: number;
  difficulty?: string;
}

export interface GenerationResult {
  success: boolean;
  templates?: OpenAITemplate[];
  error?: string;
  generated_count?: number;
  saved_count?: number;
}

class OpenAIService {
  private async callOpenAIProxy(prompt: string, model: string = 'gpt-4o-mini'): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('openai-proxy', {
        body: {
          model,
          messages: [
            {
              role: 'system',
              content: 'Du bist ein KI-System zur Erstellung von Lernaufgaben für deutsche Schüler. Antworte nur mit gültigem JSON.'
            },
            {
              role: 'user', 
              content: prompt
            }
          ],
          max_completion_tokens: 1000,
          temperature: 1.0
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }

  async generateTemplates(request: GenerationRequest): Promise<GenerationResult> {
    try {
      const templates: OpenAITemplate[] = [];
      
      for (let i = 0; i < request.count; i++) {
        const prompt = this.buildGenerationPrompt(request);
        const response = await this.callOpenAIProxy(prompt);
        
        if (response.choices && response.choices[0]?.message?.content) {
          try {
            const parsedTemplate = JSON.parse(response.choices[0].message.content);
            
            // Validate and structure template
            const template: OpenAITemplate = {
              grade: request.grade,
              subject: this.mapDomainToSubject(request.domain),
              domain: request.domain,
              subcategory: request.subcategory,
              quarter_app: request.quarter,
              difficulty: request.difficulty || 'medium',
              question_type: parsedTemplate.variant || 'MULTIPLE_CHOICE',
              student_prompt: parsedTemplate.body || '',
              solution: parsedTemplate.data || {},
              explanation: parsedTemplate.explanation || '',
              unit: parsedTemplate.unit || null
            };

            // Add distractors for multiple choice
            if (template.question_type === 'MULTIPLE_CHOICE' && parsedTemplate.data?.options) {
              template.distractors = parsedTemplate.data.options.filter(
                (_: any, index: number) => index !== parsedTemplate.data.correct_idx
              );
            }

            templates.push(template);
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (parseError) {
            console.error('Failed to parse OpenAI response:', parseError);
          }
        }
      }

      // Save templates to database
      const savedCount = await this.saveTemplates(templates);

      return {
        success: true,
        templates,
        generated_count: templates.length,
        saved_count: savedCount
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private buildGenerationPrompt(request: GenerationRequest): string {
    return `
# KONTEXT
Du bist geprüfter Schulaufgaben-Generator für deutsche Schüler.

# AUFGABE
Erstelle genau EINE Aufgabe im JSON-Schema:
{
  "grade": ${request.grade},
  "subject": "${this.mapDomainToSubject(request.domain)}",
  "variant": "MULTIPLE_CHOICE",
  "body": "<<Fragetext>>",
  "data": {
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correct_idx": 0
  },
  "explanation": "<<Kurze Erklärung>>",
  "unit": "<<Einheit falls numerisch>>"
}

# VORGABEN
- Domain: ${request.domain}
- Unterkategorie: ${request.subcategory}
- Klassenstufe: ${request.grade}
- Quartal: ${request.quarter}
- Schwierigkeit: ${request.difficulty || 'medium'}

# REGELN
- Nur MULTIPLE_CHOICE Fragen
- 4 Antwortmöglichkeiten
- Altersgerechte Sprache für Klasse ${request.grade}
- Deutsche Rechtschreibung
- Kurze, präzise Fragen
- Nur gültiges JSON - keine Kommentare!

Erstelle die Aufgabe:`;
  }

  private mapDomainToSubject(domain: string): string {
    const mapping: Record<string, string> = {
      'Zahlen & Operationen': 'Mathematik',
      'Raum & Form': 'Mathematik',
      'Größen & Messen': 'Mathematik',
      'Daten & Zufall': 'Mathematik',
      'Gleichungen & Funktionen': 'Mathematik',
      'Sprache untersuchen': 'Deutsch',
      'Rechtschreibung': 'Deutsch',
      'Lesen': 'Deutsch',
      'Schreiben': 'Deutsch'
    };
    
    return mapping[domain] || 'Mathematik';
  }

  private async saveTemplates(templates: OpenAITemplate[]): Promise<number> {
    if (templates.length === 0) return 0;

    try {
      const templateData = templates.map(template => ({
        grade: template.grade,
        grade_app: template.grade,
        domain: template.domain,
        subcategory: template.subcategory,
        quarter_app: template.quarter_app,
        difficulty: template.difficulty,
        question_type: template.question_type,
        student_prompt: template.student_prompt,
        solution: template.solution,
        distractors: template.distractors || null,
        explanation: template.explanation,
        unit: template.unit,
        status: 'ACTIVE',
        source_skill_id: `openai_generated_${Date.now()}`,
        tags: [template.domain, template.subcategory],
        variables: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('templates')
        .insert(templateData)
        .select('id');

      if (error) {
        console.error('Database save error:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error saving templates:', error);
      return 0;
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.callOpenAIProxy('Test connection. Antworte nur mit: {"status": "ok"}');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }
}

export const openAIService = new OpenAIService();