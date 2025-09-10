/**
 * Multi-Provider AI Service for Template Generation
 * Supports Claude, OpenAI, and Gemini with automatic failover
 */
import { supabase } from '@/lib/supabase';

export interface AIProviderConfig {
  provider: 'claude' | 'openai' | 'gemini';
  model: string;
  priority: number;
  enabled: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface TemplateGenerationRequest {
  subject: string;
  domain: string;
  subcategory: string;
  grade: number;
  quarter: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: 'multiple-choice' | 'text-input' | 'sort' | 'match';
  count?: number;
}

export interface GeneratedTemplate {
  grade: number;
  grade_app: number;
  domain: string;
  subcategory: string;
  quarter_app: string;
  difficulty: string;
  question_type: string;
  student_prompt: string;
  solution: any;
  distractors?: any[];
  explanation: string;
  tags: string[];
  variables: Record<string, any>;
  status: 'ACTIVE' | 'INACTIVE';
  quality_score: number;
  curriculum_rules?: Record<string, any>;
  source_skill_id: string;
}

class MultiProviderAIService {
  private providers: AIProviderConfig[] = [
    {
      provider: 'claude',
      model: 'claude-3-5-sonnet-20241022',
      priority: 1,
      enabled: true,
      maxTokens: 1000
    },
    {
      provider: 'openai', 
      model: 'gpt-4o-mini',
      priority: 2,
      enabled: true,
      maxTokens: 1000
    },
    {
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      priority: 3,
      enabled: true,
      maxTokens: 1000
    }
  ];

  private rateLimits = new Map<string, { requests: number; resetTime: number }>();
  private maxRequestsPerMinute = 50;

  async generateTemplate(request: TemplateGenerationRequest): Promise<GeneratedTemplate | null> {
    const availableProviders = this.providers
      .filter(p => p.enabled && !this.isRateLimited(p.provider))
      .sort((a, b) => a.priority - b.priority);

    for (const provider of availableProviders) {
      try {
        console.log(`🤖 Attempting generation with ${provider.provider}:${provider.model}`);
        const result = await this.callProvider(provider, request);
        
        if (result) {
          console.log(`✅ Successfully generated template with ${provider.provider}`);
          return this.validateAndStructureTemplate(result, request);
        }
      } catch (error) {
        console.error(`❌ ${provider.provider} failed:`, error);
        this.handleProviderError(provider.provider, error);
        continue; // Try next provider
      }
    }

    throw new Error('All AI providers failed to generate template');
  }

  private async callProvider(provider: AIProviderConfig, request: TemplateGenerationRequest): Promise<any> {
    const prompt = this.buildPrompt(request);
    
    switch (provider.provider) {
      case 'claude':
        return this.callClaude(prompt, provider.model);
      case 'openai':
        return this.callOpenAI(prompt, provider.model);
      case 'gemini':
        return this.callGemini(prompt, provider.model);
      default:
        throw new Error(`Unknown provider: ${provider.provider}`);
    }
  }

  private async callClaude(prompt: string, model: string): Promise<any> {
    // Note: Claude integration would need to be implemented via Edge Function
    // For now, fallback to OpenAI
    throw new Error('Claude integration not implemented yet');
  }

  private async callOpenAI(prompt: string, model: string): Promise<any> {
    const { data, error } = await supabase.functions.invoke('openai-proxy', {
      body: {
        model: model,
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
        max_tokens: 1000,
        temperature: 0.7
      }
    });

    if (error) throw error;
    
    if (data.choices && data.choices[0]?.message?.content) {
      return JSON.parse(data.choices[0].message.content);
    }
    
    throw new Error('No valid response from OpenAI');
  }

  private async callGemini(prompt: string, model: string): Promise<any> {
    // Note: Gemini integration would need to be implemented via Edge Function
    throw new Error('Gemini integration not implemented yet');
  }

