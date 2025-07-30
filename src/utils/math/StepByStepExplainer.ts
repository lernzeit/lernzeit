/**
 * Schritt-für-Schritt Erklärungsgenerator für Mathematik
 * Phase 1: Generiert verständliche, pädagogisch wertvolle Erklärungen
 */

import { SelectionQuestion } from '@/types/questionTypes';
import { ImprovedGermanMathParser } from './ImprovedGermanMathParser';

export interface ExplanationStep {
  step: number;
  description: string;
  calculation?: string;
  result?: string | number;
  tip?: string;
}

export interface DetailedExplanation {
  summary: string;
  steps: ExplanationStep[];
  tips?: string[];
  commonMistakes?: string[];
  visualAid?: string;
}

export class StepByStepExplainer {
  
  /**
   * Generiert eine detaillierte Erklärung für eine Mathematikaufgabe
   */
  static generateExplanation(
    question: SelectionQuestion,
    answer: string | number,
    grade: number
  ): DetailedExplanation {
    const questionText = question.question;
    
    // Parse die Frage für detaillierte Analyse
    const parseResult = ImprovedGermanMathParser.parse(questionText);
    
    if (!parseResult.success) {
      return this.generateFallbackExplanation(question, answer);
    }
    
    // Bestimme den Aufgabentyp
    const taskType = this.detectTaskType(questionText);
    
    switch (taskType) {
      case 'arithmetic':
        return this.explainArithmetic(questionText, answer, parseResult, grade);
      case 'geometry':
        return this.explainGeometry(questionText, answer, grade);
      case 'word_problem':
        return this.explainWordProblem(questionText, answer, grade);
      case 'time':
        return this.explainTimeProblem(questionText, answer, grade);
      default:
        return this.generateGenericExplanation(questionText, answer, parseResult);
    }
  }
  
  /**
   * Erklärt arithmetische Aufgaben
   */
  private static explainArithmetic(
    question: string,
    answer: string | number,
    parseResult: any,
    grade: number
  ): DetailedExplanation {
    const steps: ExplanationStep[] = [];
    
    // Schritt 1: Aufgabenstellung
    steps.push({
      step: 1,
      description: "Schauen wir uns die Aufgabe an:",
      calculation: parseResult.expression || question
    });
    
    // Extrahiere Zahlen und Operatoren
    const expression = parseResult.expression || question;
    const hasMultipleOps = (expression.match(/[+\-×*÷/:]/g) || []).length > 1;
    
    if (hasMultipleOps && grade >= 3) {
      // Punkt-vor-Strich Erklärung
      steps.push({
        step: 2,
        description: "Denke an die Punkt-vor-Strich-Regel!",
        tip: "Multiplikation (×) und Division (÷) werden immer vor Addition (+) und Subtraktion (-) berechnet."
      });
      
      // Zeige Zwischenschritte aus dem Parser
      if (parseResult.steps) {
        parseResult.steps.forEach((step: string, index: number) => {
          if (step.includes('=')) {
            steps.push({
              step: index + 3,
              description: `Zwischenschritt ${index + 1}:`,
              calculation: step
            });
          }
        });
      }
    } else {
      // Einfache Berechnung
      steps.push({
        step: 2,
        description: "Berechnung:",
        calculation: `${expression} = ${answer}`
      });
    }
    
    // Letzter Schritt: Ergebnis
    steps.push({
      step: steps.length + 1,
      description: "Das Ergebnis ist:",
      result: answer,
      tip: grade <= 2 ? "Überprüfe dein Ergebnis durch Nachzählen!" : undefined
    });
    
    // Erstelle Zusammenfassung
    const summary = `${expression} = ${answer}`;
    
    // Tipps basierend auf Klassenstufe
    const tips = this.generateGradeLevelTips(grade, 'arithmetic');
    
    // Häufige Fehler
    const commonMistakes = this.getCommonMistakes('arithmetic', grade);
    
    return {
      summary,
      steps,
      tips,
      commonMistakes
    };
  }
  
