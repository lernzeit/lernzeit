/**
 * Enhanced first-grade specific validation for template quality
 */

export interface FirstGradeValidationIssues {
  subjective: string[];
  missingVisual: string[];
  inappropriateComplexity: string[];
  uiIncompatibility: string[];
}

export function validateFirstGradeTemplate(template: any): { isValid: boolean; issues: FirstGradeValidationIssues; shouldExclude: boolean } {
  const issues: FirstGradeValidationIssues = {
    subjective: [],
    missingVisual: [],
    inappropriateComplexity: [],
    uiIncompatibility: []
  };

  const prompt = (template.student_prompt || '').toLowerCase();
  let shouldExclude = false;

  // 1. CRITICAL: Detect subjective content that cannot be answered objectively
  const subjectivePatterns = [
    /lieblings/,
    /schönst/,
    /best[^i]/,
    /welch.*magst/,
    /welch.*findest/,
    /dein.*favorit/
  ];

  subjectivePatterns.forEach(pattern => {
    if (pattern.test(prompt)) {
      issues.subjective.push(`Subjektive Frage erkannt: ${pattern.source}`);
      shouldExclude = true;
    }
  });

  // 2. CRITICAL: Detect questions requiring visual support without providing it
  const visualRequiredPatterns = [
    { pattern: /betrachte.*bild/, message: 'Bildbetrachtung ohne bereitgestelltes Bild' },
    { pattern: /welche.*form.*siehst/, message: 'Formerkennung ohne visuelle Unterstützung' },
    { pattern: /schaue.*an/, message: 'Visuelle Betrachtung ohne Material' },
    { pattern: /zeige.*auf/, message: 'Zeigegeste digital unmöglich' }
  ];

  visualRequiredPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(prompt)) {
      issues.missingVisual.push(message);
      shouldExclude = true; // Critical for first grade
    }
  });

  // 3. CRITICAL: Detect inappropriate complexity
  const complexityIssues = [];
  
  // Numbers too large for first grade
  const numbers = template.student_prompt?.match(/\d+/g) || [];
  const maxNumber = Math.max(...numbers.map((n: string) => parseInt(n))) || 0;
  if (maxNumber > 20) {
    complexityIssues.push(`Zahlen zu groß für Klasse 1: ${maxNumber}`);
  }

  // Advanced mathematical operations
  if (prompt.includes('×') || prompt.includes('÷') || prompt.includes('prozent')) {
    complexityIssues.push('Zu fortgeschrittene mathematische Operationen');
  }

  // Complex vocabulary
  const complexWords = ['variable', 'gleichung', 'bruch', 'dezimal'];
  complexWords.forEach(word => {
    if (prompt.includes(word)) {
      complexityIssues.push(`Zu komplexer Begriff für Klasse 1: ${word}`);
    }
  });

  issues.inappropriateComplexity = complexityIssues;
  if (complexityIssues.length > 0) {
    shouldExclude = true;
  }

  // 4. UI compatibility issues
  const uiIssues = [];
  
  if (template.question_type === 'MULTIPLE_CHOICE') {
    const distractors = template.distractors;
    if (!Array.isArray(distractors) || distractors.length < 2) {
      uiIssues.push('Multiple-Choice ohne ausreichende Optionen');
      shouldExclude = true;
    }
  }

  if (template.question_type === 'SORT') {
    uiIssues.push('Sortieraufgaben zu komplex für Klasse 1');
    shouldExclude = true;
  }

  if (template.question_type === 'MATCH') {
    uiIssues.push('Zuordnungsaufgaben zu komplex für Klasse 1');
    shouldExclude = true;
  }

  issues.uiIncompatibility = uiIssues;

  const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);
  
  return {
    isValid: totalIssues === 0,
    issues,
    shouldExclude
  };
}

/**
 * Enhanced validation patterns specifically for the validate-templates function
 */
export function checkFirstGradeProblematicPatterns(prompt: string): string[] {
  const issues: string[] = [];
  const lowerPrompt = prompt.toLowerCase();

  // 🚨 FIRST-GRADE CRITICAL: Subjective questions
  const subjectivePatterns = [
    { pattern: /lieblings/, message: '🚨 ERSTKLÄSSLER: Subjektive Lieblingsfrage' },
    { pattern: /schönst/, message: '🚨 ERSTKLÄSSLER: Subjektive Schönheitsfrage' },
    { pattern: /welch.*magst/, message: '🚨 ERSTKLÄSSLER: Subjektive Präferenzfrage' },
    { pattern: /dein.*favorit/, message: '🚨 ERSTKLÄSSLER: Subjektive Favoritenfrage' }
  ];

  // 🚨 FIRST-GRADE CRITICAL: Questions requiring unavailable visual elements
  const visualPatterns = [
    { pattern: /betrachte.*bild/, message: '🚨 ERSTKLÄSSLER: Bildbetrachtung ohne Bild' },
    { pattern: /welche.*form(?!el)/, message: '🚨 ERSTKLÄSSLER: Formerkennung ohne Visuals' },
    { pattern: /schaue.*an/, message: '🚨 ERSTKLÄSSLER: Visuelle Aufgabe ohne Material' },
    { pattern: /zeige.*auf/, message: '🚨 ERSTKLÄSSLER: Zeigegeste digital unmöglich' }
  ];

  // 🚨 FIRST-GRADE CRITICAL: Personal measurements impossible to complete
  const personalPatterns = [
    { pattern: /miss.*dein/, message: '🚨 ERSTKLÄSSLER: Persönliche Messung unmöglich' },
    { pattern: /länge.*dein/, message: '🚨 ERSTKLÄSSLER: Persönliche Längenmessung' },
    { pattern: /größe.*dein/, message: '🚨 ERSTKLÄSSLER: Persönliche Körpergrößenmessung' }
  ];

  [...subjectivePatterns, ...visualPatterns, ...personalPatterns].forEach(({ pattern, message }) => {
    if (pattern.test(lowerPrompt)) {
      issues.push(message);
    }
  });

  return issues;
}