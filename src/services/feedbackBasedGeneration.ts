// Feedback-basierte Fragengenerierung
import { supabase } from '@/integrations/supabase/client';
import { KnowledgeCard, preselectCards } from '@/knowledge/knowledge';
import { SelectionQuestion } from '@/types/questionTypes';

interface FeedbackStats {
  tooEasyCount: number;
  tooHardCount: number;
  duplicateCount: number;
  notCurriculumCount: number;
  totalFeedback: number;
}

interface CurriculumGuidelines {
  grade: number;
  appropriateSkills: string[];
  inappropriateSkills: string[];
  recommendedDifficulty: "easy" | "medium" | "hard";
  numberRange?: string;
  operations?: string[];
  topics?: string[];
}

export class FeedbackBasedGenerationService {
  private static instance: FeedbackBasedGenerationService;
  
  static getInstance(): FeedbackBasedGenerationService {
    if (!FeedbackBasedGenerationService.instance) {
      FeedbackBasedGenerationService.instance = new FeedbackBasedGenerationService();
    }
    return FeedbackBasedGenerationService.instance;
  }

  /**
   * Analysiert Feedback und erstellt Generierungsempfehlungen
   */
  async analyzeUserFeedback(
    userId: string, 
    category: string, 
    grade: number
  ): Promise<{
    feedbackStats: FeedbackStats;
    curriculumGuidelines: CurriculumGuidelines;
    excludedQuestions: string[];
    recommendations: string[];
  }> {
    const feedbackStats = await this.getFeedbackStats(userId, category, grade);
    const curriculumGuidelines = this.getCurriculumGuidelines(grade, category);
    const excludedQuestions = await this.getExcludedQuestions(userId, category, grade);
    const recommendations = this.generateRecommendations(feedbackStats, curriculumGuidelines);

    return {
      feedbackStats,
      curriculumGuidelines,
      excludedQuestions,
      recommendations
    };
  }

  /**
   * Holt Feedback-Statistiken aus der Datenbank
   */
  private async getFeedbackStats(
    userId: string, 
    category: string, 
    grade: number
  ): Promise<FeedbackStats> {
    const { data: feedback, error } = await supabase
      .from('question_feedback')
      .select('feedback_type')
      .eq('user_id', userId)
      .eq('category', category)
      .eq('grade', grade);

    if (error || !feedback) {
      return {
        tooEasyCount: 0,
        tooHardCount: 0,
        duplicateCount: 0,
        notCurriculumCount: 0,
        totalFeedback: 0
      };
    }

    const stats = feedback.reduce((acc, item) => {
      acc.totalFeedback++;
      switch (item.feedback_type) {
        case 'too_easy':
          acc.tooEasyCount++;
          break;
        case 'too_hard':
          acc.tooHardCount++;
          break;
        case 'duplicate':
          acc.duplicateCount++;
          break;
        case 'not_curriculum_compliant':
          acc.notCurriculumCount++;
          break;
      }
      return acc;
    }, {
      tooEasyCount: 0,
      tooHardCount: 0,
      duplicateCount: 0,
      notCurriculumCount: 0,
      totalFeedback: 0
    });

    console.log(`📊 Feedback stats for Grade ${grade} ${category}:`, stats);
    return stats;
  }

  /**
   * Definiert lehrplanbasierte Richtlinien für jede Klassenstufe
   */
  private getCurriculumGuidelines(grade: number, category: string): CurriculumGuidelines {
    const guidelines: Record<number, CurriculumGuidelines> = {
      1: {
        grade: 1,
        appropriateSkills: [
          "Zählen bis 10",
          "Addition im ZR 10 ohne Übergang",
          "Subtraktion im ZR 10 ohne Übergang",
          "Formen erkennen (Kreis, Dreieck, Quadrat, Rechteck)",
          "Längen schätzen und vergleichen"
        ],
        inappropriateSkills: [
          "Multiplikation",
          "Division",
          "Zahlenraum über 20",
          "Brüche",
          "Flächenberechnung"
        ],
        recommendedDifficulty: "easy",
        numberRange: "ZR_10",
        operations: ["Addition", "Subtraktion"],
        topics: ["Zählen", "Grundformen", "Längenvergleich"]
      },
      2: {
        grade: 2,
        appropriateSkills: [
          "Addition/Subtraktion im ZR 100 mit Übergang",
          "Einmaleins 2er/5er/10er Reihen",
          "Geld rechnen bis 100 € (ohne Komma)",
          "Uhr (volle/halbe Stunde)",
          "Geometrische Grundbegriffe"
        ],
        inappropriateSkills: [
          "Flächenberechnung mit Formeln",
          "Brüche",
          "Zahlenraum über 1000",
          "Dezimalzahlen",
          "Negative Zahlen"
        ],
        recommendedDifficulty: "easy",
        numberRange: "ZR_100",
        operations: ["Addition", "Subtraktion", "Einmaleins"],
        topics: ["Halbschriftliche Verfahren", "Zeit", "Geld"]
      },
      3: {
        grade: 3,
        appropriateSkills: [
          "Zahlenraum bis 1000",
          "Schriftliche Addition/Subtraktion mit Übergang",
          "Einstellige Multiplikation × mehrstellig",
          "Division mit Rest",
          "Einfache Brüche",
          "Umfang/Fläche Rechteck (ganzzahlig)"
        ],
        inappropriateSkills: [
          "Negative Zahlen",
          "Dezimalzahlen",
          "Lineare Gleichungen",
          "Prozentrechnung"
        ],
        recommendedDifficulty: "easy",
        numberRange: "ZR_1000",
        operations: ["Schriftliche Verfahren", "Division", "Brüche"],
        topics: ["Geometrie", "Zeitspannen"]
      },
      4: {
        grade: 4,
        appropriateSkills: [
          "Zahlenraum bis 1 Million",
          "Schriftliche Multiplikation mehrstellig × mehrstellig",
          "Schriftliche Division (einstelliger Divisor)",
          "Brüche erweitern/kürzen",
          "Dezimalzahlen bei Geld/Messwerten",
          "Volumen/Netze"
        ],
        inappropriateSkills: [
          "Negative Zahlen",
          "Lineare Gleichungen",
          "Funktionen",
          "Prozentrechnung komplex"
        ],
        recommendedDifficulty: "medium",
        numberRange: "ZR_1000000",
        operations: ["Schriftliche Verfahren", "Brüche", "Dezimalzahlen"],
        topics: ["Einheiten", "Volumen", "Koordinaten"]
      },
      5: {
        grade: 5,
        appropriateSkills: [
          "Negative Zahlen",
          "Brüche/Dezimalzahlen",
          "Terme und Variable",
          "Lineare Gleichungen (einfach)",
          "Proportionalität/Dreisatz",
          "Prozentrechnung (Grundlagen)",
          "Koordinatensystem"
        ],
        inappropriateSkills: [
          "Grundrechenarten ZR 10-20",
          "Einfache Addition/Subtraktion",
          "Zählen bis 10"
        ],
        recommendedDifficulty: "medium",
        numberRange: "Rationale Zahlen",
        operations: ["Bruchrechnen", "Gleichungen", "Prozent"],
        topics: ["Negative Zahlen", "Terme", "Zuordnungen"]
      }
    };

    return guidelines[grade] || guidelines[5];
  }