  private buildPrompt(request: TemplateGenerationRequest): string {
    const mathDomainContext = this.getMathDomainContext(request.domain, request.grade);
    const difficultyContext = this.getDifficultyContext(request.difficulty, request.grade);
    
    return `
# KONTEXT
Du bist Experte für deutsche Mathematik-Lehrpläne und erstellst Aufgaben für Klasse ${request.grade}.

# AUFGABE
Erstelle genau EINE ${request.questionType === 'multiple-choice' ? 'Multiple-Choice-' : ''}Aufgabe im JSON-Format:

{
  "question": "<<Aufgabentext>>",
  "type": "${request.questionType}",
  "data": ${this.getDataSchemaForType(request.questionType)},
  "solution": <<Lösung>>,
  "explanation": "<<Kurze, kindgerechte Erklärung>>",
  "variables": {}
}

# CURRICULUM-VORGABEN
- Fach: ${request.subject}
- Bereich: ${request.domain}  
- Unterbereich: ${request.subcategory}
- Klassenstufe: ${request.grade}
- Quartal: ${request.quarter}
- Schwierigkeit: ${request.difficulty}

# INHALTLICHE ANFORDERUNGEN
${mathDomainContext}

# SCHWIERIGKEITSGRAD
${difficultyContext}

# VERBOTEN
- Keine visuellen Elemente (außer Emojis für Klasse 1: 🍎🍌⭐)
- Keine "Zeichne", "Male", "Konstruiere", "Skizziere"
- Keine Diagramme, Grafiken, Netze
- Altersgerechte Sprache für Klasse ${request.grade}

# AUSGABE
Nur gültiges JSON - keine Kommentare oder Erklärungen außerhalb!
`;
  }

  private getMathDomainContext(domain: string, grade: number): string {
    const contexts: Record<string, string> = {
      'Zahlen & Operationen': grade <= 2 ? 
        'Zahlenraum 1-20, Zählen, einfache Addition/Subtraktion' :
        grade <= 4 ?
        'Zahlenraum bis 1000, schriftliche Rechenverfahren, Brüche' :
        'Rationale Zahlen, Dezimalzahlen, Prozentrechnung',
      'Größen & Messen': grade <= 2 ?
        'Längen schätzen, Uhrzeit (volle Stunden)' :
        grade <= 4 ?
        'cm/m, Gewichte g/kg, Zeitspannen' :
        'Umrechnung von Einheiten, Flächen, Volumen',
      'Raum & Form': grade <= 2 ?
        'Grundformen: Kreis, Dreieck, Quadrat, Rechteck' :
        grade <= 4 ?
        'Eigenschaften von Figuren, einfache Konstruktionen' :
        'Koordinatensystem, Symmetrie, Winkel',
      'Daten & Zufall': grade <= 2 ?
        'Einfache Strichlisten, möglich/unmöglich' :
        grade <= 4 ?
        'Diagramme lesen, Häufigkeiten zählen' :
        'Wahrscheinlichkeiten, Mittelwert, Median'
    };
    
    return contexts[domain] || 'Mathematische Grundlagen';
  }

  private getDifficultyContext(difficulty: string, grade: number): string {
    const contexts: Record<string, string> = {
      'AFB I': `Grundwissen abrufen und wiedergeben. Einfache Rechnungen und bekannte Verfahren anwenden. Für Klasse ${grade} angemessen.`,
      'AFB II': `Gelerntes auf neue Situationen übertragen. Zusammenhänge erkennen und anwenden. Mittlere Komplexität für Klasse ${grade}.`,
      'AFB III': `Problemlösung und Transfer. Unbekannte Situationen analysieren und kreative Lösungswege finden. Höhere Anforderungen für Klasse ${grade}.`
    };
    
    return contexts[difficulty] || contexts['AFB II'];
  }

  private getDataSchemaForType(questionType: string): string {
    switch (questionType) {
      case 'multiple-choice':
        return '{"options": ["Option A", "Option B", "Option C", "Option D"], "correct_idx": 0}';
      case 'text-input':
        return '{"expected": "Erwartete Antwort", "grading": "exact"}';
      case 'sort':
        return '{"items": ["Item 1", "Item 2", "Item 3"], "correct_order": [0, 1, 2]}';
      case 'match':
        return '{"left": ["Links 1", "Links 2"], "right": ["Rechts 1", "Rechts 2"], "pairs": [[0,0], [1,1]]}';
      default:
        return '{"value": "Antwort"}';
    }
  }

