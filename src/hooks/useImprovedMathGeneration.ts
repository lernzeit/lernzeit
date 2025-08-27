/**
 * Verbesserter Hook für Mathematik-Fragengenerierung
 * Integriert alle Phase-1-Verbesserungen
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { SelectionQuestion } from '@/types/questionTypes';
import { supabase } from '@/integrations/supabase/client';
import { ImprovedGermanMathParser } from '@/utils/math/ImprovedGermanMathParser';
import { SemanticDuplicateDetector } from '@/utils/math/SemanticDuplicateDetector';
import { StepByStepExplainer } from '@/utils/math/StepByStepExplainer';

export interface MathGenerationConfig {
  grade: number;
  totalQuestions: number;
  enableDuplicateDetection: boolean;
  enableEnhancedExplanations: boolean;
  difficultyLevel: 'easy' | 'medium' | 'hard' | 'mixed';
  // Themengewichtung (summe ~1.0); kann vom Aufrufer überschrieben werden
  topicWeights?: {
    algebra?: number;
    arithmetic?: number;
    fractions?: number;
    percentage?: number;
    geometry?: number;
    patterns?: number;
    wordProblems?: number;
    multipleChoice?: number;
  };
  // KI-Vorlagenverwaltung
  useTemplateRefresh?: boolean; // Edge Function regelmäßig anstoßen
  templateRefreshHours?: number; // Standard 12h
}

export interface GenerationStats {
  totalGenerated: number;
  duplicatesAvoided: number;
  parseErrors: number;
  explanationQuality: number;
  generationTime: number;
}

export function useImprovedMathGeneration(
  userId: string,
  config: MathGenerationConfig
) {
  const [problems, setProblems] = useState<SelectionQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<GenerationStats>({
    totalGenerated: 0,
    duplicatesAvoided: 0,
    parseErrors: 0,
    explanationQuality: 0,
    generationTime: 0
  });

  // Verwende useRef für die Instanz des Duplicate Detectors
  const duplicateDetectorRef = useRef<SemanticDuplicateDetector | null>(null);

  // Initialisiere Duplikaterkennung
  useEffect(() => {
    if (config.enableDuplicateDetection) {
      const detector = new SemanticDuplicateDetector();
      duplicateDetectorRef.current = detector;
      detector.initialize(userId, config.grade);
    }
  }, [userId, config.grade, config.enableDuplicateDetection]);

  // Optional: KI-Templates regelmäßig anstoßen
  useEffect(() => {
    if (!config.useTemplateRefresh) return;
    try {
      const hours = config.templateRefreshHours ?? 12;
      const key = `lastTemplateRefresh_math_grade_${config.grade}`;
      const last = Number(localStorage.getItem(key) || '0');
      const now = Date.now();
      if (now - last > hours * 3600_000) {
        supabase.functions.invoke('template-generator-cron', {
          body: { grade: config.grade, category: 'Mathematik' }
        }).catch((e) => console.warn('Template refresh failed (non-fatal):', e));
        localStorage.setItem(key, String(now));
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [config.useTemplateRefresh, config.templateRefreshHours, config.grade]);

  /**
   * Generiert eine einzelne Mathematik-Frage
   */
  const generateSingleQuestion = useCallback(async (
    existingQuestions: string[]
  ): Promise<SelectionQuestion | null> => {
    const startTime = Date.now();
    
    // Bestimme Zahlenbereich basierend auf Klassenstufe
    const ranges = {
      1: { min: 1, max: 20, operations: ['+', '-'] },
      2: { min: 1, max: 100, operations: ['+', '-'] },
      3: { min: 1, max: 1000, operations: ['+', '-', '×'] },
      4: { min: 1, max: 10000, operations: ['+', '-', '×', '÷'] },
      5: { min: 1, max: 100000, operations: ['+', '-', '×', '÷'] }
    };
    
    const baseConfig = ranges[config.grade as keyof typeof ranges] || ranges[4];

    // Schwierigkeit berücksichtigen
    const level = config.difficultyLevel === 'mixed'
      ? (['easy','medium','hard'] as const)[Math.floor(Math.random()*3)]
      : config.difficultyLevel;

    const rangeMultiplier = level === 'easy' ? 0.6 : level === 'hard' ? 1.5 : 1.0;
    const adjustedMax = Math.max(10, Math.floor(baseConfig.max * rangeMultiplier));
    const adjustedMin = baseConfig.min;

    let operations = [...baseConfig.operations];
    if (level === 'easy') {
      operations = ['+', '-'];
    }
    if (level === 'hard' && !operations.includes('÷') && config.grade >= 4) {
      operations = Array.from(new Set([...operations, '×', '÷']));
    }
    
    let attempts = 0;
    const maxAttempts = 50; // Erhöhe die Versuche deutlich
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // Generiere Operation und passende Zahlen mit kopfrechenfreundlichen Grenzen
      const operation = operations[Math.floor(Math.random() * operations.length)];
      
      let num1 = 0;
      let num2 = 0;
      
      if (config.grade >= 5) {
        // Für Klasse 5+ Priorität auf Kopfrechenbarkeit
        if (operation === '×') {
          // Für Kopfrechnen: zweistellig × einstellige/kleine zweistellige Zahl
          const maxA = level === 'hard' ? 99 : level === 'medium' ? 80 : 60;
          const preferredSmallMultipliers = [6, 7, 8, 9, 10, 11, 12];
          num1 = Math.floor(Math.random() * (maxA - 10)) + 10; // 10..maxA
          // Bevorzuge kleine Multiplikatoren
          num2 = preferredSmallMultipliers[Math.floor(Math.random() * preferredSmallMultipliers.length)];
        } else if (operation === '÷') {
          const divisor = Math.floor(Math.random() * 19) + 2; // 2..20
          const maxQ = level === 'hard' ? 20 : level === 'medium' ? 15 : 12;
          const quotient = Math.floor(Math.random() * (maxQ - 2)) + 2;
          num1 = divisor * quotient;
          num2 = divisor;
        } else {
          const maxA = level === 'hard' ? 500 : level === 'medium' ? 300 : 150;
          const maxB = level === 'hard' ? 300 : level === 'medium' ? 200 : 100;
          num1 = Math.floor(Math.random() * (maxA - adjustedMin + 1)) + adjustedMin;
          num2 = Math.floor(Math.random() * (maxB - 1)) + 1;
          if (operation === '-' && num2 > num1) [num1, num2] = [num2, num1];
        }
      } else {
        // Unter Klasse 5: bisheriges Verhalten
        const a = Math.floor(Math.random() * (adjustedMax - adjustedMin + 1)) + adjustedMin;
        const b = Math.floor(Math.random() * Math.min(adjustedMax / 2, 50)) + 1;
        num1 = a;
        num2 = b;
        if (operation === '-' && num2 > num1) [num1, num2] = [num2, num1];
        if (operation === '÷') {
          num1 = num2 * Math.floor(Math.random() * 10 + 1);
        }
      }
      // Erstelle verschiedene Frageformate
      const formats = [
        `${num1} ${operation} ${num2} = ?`,
        `Was ist ${num1} ${operation} ${num2}?`,
        `Berechne: ${num1} ${operation} ${num2}`,
        `Rechne aus: ${num1} ${operation} ${num2}`
      ];
      
      const questionText = formats[Math.floor(Math.random() * formats.length)];
      
      // Prüfe auf Duplikate nur alle 5 Versuche, um nicht zu streng zu sein
      if (config.enableDuplicateDetection && duplicateDetectorRef.current && attempts % 5 === 0) {
        const duplicateCheck = duplicateDetectorRef.current.checkDuplicate(
          questionText,
          userId,
          config.grade,
          existingQuestions
        );
        
        if (duplicateCheck.isDuplicate) {
          continue; // Versuche erneut
        }
      }
      
      // Parse und berechne die Antwort
      const parseResult = ImprovedGermanMathParser.parse(questionText);
      
      if (!parseResult.success || parseResult.answer === undefined) {
        setStats(prev => ({ ...prev, parseErrors: prev.parseErrors + 1 }));
        continue;
      }
      
      // Generiere Erklärung
      const answer = parseResult.answer;
      let explanation = '';
      
      if (config.enableEnhancedExplanations) {
        const detailedExplanation = StepByStepExplainer.generateExplanation(
          { question: questionText, type: 'math' } as SelectionQuestion,
          answer,
          config.grade
        );
        
        // Formatiere die Erklärung
        explanation = detailedExplanation.summary + '\n\n';
        explanation += detailedExplanation.steps
          .map(step => `${step.step}. ${step.description}${step.calculation ? ': ' + step.calculation : ''}`)
          .join('\n');
        
        if (detailedExplanation.tips && detailedExplanation.tips.length > 0) {
          explanation += '\n\n💡 Tipp: ' + detailedExplanation.tips[0];
        }
      } else {
        explanation = parseResult.steps ? parseResult.steps.join('\n') : `${questionText.replace('?', '')}${answer}`;
      }
      
      // Erstelle die Frage
      const question: SelectionQuestion = {
        id: Math.floor(Math.random() * 1000000),
        question: questionText,
        questionType: 'text-input',
        type: 'math',
        answer: answer.toString(),
        explanation
      };
      
      // Speichere in Duplikaterkennung
      if (config.enableDuplicateDetection && duplicateDetectorRef.current) {
        await duplicateDetectorRef.current.saveQuestion(questionText, userId, config.grade);
      }
      
      const generationTime = Date.now() - startTime;
      setStats(prev => ({
        ...prev,
        totalGenerated: prev.totalGenerated + 1,
        duplicatesAvoided: prev.duplicatesAvoided + (attempts - 1),
        generationTime: prev.generationTime + generationTime
      }));
      
      return question;
    }
    
    return null;
  }, [config, userId]);

  /**
   * Generiert Multiple-Choice-Fragen
   */
  const generateMultipleChoiceQuestion = useCallback(async (
    existingQuestions: string[]
  ): Promise<SelectionQuestion | null> => {
    const baseQuestion = await generateSingleQuestion(existingQuestions);
    
    if (!baseQuestion || baseQuestion.questionType !== 'text-input') {
      return null;
    }
    
    const correctAnswer = parseInt(baseQuestion.answer as string);
    if (isNaN(correctAnswer)) {
      return baseQuestion; // Fallback zu Text-Input
    }
    
    // Generiere falsche Antworten
    const wrongAnswers = new Set<number>();
    const variations = [-10, -5, -2, -1, 1, 2, 5, 10];
    
    // Füge Variationen hinzu
    variations.forEach(delta => {
      const wrong = correctAnswer + delta;
      if (wrong > 0 && wrong !== correctAnswer) {
        wrongAnswers.add(wrong);
      }
    });
    
    // Füge zufällige Antworten hinzu
    while (wrongAnswers.size < 3) {
      const range = Math.max(20, correctAnswer * 0.5);
      const wrong = correctAnswer + Math.floor(Math.random() * range * 2 - range);
      if (wrong > 0 && wrong !== correctAnswer) {
        wrongAnswers.add(wrong);
      }
    }
    
    // Wähle 3 falsche Antworten
    const options = [correctAnswer];
    const wrongArray = Array.from(wrongAnswers);
    for (let i = 0; i < 3 && i < wrongArray.length; i++) {
      options.push(wrongArray[i]);
    }
    
    // Mische die Optionen
    const shuffled = options.sort(() => Math.random() - 0.5);
    const correctIndex = shuffled.indexOf(correctAnswer);
    
    return {
      ...baseQuestion,
      questionType: 'multiple-choice',
      options: shuffled.map(n => n.toString()),
      correctAnswer: correctIndex
    };
  }, [generateSingleQuestion]);

  /**
   * Generiert Textaufgaben
   */
  const generateWordProblem = useCallback(async (
    existingQuestions: string[]
  ): Promise<SelectionQuestion | null> => {
    const templates = config.grade >= 5 ? [
      {
        template: "Ein Rechteck hat Seitenlängen {a} cm und {b} cm. Berechne den Umfang.",
        operation: 'perimeter'
      },
      {
        template: "Ein Rechteck hat die Seiten {a} cm und {b} cm. Berechne die Fläche.",
        operation: 'area'
      },
      {
        template: "Ein Fahrrad fährt mit {a} km/h. Wie weit kommt es in {b} Stunden?",
        operation: 'distance'
      }
    ] : [
      {
        template: "{name} hat {a} {item}. {pronoun} bekommt {b} weitere dazu. Wie viele {item} hat {pronoun} jetzt?",
        operation: '+',
        names: ['Lisa', 'Max', 'Anna', 'Tom'],
        items: ['Äpfel', 'Bonbons', 'Murmeln', 'Stifte'],
        pronouns: { 'Lisa': 'Sie', 'Anna': 'Sie', 'Max': 'Er', 'Tom': 'Er' }
      },
      {
        template: "Im Bus sitzen {a} Personen. An der Haltestelle steigen {b} Personen ein. Wie viele Personen sind jetzt im Bus?",
        operation: '+'
      },
      {
        template: "{name} hat {a} Euro gespart. {pronoun} kauft sich etwas für {b} Euro. Wie viel Geld hat {pronoun} noch?",
        operation: '-',
        names: ['Sarah', 'Paul', 'Emma', 'Leon'],
        pronouns: { 'Sarah': 'Sie', 'Emma': 'Sie', 'Paul': 'Er', 'Leon': 'Er' }
      }
    ];
    
    const template = templates[Math.floor(Math.random() * templates.length)];
    const name = template.names ? template.names[Math.floor(Math.random() * template.names.length)] : '';
    const item = template.items ? template.items[Math.floor(Math.random() * template.items.length)] : '';
    const pronoun = template.pronouns ? template.pronouns[name as keyof typeof template.pronouns] : '';
    
    // Generiere passende Zahlen
    const ranges = {
      1: { max: 20 },
      2: { max: 50 },
      3: { max: 100 },
      4: { max: 500 }
    };
    
    const baseMax = ranges[config.grade as keyof typeof ranges]?.max || 100;

    const level = config.difficultyLevel === 'mixed'
      ? (['easy','medium','hard'] as const)[Math.floor(Math.random()*3)]
      : config.difficultyLevel;

    const rangeMultiplier = level === 'easy' ? 0.6 : level === 'hard' ? 1.5 : 1.0;
    const maxNum = Math.max(10, Math.floor(baseMax * rangeMultiplier));

    let a = Math.floor(Math.random() * maxNum) + 1;
    let b = Math.floor(Math.random() * Math.min(maxNum / 2, 50)) + 1;
    
    if (template.operation === '-') {
      // Stelle sicher, dass a > b
      if (b > a) [a, b] = [b, a];
    }
    
    let questionText = template.template
      .replace(/\{name\}/g, name)
      .replace(/\{pronoun\}/g, pronoun)
      .replace(/\{a\}/g, a.toString())
      .replace(/\{b\}/g, b.toString())
      .replace(/\{item\}/g, item);
    
    // Berechne Antwort
    let answer = 0;
    switch (template.operation) {
      case '+':
        answer = a + b;
        break;
      case '-':
        answer = a - b;
        break;
      case 'perimeter':
        answer = 2 * (a + b);
        break;
      case 'area':
        answer = a * b;
        break;
      case 'distance':
        answer = a * b;
        break;
      default:
        answer = a + b;
    }
    
    // Generiere Erklärung
    const explanationObj = StepByStepExplainer.generateExplanation(
      { question: questionText, type: 'math' } as SelectionQuestion,
      answer,
      config.grade
    );
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: questionText,
      questionType: 'text-input',
      type: 'math',
      answer: answer.toString(),
      explanation: explanationObj.summary + '\n\n' + explanationObj.steps.map(s => 
        `${s.step}. ${s.description}${s.calculation ? ': ' + s.calculation : ''}`
      ).join('\n')
    };
  }, [config]);

  /**
   * Algebra-Fragen-Generator für Klassenstufe 5+
   */
  const generateAlgebraQuestion = useCallback(async (
    existingQuestions: string[]
  ): Promise<SelectionQuestion | null> => {
    const startTime = Date.now();
    try {
      const level = config.difficultyLevel === 'mixed'
        ? (['easy','medium','hard'] as const)[Math.floor(Math.random()*3)]
        : config.difficultyLevel;

      const pickInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
      const subtypes = level === 'easy' ? ['linear1','linear2'] as const
        : level === 'medium' ? ['linear1','linear2','fraction1'] as const
        : ['linear1','linear2','fraction1','balance'] as const;
      const subtype = subtypes[Math.floor(Math.random() * subtypes.length)];

      let a = 0, b = 0, c = 0, d = 0, x = 0;
      let questionText = '';

      if (subtype === 'linear1') {
        a = pickInt(2, 12);
        x = pickInt(1, 30);
        b = pickInt(0, 20);
        c = a * x + b;
        questionText = `Löse die Gleichung: ${a}x + ${b} = ${c}`;
      } else if (subtype === 'linear2') {
        a = pickInt(2, 12);
        x = pickInt(1, 30);
        b = pickInt(0, 20);
        c = a * x - b;
        questionText = `Löse die Gleichung: ${a}x - ${b} = ${c}`;
      } else if (subtype === 'fraction1') {
        const k = pickInt(2, 12);
        b = pickInt(0, 15);
        const rhs = pickInt(2, 20);
        x = k * rhs - b;
        questionText = `Löse: (x + ${b}) / ${k} = ${rhs}`;
      } else { // balance: ax + b = dx + e
        a = pickInt(2, 12);
        d = pickInt(2, 12);
        while (a === d) d = pickInt(2, 12);
        x = pickInt(1, 20);
        b = pickInt(0, 20);
        const e = a * x + b - d * x;
        questionText = `Löse: ${a}x + ${b} = ${d}x + ${e}`;
      }

      if (config.enableDuplicateDetection && duplicateDetectorRef.current) {
        const duplicateCheck = duplicateDetectorRef.current.checkDuplicate(
          questionText,
          userId,
          config.grade,
          existingQuestions
        );
        if (duplicateCheck.isDuplicate) {
          return null;
        }
      }

      const explanation = [
        'So gehst du vor:',
        '1. Bringe alle x-Terme auf eine Seite.',
        '2. Bringe die Zahlen auf die andere Seite.',
        '3. Teile durch den Faktor vor x.',
        `Ergebnis: x = ${x}`
      ].join('\n');

      const question: SelectionQuestion = {
        id: Math.floor(Math.random() * 1000000),
        question: questionText,
        questionType: 'text-input',
        type: 'math',
        answer: x.toString(),
        explanation
      };

      if (config.enableDuplicateDetection && duplicateDetectorRef.current) {
        await duplicateDetectorRef.current.saveQuestion(questionText, userId, config.grade);
      }

      const generationTime = Date.now() - startTime;
      setStats(prev => ({
        ...prev,
        totalGenerated: prev.totalGenerated + 1,
        generationTime: prev.generationTime + generationTime
      }));

      return question;
    } catch (err) {
      console.error('Error generating algebra question:', err);
      return null;
    }
  }, [config, userId]);

  /**
   * Zusätzliche Themen-Generatoren: Bruchrechnung, Prozent, Geometrie, Zahlenmuster
   */
  const generateFractionQuestion = useCallback(async (
    existingQuestions: string[]
  ): Promise<SelectionQuestion | null> => {
    // Wähle Untertypen: gleichnamige Addition/Subtraktion oder Kürzen
    const subtype = Math.random() < 0.5 ? 'same-denominator' : 'simplify';

    if (subtype === 'simplify') {
      // Erzeuge kürzbaren Bruch
      const denominators = [6, 8, 9, 10, 12, 14, 15, 16, 18];
      const d = denominators[Math.floor(Math.random() * denominators.length)];
      // Wähle Zähler so, dass ggT > 1
      const factors = [2, 3, 4, 5, 6];
      const f = factors[Math.floor(Math.random() * factors.length)];
      const base = Math.floor(Math.random() * 3) + 1; // 1..3
      const n = base * f;
      const questionText = `Kürze den Bruch ${n}/${d} vollständig.`;

      if (config.enableDuplicateDetection && duplicateDetectorRef.current) {
        const dup = duplicateDetectorRef.current.checkDuplicate(questionText, userId, config.grade, existingQuestions);
        if (dup.isDuplicate) return null;
      }

      // Kürze
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const g = gcd(n, d);
      const sn = n / g;
      const sd = d / g;
      const answer = `${sn}/${sd}`;

      const explanation = [
        'So gehst du vor:',
        '1. Finde den größten gemeinsamen Teiler (ggT) von Zähler und Nenner.',
        `2. ggT(${n}, ${d}) = ${g}.`,
        `3. Teile Zähler und Nenner durch ${g}.`,
        `Ergebnis: ${n}/${d} = ${sn}/${sd}`
      ].join('\n');

      return {
        id: Math.floor(Math.random() * 1000000),
        question: questionText,
        questionType: 'text-input',
        type: 'math',
        answer,
        explanation
      };
    } else {
      // gleichnamige Addition/Subtraktion
      const denom = Math.floor(Math.random() * 9) + 2; // 2..10
      let a = Math.floor(Math.random() * (denom - 1)) + 1;
      let b = Math.floor(Math.random() * (denom - 1)) + 1;
      const op = Math.random() < 0.5 ? '+' : '-';
      if (op === '-' && b > a) [a, b] = [b, a];

      const questionText = `Berechne: ${a}/${denom} ${op} ${b}/${denom}`;

      if (config.enableDuplicateDetection && duplicateDetectorRef.current) {
        const dup = duplicateDetectorRef.current.checkDuplicate(questionText, userId, config.grade, existingQuestions);
        if (dup.isDuplicate) return null;
      }

      const num = op === '+' ? a + b : a - b;
      // Kürzen falls möglich
      const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
      const g = gcd(num, denom);
      const sn = num / g;
      const sd = denom / g;
      const answer = `${sn}/${sd}`;

      const explanation = [
        'So gehst du vor:',
        '1. Gleiche Nenner: Zähler zusammenrechnen.',
        `2. ${a} ${op} ${b} = ${num}.`,
        `3. Bruch ggf. kürzen: ggT(${num}, ${denom}) = ${g}.`,
        `Ergebnis: ${num}/${denom} = ${sn}/${sd}`
      ].join('\n');

      return {
        id: Math.floor(Math.random() * 1000000),
        question: questionText,
        questionType: 'text-input',
        type: 'math',
        answer,
        explanation
      };
    }
  }, [config, userId]);

  const generatePercentageQuestion = useCallback(async (
    existingQuestions: string[]
  ): Promise<SelectionQuestion | null> => {
    // Nutze prozentuale Anteile, die im Kopf gut gehen
    const percOptions = [10, 20, 25, 50];
    const p = percOptions[Math.floor(Math.random() * percOptions.length)];
    // Wähle Basis so, dass Ergebnis ganzzahlig ist
    const base = p === 25 ? (Math.floor(Math.random() * 16) + 4) * 4 // Vielfaches von 4
               : p === 20 ? (Math.floor(Math.random() * 15) + 5) * 5  // Vielfaches von 5
               : p === 10 ? (Math.floor(Math.random() * 20) + 10) * 10 // Vielfaches von 10
               : (Math.floor(Math.random() * 20) + 4) * 2; // 50% -> gerade Zahl

    const questionText = `Berechne ${p}% von ${base}.`;

    if (config.enableDuplicateDetection && duplicateDetectorRef.current) {
      const dup = duplicateDetectorRef.current.checkDuplicate(questionText, userId, config.grade, existingQuestions);
      if (dup.isDuplicate) return null;
    }

    let answer = 0;
    if (p === 10) answer = base / 10;
    else if (p === 20) answer = base / 5;
    else if (p === 25) answer = base / 4;
    else answer = base / 2; // 50%

    const explanation = [
      'So gehst du vor:',
      p === 10 ? '1. 10% sind ein Zehntel.' : p === 20 ? '1. 20% sind ein Fünftel.' : p === 25 ? '1. 25% sind ein Viertel.' : '1. 50% sind die Hälfte.',
      `2. ${base} : ${p === 10 ? 10 : p === 20 ? 5 : p === 25 ? 4 : 2} = ${answer}.`,
      `Ergebnis: ${answer}`
    ].join('\n');

    return {
      id: Math.floor(Math.random() * 1000000),
      question: questionText,
      questionType: 'text-input',
      type: 'math',
      answer: answer.toString(),
      explanation
    };
  }, [config, userId]);

  const generateGeometryQuestion = useCallback(async (
    existingQuestions: string[]
  ): Promise<SelectionQuestion | null> => {
    // Wähle Untertyp: Umfang Dreieck, Fläche Dreieck, Umfang Rechteck, Fläche Rechteck
    const subtype = ['tri_perimeter','tri_area','rect_perimeter','rect_area'][Math.floor(Math.random()*4)];

    if (subtype === 'tri_perimeter') {
      const a = Math.floor(Math.random() * 15) + 5; // 5..19
      const b = Math.floor(Math.random() * 15) + 5;
      const c = Math.floor(Math.random() * 15) + 5;
      const questionText = `Ein Dreieck hat die Seiten ${a} cm, ${b} cm und ${c} cm. Berechne den Umfang.`;
      if (config.enableDuplicateDetection && duplicateDetectorRef.current) {
        const dup = duplicateDetectorRef.current.checkDuplicate(questionText, userId, config.grade, existingQuestions);
        if (dup.isDuplicate) return null;
      }
      const answer = a + b + c;
      const explanation = `So gehst du vor:\n1. Umfang ist die Summe aller Seiten.\n2. ${a} + ${b} + ${c} = ${answer}.\nErgebnis: ${answer} cm`;
      return { id: Math.floor(Math.random()*1000000), question: questionText, questionType: 'text-input', type: 'math', answer: answer.toString(), explanation };
    }

    if (subtype === 'tri_area') {
      const base = (Math.floor(Math.random() * 15) + 5) * 2; // gerade Zahl
      const height = (Math.floor(Math.random() * 10) + 4) * 2; // gerade Zahl
      const questionText = `Berechne die Fläche eines Dreiecks mit Grundseite ${base} cm und Höhe ${height} cm.`;
      if (config.enableDuplicateDetection && duplicateDetectorRef.current) {
        const dup = duplicateDetectorRef.current.checkDuplicate(questionText, userId, config.grade, existingQuestions);
        if (dup.isDuplicate) return null;
      }
      const answer = (base * height) / 2;
      const explanation = `So gehst du vor:\n1. A = (Grundseite · Höhe) / 2.\n2. (${base} · ${height}) / 2 = ${answer}.\nErgebnis: ${answer} cm²`;
      return { id: Math.floor(Math.random()*1000000), question: questionText, questionType: 'text-input', type: 'math', answer: answer.toString(), explanation };
    }

    if (subtype === 'rect_perimeter') {
      const a = Math.floor(Math.random() * 20) + 5;
      const b = Math.floor(Math.random() * 20) + 5;
      const questionText = `Ein Rechteck hat die Seiten ${a} cm und ${b} cm. Berechne den Umfang.`;
      if (config.enableDuplicateDetection && duplicateDetectorRef.current) {
        const dup = duplicateDetectorRef.current.checkDuplicate(questionText, userId, config.grade, existingQuestions);
        if (dup.isDuplicate) return null;
      }
      const answer = 2 * (a + b);
      const explanation = `So gehst du vor:\n1. Umfang Rechteck: 2·(a+b).\n2. 2·(${a}+${b}) = ${answer}.\nErgebnis: ${answer} cm`;
      return { id: Math.floor(Math.random()*1000000), question: questionText, questionType: 'text-input', type: 'math', answer: answer.toString(), explanation };
    }

    // rect_area
    const a = Math.floor(Math.random() * 20) + 5;
    const b = Math.floor(Math.random() * 20) + 5;
    const questionText = `Ein Rechteck hat die Seiten ${a} cm und ${b} cm. Berechne die Fläche.`;
    if (config.enableDuplicateDetection && duplicateDetectorRef.current) {
      const dup = duplicateDetectorRef.current.checkDuplicate(questionText, userId, config.grade, existingQuestions);
      if (dup.isDuplicate) return null;
    }
    const answer = a * b;
    const explanation = `So gehst du vor:\n1. Fläche Rechteck: a·b.\n2. ${a}·${b} = ${answer}.\nErgebnis: ${answer} cm²`;
    return { id: Math.floor(Math.random()*1000000), question: questionText, questionType: 'text-input', type: 'math', answer: answer.toString(), explanation };
  }, [config, userId]);

  const generateNumberPatternQuestion = useCallback(async (
    existingQuestions: string[]
  ): Promise<SelectionQuestion | null> => {
    // Arithmetische Folge oder alternierendes Muster
    const isArithmetic = Math.random() < 0.7;
    if (isArithmetic) {
      const start = Math.floor(Math.random() * 20);
      const diff = Math.floor(Math.random() * 7) + 2; // 2..8
      const seq = [start, start + diff, start + 2*diff, start + 3*diff];
      const questionText = `Setze fort: ${seq[0]}, ${seq[1]}, ${seq[2]}, ${seq[3]}, ?`;
      if (config.enableDuplicateDetection && duplicateDetectorRef.current) {
        const dup = duplicateDetectorRef.current.checkDuplicate(questionText, userId, config.grade, existingQuestions);
        if (dup.isDuplicate) return null;
      }
      const answer = start + 4*diff;
      const explanation = `So gehst du vor:\n1. Erkenne die Differenz: +${diff}.\n2. Nächste Zahl: ${seq[3]} + ${diff} = ${answer}.`;
      return { id: Math.floor(Math.random()*1000000), question: questionText, questionType: 'text-input', type: 'math', answer: answer.toString(), explanation };
    }

    // Alternierendes Muster, z. B. +a, +b, +a, +b, ...
    const start = Math.floor(Math.random() * 20);
    const a = Math.floor(Math.random() * 6) + 2;
    const b = Math.floor(Math.random() * 6) + 2;
    const seq = [start, start + a, start + a + b, start + 2*a + b];
    const questionText = `Setze fort: ${seq[0]}, ${seq[1]}, ${seq[2]}, ${seq[3]}, ?`;
    if (config.enableDuplicateDetection && duplicateDetectorRef.current) {
      const dup = duplicateDetectorRef.current.checkDuplicate(questionText, userId, config.grade, existingQuestions);
      if (dup.isDuplicate) return null;
    }
    const answer = start + 2*a + 2*b;
    const explanation = `So gehst du vor:\n1. Muster erkennen: +${a}, dann +${b}.\n2. Nächste Zahl: ${seq[3]} + ${b} = ${answer}.`;
    return { id: Math.floor(Math.random()*1000000), question: questionText, questionType: 'text-input', type: 'math', answer: answer.toString(), explanation };
  }, [config, userId]);

  /**
   * Generiert eine einfache Fallback-Frage wenn die normale Generierung fehlschlägt
   */
  const generateSimpleFallbackQuestion = useCallback((
    grade: number,
    existingQuestions: string[],
    questionNumber: number
  ): SelectionQuestion => {
    const operations = ['+', '-'];
    if (grade >= 3) operations.push('×');
    if (grade >= 4) operations.push('÷');

    const operation = operations[Math.floor(Math.random() * operations.length)];
    const maxNum = grade <= 2 ? 20 : grade <= 3 ? 100 : 500;
    
    let a = Math.floor(Math.random() * maxNum) + 1;
    let b = Math.floor(Math.random() * Math.min(maxNum / 2, 20)) + 1;
    
    if (operation === '-' && b > a) [a, b] = [b, a];
    if (operation === '÷') a = b * Math.floor(Math.random() * 10 + 1);
    
    const questionText = `${a} ${operation} ${b} = ?`;
    let answer = 0;
    
    switch (operation) {
      case '+': answer = a + b; break;
      case '-': answer = a - b; break;
      case '×': answer = a * b; break;
      case '÷': answer = a / b; break;
    }
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: questionText,
      questionType: 'text-input',
      type: 'math',
      answer: answer.toString(),
      explanation: `Die Lösung ist ${answer}.\n\n1. Lies die Aufgabe sorgfältig durch\n2. Bestimme die gesuchte Größe\n3. Das Ergebnis ist ${answer}`
    };
  }, []);

  /**
   * Generiert eine Notfall-Frage als letzter Ausweg
   */
  const generateEmergencyFallbackQuestion = useCallback((
    grade: number,
    questionNumber: number
  ): SelectionQuestion => {
    const simpleProblems = [
      { question: '5 + 3 = ?', answer: '8' },
      { question: '10 - 4 = ?', answer: '6' },
      { question: '7 + 2 = ?', answer: '9' },
      { question: '8 - 3 = ?', answer: '5' },
      { question: '6 + 4 = ?', answer: '10' }
    ];
    
    const selected = simpleProblems[questionNumber % simpleProblems.length];
    
    return {
      id: Math.floor(Math.random() * 1000000),
      question: selected.question,
      questionType: 'text-input',
      type: 'math',
      answer: selected.answer,
      explanation: `Die Lösung ist ${selected.answer}.\n\n1. Lies die Aufgabe sorgfältig durch\n2. Bestimme die gesuchte Größe\n3. Das Ergebnis ist ${selected.answer}`
    };
  }, []);

  /**
   * Hauptfunktion zum Generieren aller Fragen
   */
  const generateProblems = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    const startTime = Date.now();
    
    try {
      const generatedProblems: SelectionQuestion[] = [];
      const existingQuestions: string[] = problems.map(p => p.question);
      
      // Parameterisierte Themengewichtung (überschreibbar via config.topicWeights)
      const mergedWeights = (() => {
        const defaults = config.grade >= 5 ? {
          algebra: 0.4,
          fractions: 0.2,
          percentage: 0.15,
          geometry: 0.15,
          patterns: 0.1,
          arithmetic: 0.0,
          wordProblems: 0.0,
          multipleChoice: 0.0
        } : {
          arithmetic: 0.4,
          wordProblems: 0.2,
          geometry: 0.15,
          patterns: 0.1,
          fractions: 0.1,
          percentage: 0.05,
          algebra: 0.0,
          multipleChoice: 0.0
        };
        const custom = config.topicWeights || {};
        const merged: Record<string, number> = { ...defaults, ...custom };
        const entries = Object.entries(merged);
        const total = entries.reduce((s, [, v]) => s + (v || 0), 0) || 1;
        return entries.map(([k, v]) => [k, (v || 0) / total]) as Array<[string, number]>;
      })();

      const pickTopic = () => {
        const r = Math.random();
        let acc = 0;
        for (const [k, p] of mergedWeights) {
          acc += p;
          if (r <= acc) return k as keyof NonNullable<MathGenerationConfig['topicWeights']>;
        }
        return mergedWeights[mergedWeights.length - 1][0] as keyof NonNullable<MathGenerationConfig['topicWeights']>;
      };
      
      for (let i = 0; i < config.totalQuestions; i++) {
        let question: SelectionQuestion | null = null;
        let attempts = 0;
        const maxAttempts = 3;

        while (!question && attempts < maxAttempts) {
          attempts++;
          try {
            const topic = pickTopic();
            switch (topic) {
              case 'algebra':
                if (config.grade >= 5) question = await generateAlgebraQuestion(existingQuestions);
                break;
              case 'fractions':
                question = await generateFractionQuestion(existingQuestions);
                break;
              case 'percentage':
                question = await generatePercentageQuestion(existingQuestions);
                break;
              case 'geometry':
                question = await generateGeometryQuestion(existingQuestions);
                break;
              case 'patterns':
                question = await generateNumberPatternQuestion(existingQuestions);
                break;
              case 'wordProblems':
                if (config.grade <= 4) question = await generateWordProblem(existingQuestions);
                break;
              case 'multipleChoice':
                question = await generateMultipleChoiceQuestion(existingQuestions);
                break;
              case 'arithmetic':
              default:
                question = await generateSingleQuestion(existingQuestions);
                break;
            }

            // Fallback-Kette, falls gewählte Topic-Generation nichts liefert
            if (!question) {
              if (config.grade >= 5) {
                question = await generateAlgebraQuestion(existingQuestions) ||
                           await generatePercentageQuestion(existingQuestions) ||
                           await generateGeometryQuestion(existingQuestions) ||
                           await generateFractionQuestion(existingQuestions) ||
                           await generateNumberPatternQuestion(existingQuestions) ||
                           await generateSingleQuestion(existingQuestions);
              } else {
                question = await generateSingleQuestion(existingQuestions) ||
                           await generateWordProblem(existingQuestions) ||
                           await generateGeometryQuestion(existingQuestions) ||
                           await generateNumberPatternQuestion(existingQuestions);
              }
            }
          } catch (error) {
            console.warn(`Generation attempt ${attempts} failed for question ${i + 1}:`, error);
          }
        }

        if (question) {
          generatedProblems.push(question);
          existingQuestions.push(question.question);
          console.log(`✅ Successfully generated question ${i + 1} on attempt ${attempts}`);
        } else {
          console.error(`❌ Failed to generate question ${i + 1} after ${maxAttempts} attempts`);
          // Als absoluter Fallback: Erstelle eine einfache Mathe-Aufgabe
          const fallbackQuestion = generateEmergencyFallbackQuestion(config.grade, i + 1);
          generatedProblems.push(fallbackQuestion);
          existingQuestions.push(fallbackQuestion.question);
        }
      }
      
      setProblems(generatedProblems);
      
      // Berechne finale Statistiken
      const totalTime = Date.now() - startTime;
      setStats(prev => ({
        ...prev,
        generationTime: totalTime,
        explanationQuality: config.enableEnhancedExplanations ? 0.9 : 0.5
      }));
      
      console.log(`✅ Generated ${generatedProblems.length} math problems in ${totalTime}ms`);
      console.log(`📊 Stats:`, stats);
      
    } catch (err) {
      console.error('Error generating problems:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsGenerating(false);
    }
  }, [config, problems, stats, generateSingleQuestion, generateMultipleChoiceQuestion, generateWordProblem, generateAlgebraQuestion]);

  /**
   * Lädt Templates aus der Datenbank
   */
  const loadDatabaseTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('domain', 'Mathematik')
        .eq('grade', config.grade)
        .eq('status', 'ACTIVE')
        .gte('quality_score', 0.7)
        .order('quality_score', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error loading templates:', error);
        return [];
      }
      
      return data || [];
    } catch (err) {
      console.error('Database error:', err);
      return [];
    }
  }, [config.grade]);

  /**
   * Generiert eine Frage aus einem Template
   */
  const generateFromTemplate = useCallback(async (
    template: any,
    existingQuestions: string[]
  ): Promise<SelectionQuestion | null> => {
    try {
      // Parse Template-Parameter
      const params = JSON.parse(template.parameters || '{}');
      
      // Generiere neue Werte für Parameter
      const values: Record<string, number> = {};
      for (const [key, range] of Object.entries(params)) {
        if (typeof range === 'object' && range && 'min' in range && 'max' in range) {
          const r = range as { min: number; max: number };
          values[key] = Math.floor(
            Math.random() * (r.max - r.min + 1) + r.min
          );
        }
      }
      
      // Ersetze Platzhalter im Template
      let questionText = template.template;
      for (const [key, value] of Object.entries(values)) {
        questionText = questionText.replace(new RegExp(`\\{${key}\\}`, 'g'), value.toString());
      }
      
      // Prüfe auf Duplikate
      if (config.enableDuplicateDetection && duplicateDetectorRef.current) {
        const duplicateCheck = duplicateDetectorRef.current.checkDuplicate(
          questionText,
          userId,
          config.grade,
          existingQuestions
        );
        
        if (duplicateCheck.isDuplicate) {
          return null;
        }
      }
      
      // Parse und berechne Antwort
      const parseResult = ImprovedGermanMathParser.parse(questionText);
      
      if (!parseResult.success || parseResult.answer === undefined) {
        return null;
      }
      
      // Generiere Erklärung
      const explanation = StepByStepExplainer.generateExplanation(
        { question: questionText, type: 'math' } as SelectionQuestion,
        parseResult.answer,
        config.grade
      );
      
      return {
        id: Math.floor(Math.random() * 1000000),
        question: questionText,
        questionType: template.question_type || 'text-input',
        type: 'math',
        answer: parseResult.answer.toString(),
        explanation: explanation.summary + '\n\n' + 
          explanation.steps.map(s => `${s.step}. ${s.description}`).join('\n')
      };
      
    } catch (err) {
      console.error('Error generating from template:', err);
      return null;
    }
  }, [config, userId]);

  /**
   * Regeneriert eine einzelne Frage
   */
  const regenerateQuestion = useCallback(async (index: number) => {
    if (index < 0 || index >= problems.length) return;
    
    const existingQuestions = problems.map(p => p.question);
    const newQuestion = await generateSingleQuestion(existingQuestions);
    
    if (newQuestion) {
      const newProblems = [...problems];
      newProblems[index] = newQuestion;
      setProblems(newProblems);
    }
  }, [problems, generateSingleQuestion]);

  /**
   * Exportiert die generierten Fragen
   */
  const exportProblems = useCallback(() => {
    const exportData = {
      metadata: {
        userId,
        grade: config.grade,
        generatedAt: new Date().toISOString(),
        totalQuestions: problems.length,
        stats
      },
      problems: problems.map(p => ({
        question: p.question,
        answer: p.questionType === 'text-input' ? p.answer : p.questionType === 'multiple-choice' ? p.options[p.correctAnswer] : 'N/A',
        type: p.questionType,
        explanation: p.explanation
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `math-problems-grade${config.grade}-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [problems, config, userId, stats]);

  return {
    problems,
    isGenerating,
    error,
    stats,
    generateProblems,
    regenerateQuestion,
    exportProblems,
    loadDatabaseTemplates,
    generateFromTemplate
  };
}