  /**
   * Holt schlechte/ausgeschlossene Fragen basierend auf Feedback
   */
  private async getExcludedQuestions(
    userId: string, 
    category: string, 
    grade: number
  ): Promise<string[]> {
    try {
      const { data: feedback, error } = await supabase
        .from('question_feedback')
        .select('question_content')
        .eq('user_id', userId)
        .eq('category', category)
        .eq('grade', grade)
        .in('feedback_type', ['duplicate', 'inappropriate', 'too_easy', 'too_hard', 'not_curriculum_compliant']);
      
      if (error || !feedback) return [];
      
      const excluded = feedback.map(f => f.question_content);
      console.log(`🚫 Excluding ${excluded.length} questions based on feedback`);
      return excluded;
    } catch (error) {
      console.warn('Error fetching excluded questions:', error);
      return [];
    }
  }

  /**
   * Generiert Empfehlungen basierend auf Feedback-Analyse
   */
  private generateRecommendations(
    stats: FeedbackStats, 
    guidelines: CurriculumGuidelines
  ): string[] {
    const recommendations: string[] = [];
    
    // Zu einfach → schwieriger machen
    if (stats.tooEasyCount > stats.totalFeedback * 0.3) {
      recommendations.push(`Schwierigkeit erhöhen: ${stats.tooEasyCount} von ${stats.totalFeedback} als zu einfach bewertet`);
      recommendations.push(`Fokus auf ${guidelines.recommendedDifficulty} Aufgaben`);
      recommendations.push(`Passende Skills: ${guidelines.appropriateSkills.join(', ')}`);
    }
    
    // Zu schwer → einfacher machen
    if (stats.tooHardCount > stats.totalFeedback * 0.3) {
      recommendations.push(`Schwierigkeit reduzieren: ${stats.tooHardCount} von ${stats.totalFeedback} als zu schwer bewertet`);
      recommendations.push(`Vermeiden: ${guidelines.inappropriateSkills.join(', ')}`);
    }
    
    // Nicht lehrplankonform
    if (stats.notCurriculumCount > 0) {
      recommendations.push(`Lehrplankonformität verbessern: ${stats.notCurriculumCount} Aufgaben entsprechen nicht dem Lehrplan`);
      recommendations.push(`Zahlenraum: ${guidelines.numberRange || 'Angemessen'}`);
      recommendations.push(`Erlaubte Operationen: ${guidelines.operations?.join(', ') || 'Grundoperationen'}`);
    }
    
    // Duplikate
    if (stats.duplicateCount > stats.totalFeedback * 0.2) {
      recommendations.push(`Vielfalt erhöhen: ${stats.duplicateCount} Duplikate erkannt`);
      recommendations.push(`Mehr Themenvielfalt aus: ${guidelines.topics?.join(', ') || 'Verschiedene Bereiche'}`);
    }

    return recommendations;
  }

  /**
   * Filtert Knowledge Cards basierend auf Feedback und Lehrplan
   */
  filterKnowledgeCards(
    knowledgeCards: KnowledgeCard[],
    guidelines: CurriculumGuidelines,
    recommendations: string[]
  ): KnowledgeCard[] {
    return knowledgeCards.filter(card => {
      // Passende Klassenstufe
      if (card.grade !== guidelines.grade) return false;
      
      // Lehrplankonforme Skills
      const isAppropriate = guidelines.appropriateSkills.some(skill => 
        card.skill.toLowerCase().includes(skill.toLowerCase()) ||
        card.subcategory.toLowerCase().includes(skill.toLowerCase())
      );
      
      // Unpassende Skills ausschließen
      const isInappropriate = guidelines.inappropriateSkills.some(skill => 
        card.skill.toLowerCase().includes(skill.toLowerCase()) ||
        card.subcategory.toLowerCase().includes(skill.toLowerCase())
      );
      
      return isAppropriate && !isInappropriate;
    });
  }
}