  /**
   * Erklärt Geometrie-Aufgaben
   */
  private static explainGeometry(
    question: string,
    answer: string | number,
    grade: number
  ): DetailedExplanation {
    const steps: ExplanationStep[] = [];
    const isPerimeter = question.toLowerCase().includes('umfang');
    const isArea = question.toLowerCase().includes('fläche');
    
    // Extrahiere Maße
    const measurements = (question.match(/\d+\s*cm/g) || [])
      .map(m => parseInt(m));
    
    if (measurements.length < 2) {
      return this.generateFallbackExplanation({ question } as SelectionQuestion, answer);
    }
    
    const [length, width] = measurements;
    
    steps.push({
      step: 1,
      description: "Gegeben sind:",
      calculation: `Länge = ${length} cm, Breite = ${width} cm`
    });
    
    if (isPerimeter) {
      steps.push({
        step: 2,
        description: "Formel für den Umfang eines Rechtecks:",
        calculation: "Umfang = 2 × (Länge + Breite)",
        tip: "Der Umfang ist die Länge der Linie um die ganze Figur herum."
      });
      
      steps.push({
        step: 3,
        description: "Setze die Werte ein:",
        calculation: `Umfang = 2 × (${length} + ${width})`
      });
      
      steps.push({
        step: 4,
        description: "Berechne die Klammer:",
        calculation: `Umfang = 2 × ${length + width}`
      });
      
      steps.push({
        step: 5,
        description: "Multipliziere:",
        calculation: `Umfang = ${answer} cm`
      });
    } else if (isArea) {
      steps.push({
        step: 2,
        description: "Formel für die Fläche eines Rechtecks:",
        calculation: "Fläche = Länge × Breite",
        tip: "Die Fläche sagt uns, wie viel Platz innerhalb der Figur ist."
      });
      
      steps.push({
        step: 3,
        description: "Setze die Werte ein:",
        calculation: `Fläche = ${length} × ${width}`
      });
      
      steps.push({
        step: 4,
        description: "Multipliziere:",
        calculation: `Fläche = ${answer} cm²`
      });
    }
    
    const summary = isPerimeter 
      ? `Umfang = 2 × (${length} + ${width}) = ${answer} cm`
      : `Fläche = ${length} × ${width} = ${answer} cm²`;
    
    return {
      summary,
      steps,
      tips: [
        isPerimeter 
          ? "Stelle dir vor, du läufst einmal um das Rechteck herum - das ist der Umfang!"
          : "Stelle dir vor, du legst kleine Quadrate in das Rechteck - das ist die Fläche!"
      ],
      commonMistakes: [
        isPerimeter 
          ? "Vergiss nicht, das Ergebnis mit 2 zu multiplizieren!"
          : "Denke daran: Bei der Fläche wird multipliziert (×), nicht addiert (+)!"
      ],
      visualAid: this.generateVisualAid('rectangle', length, width)
    };
  }
  
  /**
   * Erklärt Textaufgaben
   */
  private static explainWordProblem(
    question: string,
    answer: string | number,
    grade: number
  ): DetailedExplanation {
    const steps: ExplanationStep[] = [];
    
    // Identifiziere wichtige Informationen
    const numbers = (question.match(/\d+/g) || []).map(n => parseInt(n));
    const isAddition = question.includes('bekommt') || question.includes('dazu');
    const isSubtraction = question.includes('gibt ab') || question.includes('verliert');
    const isMultiplication = question.includes('jeweils') || question.includes('mal');
    const isDivision = question.includes('verteilt') || question.includes('aufgeteilt');
    
    steps.push({
      step: 1,
      description: "Verstehe die Aufgabe:",
      calculation: this.highlightKeyWords(question)
    });
    
    steps.push({
      step: 2,
      description: "Wichtige Informationen:",
      calculation: `Zahlen: ${numbers.join(', ')}`,
      tip: this.getOperationHint(isAddition, isSubtraction, isMultiplication, isDivision)
    });
    
    if (numbers.length >= 2) {
      const [num1, num2] = numbers;
      let operation = '';
      let operationSymbol = '';
      
      if (isAddition) {
        operation = 'Addition';
        operationSymbol = '+';
      } else if (isSubtraction) {
        operation = 'Subtraktion';
        operationSymbol = '-';
      } else if (isMultiplication) {
        operation = 'Multiplikation';
        operationSymbol = '×';
      } else if (isDivision) {
        operation = 'Division';
        operationSymbol = '÷';
      }
      
      steps.push({
        step: 3,
        description: `Wir brauchen eine ${operation}:`,
        calculation: `${num1} ${operationSymbol} ${num2}`
      });
      
      steps.push({
        step: 4,
        description: "Berechnung:",
        calculation: `${num1} ${operationSymbol} ${num2} = ${answer}`
      });
      
      steps.push({
        step: 5,
        description: "Antwort:",
        result: answer,
        tip: "Vergiss nicht, die Einheit (Stück, Euro, etc.) in deiner Antwort zu erwähnen!"
      });
    }
    
    return {
      summary: `Die Antwort ist ${answer}`,
      steps,
      tips: this.generateGradeLevelTips(grade, 'word_problem'),
      commonMistakes: this.getCommonMistakes('word_problem', grade)
    };
  }
  
  /**
   * Erklärt Zeit-Aufgaben
   */
  private static explainTimeProblem(
    question: string,
    answer: string | number,
    grade: number
  ): DetailedExplanation {
    const steps: ExplanationStep[] = [];
    const minutes = parseInt((question.match(/(\d+)\s*Minuten/) || ['0', '0'])[1]);
    
    steps.push({
      step: 1,
      description: "Gegeben:",
      calculation: `${minutes} Minuten`
    });
    
    steps.push({
      step: 2,
      description: "Umrechnung:",
      tip: "1 Stunde = 60 Minuten"
    });
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    steps.push({
      step: 3,
      description: "Division mit Rest:",
      calculation: `${minutes} ÷ 60 = ${hours} Rest ${remainingMinutes}`
    });
    
    steps.push({
      step: 4,
      description: "Das bedeutet:",
      result: answer,
      calculation: `${hours} Stunden und ${remainingMinutes} Minuten`
    });
    
    return {
      summary: `${minutes} Minuten = ${answer}`,
      steps,
      tips: [
        "Merke dir: 60 Minuten = 1 Stunde",
        "30 Minuten = eine halbe Stunde"
      ],
      commonMistakes: [
        "Vergiss nicht den Rest anzugeben, wenn die Division nicht aufgeht!"
      ]
    };
  }
  