  private validateAndStructureTemplate(response: any, request: TemplateGenerationRequest): GeneratedTemplate {
    if (!response.question || !response.data) {
      throw new Error('Invalid template structure from AI');
    }

    // Quality scoring based on content analysis
    const qualityScore = this.calculateQualityScore(response, request);

    return {
      grade: request.grade,
      grade_app: request.grade,
      domain: request.domain,
      subcategory: request.subcategory,
      quarter_app: request.quarter,
      difficulty: request.difficulty,
      question_type: request.questionType,
      student_prompt: response.question,
      solution: response.solution || response.data,
      distractors: this.extractDistractors(response.data, request.questionType),
      explanation: response.explanation || '',
      tags: [request.domain, request.subcategory, request.difficulty],
      variables: response.variables || {},
      status: 'ACTIVE',
      quality_score: qualityScore,
      curriculum_rules: {
        grade_appropriate: this.validateGradeAppropriate(response.question, request.grade),
        no_visuals: !this.containsVisualElements(response.question, request.grade)
      },
      source_skill_id: `ai_generated_${Date.now()}_${request.grade}_${request.domain.replace(/\s+/g, '_')}`
    };
  }

  private calculateQualityScore(response: any, request: TemplateGenerationRequest): number {
    let score = 0.5; // Base score

    // Check question length (appropriate for grade level)
    const questionLength = response.question?.length || 0;
    const targetLength = request.grade <= 2 ? [20, 80] : request.grade <= 4 ? [30, 150] : [50, 200];
    if (questionLength >= targetLength[0] && questionLength <= targetLength[1]) {
      score += 0.2;
    }

    // Check for grade-appropriate language
    if (this.validateGradeAppropriate(response.question, request.grade)) {
      score += 0.15;
    }

    // Check for proper explanation
    if (response.explanation && response.explanation.length > 10) {
      score += 0.1;
    }

    // Check for no forbidden visual elements  
    if (!this.containsVisualElements(response.question, request.grade)) {
      score += 0.05;
    }

    return Math.min(1.0, score);
  }

  private extractDistractors(data: any, questionType: string): any[] | undefined {
    if (questionType === 'multiple-choice' && data.options && data.correct_idx !== undefined) {
      return data.options.filter((_: any, index: number) => index !== data.correct_idx);
    }
    return undefined;
  }

  private validateGradeAppropriate(question: string, grade: number): boolean {
    const complexWords = ['variable', 'gleichung', 'funktion', 'polynom', 'logarithmus'];
    const hasComplexWords = complexWords.some(word => 
      question.toLowerCase().includes(word)
    );
    
    // Complex words inappropriate for lower grades
    if (grade <= 4 && hasComplexWords) return false;
    
    return true;
  }

  private containsVisualElements(question: string, grade: number): boolean {
    const visualWords = [
      'zeichne', 'male', 'konstruiere', 'skizziere', 'bild', 'diagramm', 
      'grafik', 'welches bild', 'netz', 'ordne zu', 'verbinde'
    ];
    
    // Allow emojis for grade 1
    if (grade === 1 && /[🍎🍌⭐🔢]/.test(question)) {
      return false; // Emojis are allowed for grade 1
    }
    
    return visualWords.some(word => 
      question.toLowerCase().includes(word)
    );
  }

  private isRateLimited(provider: string): boolean {
    const limit = this.rateLimits.get(provider);
    if (!limit) return false;
    
    const now = Date.now();
    if (now > limit.resetTime) {
      this.rateLimits.delete(provider);
      return false;
    }
    
    return limit.requests >= this.maxRequestsPerMinute;
  }

  private handleProviderError(provider: string, error: any): void {
    // Track rate limits and errors
    const now = Date.now();
    const limit = this.rateLimits.get(provider) || { requests: 0, resetTime: now + 60000 };
    
    limit.requests++;
    this.rateLimits.set(provider, limit);
    
    console.error(`Provider ${provider} error:`, error);
  }

  // Get provider status for monitoring
  getProviderStatus() {
    return this.providers.map(p => ({
      provider: p.provider,
      model: p.model,
      enabled: p.enabled,
      rateLimited: this.isRateLimited(p.provider)
    }));
  }
}

export const multiProviderAIService = new MultiProviderAIService();