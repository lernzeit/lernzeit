import { logger } from "../utils/logger.ts";

export interface ContextCombination {
  location?: string;
  character?: string;
  activity?: string;
  objects?: string;
  time_setting?: string;
  [key: string]: string | undefined;
}

export class DiversityEngine {
  
  enhancePromptForDiversity(
    basePrompt: string, 
    excludedQuestions: string[], 
    excludedContexts: ContextCombination[] = []
  ): string {
    const diversityInstructions = this.createDiversityInstructions(excludedQuestions);
    const creativityBoost = this.createCreativityBoost(excludedQuestions.length);
    const contextualInstructions = this.createContextualDiversityInstructions(excludedContexts);
    
    return `${basePrompt}

${diversityInstructions}

${contextualInstructions}

${creativityBoost}

WICHTIGE DIVERSITÄTS-REGELN:
- Verwende verschiedene Zahlen, Namen, Begriffe
- Variiere Fragestrukturen und Formulierungen  
- Nutze unterschiedliche Unterthemen
- Erstelle verschiedene Schwierigkeitsgrade
- Nutze alle verfügbaren Fragetypen (text-input, multiple-choice, word-selection, matching)
- Wähle den Typ, der am besten zum Lernziel passt
- MAXIMIERE KONTEXTUELLE VIELFALT - keine repetitiven Szenarien!

ANTWORTFORMAT: Verwende JSON mit strukturiertem Format für bessere Verarbeitung.`;
  }

  private createDiversityInstructions(excludedQuestions: string[]): string {
    if (excludedQuestions.length === 0) {
      return '✨ Erstelle völlig neue und einzigartige Aufgaben!';
    }

    const sampleExcluded = excludedQuestions.slice(0, 5).map((q, i) => `${i+1}. "${q}"`).join('\n');
    
    return `🚫 VERMEIDE DIESE ${excludedQuestions.length} BEREITS GESTELLTEN FRAGEN:
${sampleExcluded}
${excludedQuestions.length > 5 ? `... und ${excludedQuestions.length - 5} weitere` : ''}

⚡ ERSTELLE KOMPLETT ANDERE FRAGEN MIT:
- Völlig unterschiedlichen Zahlen/Werten
- Anderen Themen/Unterthemen  
- Verschiedenen Formulierungen
- Neuen Beispielen und Begriffen`;
  }

  private createContextualDiversityInstructions(excludedContexts: ContextCombination[]): string {
    if (excludedContexts.length === 0) {
      return `📍 KONTEXTUELLE VIELFALT:
🏪 ORTE: Nutze verschiedene Locations (Bäckerei, Schule, Park, Bibliothek, Markt, Zoo, Museum, Farm, Strand, Wald)
🎭 PERSONEN: Wechsle zwischen verschiedenen Charakteren (Student, Lehrer, Eltern, Verkäufer, Bauer, Koch, Wissenschaftler)
🎯 AKTIVITÄTEN: Variiere die Tätigkeiten (kaufen, lernen, spielen, lesen, kochen, bauen, erforschen, sammeln)
🎲 OBJEKTE: Nutze unterschiedliche Gegenstände (nicht nur Äpfel! Auch Bücher, Spielzeug, Werkzeuge, Kleidung)`;
    }

    const contextExamples = excludedContexts.slice(0, 3).map((ctx, i) => 
      `${i+1}. ${Object.entries(ctx).map(([k,v]) => `${k}:${v}`).join(', ')}`
    ).join('\n');

    return `🚫 VERMEIDE DIESE ${excludedContexts.length} BEREITS VERWENDETEN KONTEXTE:
${contextExamples}
${excludedContexts.length > 3 ? `... und ${excludedContexts.length - 3} weitere` : ''}

📍 NEUE KONTEXTUELLE VIELFALT ERFORDERLICH:
🏪 LOCATION DIVERSITY: Nutze völlig andere Orte - vermeide Wiederholung von Schauplätzen
🎭 CHARACTER DIVERSITY: Wähle andere Personen/Rollen 
🎯 ACTIVITY DIVERSITY: Verwende verschiedene Aktivitäten und Situationen
🎲 OBJECT DIVERSITY: Nutze komplett andere Gegenstände und Materialien

⚡ KONTEXTUELLE KREATIVITÄT: Kombiniere ungewöhnliche aber sinnvolle Kontexte für maximale Abwechslung!`;
  }

  private createCreativityBoost(excludeCount: number): string {
    if (excludeCount <= 3) return '';
    
    return `🎨 MAXIMALE KREATIVITÄT ERFORDERLICH: 
Da bereits ${excludeCount} Fragen gestellt wurden, sei extrem kreativ und nutze völlig neue Ansätze, andere Themenbereiche und innovative Fragestellungen! KEINE WIEDERHOLUNGEN!`;
  }
}