  /**
   * Hilfsfunktionen
   */
  
  private static detectTaskType(question: string): string {
    const q = question.toLowerCase();
    
    if (q.includes('umfang') || q.includes('fläche')) return 'geometry';
    if (q.includes('minuten') || q.includes('stunden')) return 'time';
    if (q.includes('hat') || q.includes('kauft') || q.includes('bekommt')) return 'word_problem';
    
    return 'arithmetic';
  }
  
  private static generateGradeLevelTips(grade: number, type: string): string[] {
    const tips: string[] = [];
    
    if (grade <= 2) {
      tips.push("Nutze deine Finger zum Zählen, wenn es hilft!");
      tips.push("Zeichne die Aufgabe auf, um sie besser zu verstehen.");
    } else if (grade <= 4) {
      tips.push("Überprüfe dein Ergebnis durch eine Umkehrrechnung.");
      tips.push("Schreibe Zwischenschritte auf, damit du nichts vergisst.");
    }
    
    if (type === 'word_problem') {
      tips.push("Unterstreiche die wichtigen Zahlen und Signalwörter.");
    }
    
    return tips;
  }
  
  private static getCommonMistakes(type: string, grade: number): string[] {
    const mistakes: string[] = [];
    
    switch (type) {
      case 'arithmetic':
        if (grade >= 3) {
          mistakes.push("Punkt-vor-Strich-Regel vergessen");
        }
        mistakes.push("Rechenfehler bei der Addition/Subtraktion");
        break;
      case 'geometry':
        mistakes.push("Formel verwechselt (Umfang statt Fläche)");
        mistakes.push("Einheit vergessen (cm, cm²)");
        break;
      case 'word_problem':
        mistakes.push("Falsche Rechenoperation gewählt");
        mistakes.push("Nicht alle Informationen beachtet");
        break;
    }
    
    return mistakes;
  }
  
  private static highlightKeyWords(text: string): string {
    // Markiere Signalwörter
    const keywords = ['bekommt', 'dazu', 'verliert', 'gibt ab', 'jeweils', 'verteilt'];
    let highlighted = text;
    
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        highlighted = highlighted.replace(keyword, `**${keyword}**`);
      }
    });
    
    return highlighted;
  }
  
  private static getOperationHint(
    isAdd: boolean, 
    isSub: boolean, 
    isMult: boolean, 
    isDiv: boolean
  ): string {
    if (isAdd) return "Signalwörter wie 'bekommt' oder 'dazu' deuten auf Addition hin.";
    if (isSub) return "Signalwörter wie 'verliert' oder 'gibt ab' deuten auf Subtraktion hin.";
    if (isMult) return "Signalwörter wie 'jeweils' oder 'mal' deuten auf Multiplikation hin.";
    if (isDiv) return "Signalwörter wie 'verteilt' oder 'aufgeteilt' deuten auf Division hin.";
    return "";
  }
  
  private static generateVisualAid(shape: string, length: number, width: number): string {
    // Generiere eine einfache ASCII-Darstellung
    if (shape === 'rectangle') {
      return `
    ${length} cm
   ┌─────────┐
   │         │ ${width} cm
   │         │
   └─────────┘
      `;
    }
    return "";
  }
  
  private static generateFallbackExplanation(
    question: SelectionQuestion,
    answer: string | number
  ): DetailedExplanation {
    return {
      summary: `Die Antwort ist ${answer}`,
      steps: [{
        step: 1,
        description: "Lösung:",
        result: answer
      }],
      tips: ["Überlege dir die Aufgabe Schritt für Schritt."]
    };
  }
  
  private static generateGenericExplanation(
    question: string,
    answer: string | number,
    parseResult: any
  ): DetailedExplanation {
    const steps: ExplanationStep[] = [];
    
    if (parseResult.steps && parseResult.steps.length > 0) {
      parseResult.steps.forEach((step: string, index: number) => {
        steps.push({
          step: index + 1,
          description: index === 0 ? "Aufgabe:" : `Schritt ${index}:`,
          calculation: step
        });
      });
    }
    
    steps.push({
      step: steps.length + 1,
      description: "Ergebnis:",
      result: answer
    });
    
    return {
      summary: `${parseResult.expression || question} = ${answer}`,
      steps,
      tips: ["Prüfe deine Rechnung noch einmal nach."]
    };
  }
}
