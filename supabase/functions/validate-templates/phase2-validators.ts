/**
 * Phase 2 Enhanced Validation Functions
 * Advanced mathematical and contextual validation logic
 */

/**
 * Enhanced mathematical correctness validation with Euro/Money calculation logic
 */
export function validateMathematicalCorrectness(prompt: string, solution: any): string[] {
  const issues: string[] = [];
  const lowerPrompt = prompt.toLowerCase();

  if (!solution) return ['Keine Lösung für mathematische Validierung'];

  // Extract solution value
  let solutionValue: number | null = null;
  if (typeof solution === 'string') {
    solutionValue = parseFloat(solution);
  } else if (solution.value !== undefined) {
    solutionValue = parseFloat(String(solution.value));
  } else if (solution.answer !== undefined) {
    solutionValue = parseFloat(String(solution.answer));
  }

  if (isNaN(solutionValue || 0)) {
    return issues; // Skip for non-numeric solutions
  }

  // Enhanced Euro/Money calculation validation
  if (lowerPrompt.includes('€') || lowerPrompt.includes('euro') || lowerPrompt.includes('geld')) {
    const euroResult = validateEuroCalculations(prompt, solutionValue || 0);
    if (euroResult.errors.length > 0) {
      issues.push(...euroResult.errors);
    }
  }

  // Extract all numbers for general validation
  const numbers = prompt.match(/\d+(?:[.,]\d+)?/g);
  if (!numbers || numbers.length < 2) {
    return issues; // Need at least 2 numbers for basic validation
  }

  const num1 = parseFloat(numbers[0].replace(',', '.'));
  const num2 = parseFloat(numbers[1].replace(',', '.'));

  // Basic arithmetic validation
  if (lowerPrompt.includes('+') || lowerPrompt.includes('plus') || lowerPrompt.includes('addiere') || lowerPrompt.includes('zusammen')) {
    const expected = num1 + num2;
    if (Math.abs(expected - (solutionValue || 0)) > 0.01) {
      issues.push(`Addition falsch: ${num1}+${num2}=${expected}, Lösung: ${solutionValue}`);
    }
  }

  if (lowerPrompt.includes('−') || lowerPrompt.includes('-') || lowerPrompt.includes('minus') || lowerPrompt.includes('weniger')) {
    const expected = num1 - num2;
    if (Math.abs(expected - (solutionValue || 0)) > 0.01) {
      issues.push(`Subtraktion falsch: ${num1}-${num2}=${expected}, Lösung: ${solutionValue}`);
    }
  }

  if (lowerPrompt.includes('×') || lowerPrompt.includes('*') || lowerPrompt.includes('mal') || lowerPrompt.includes('zu je') || lowerPrompt.includes('jeweils')) {
    const expected = num1 * num2;
    if (Math.abs(expected - (solutionValue || 0)) > 0.01) {
      issues.push(`Multiplikation falsch: ${num1}×${num2}=${expected}, Lösung: ${solutionValue}`);
      
      // Check for common addition error
      const wrongAddition = num1 + num2;
      if (Math.abs(wrongAddition - (solutionValue || 0)) < 0.01) {
        issues.push(`KRITISCHER FEHLER: Addition (${num1}+${num2}=${wrongAddition}) statt Multiplikation (${num1}×${num2}=${expected}) bei "zu je"-Aufgabe!`);
      }
    }
  }

  if (lowerPrompt.includes('÷') || lowerPrompt.includes('/') || lowerPrompt.includes('geteilt') || lowerPrompt.includes('aufteilen')) {
    if (num2 === 0) {
      issues.push('Division durch Null ist nicht definiert');
    } else {
      const expected = num1 / num2;
      if (Math.abs(expected - (solutionValue || 0)) > 0.01) {
        issues.push(`Division falsch: ${num1}÷${num2}=${expected}, Lösung: ${solutionValue}`);
      }
    }
  }

  // Range validation
  if ((solutionValue || 0) < 0 && !lowerPrompt.includes('negativ') && !lowerPrompt.includes('schulden')) {
    issues.push('Negative Lösung ohne entsprechenden Kontext');
  }

  return issues;
}

/**
 * Specialized Euro/Money calculation validator
 */
function validateEuroCalculations(prompt: string, solutionValue: number): { expected: number | null; errors: string[] } {
  const p = prompt.toLowerCase().replace(/\s+/g, ' ');
  const errors: string[] = [];
  let expected: number | null = null;

  // Extract numbers
  const numbers = [...prompt.matchAll(/(\d+(?:[.,]\d+)?)/g)].map(m => parseFloat(m[1].replace(',', '.')));

  // Pattern 1: "X Äpfel zu je Y €" - should be X * Y
  const multiplyPattern = /(\d+(?:[.,]\d+)?)\s+[^.]*?(zu\s+je|jeweils|je|pro)\s*(\d+(?:[.,]\d+)?)\s*(€|euro)/gi;
  for (const match of p.matchAll(multiplyPattern)) {
    const qty = parseFloat(match[1].replace(',', '.'));
    const price = parseFloat(match[3].replace(',', '.'));
    if (!isNaN(qty) && !isNaN(price)) {
      expected = qty * price;
      
      if (Math.abs(expected - solutionValue) > 0.01) {
        errors.push(`Euro-Berechnung falsch: ${qty} × ${price} = ${expected}€, nicht ${solutionValue}€`);
        
        // Check for addition error
        const wrongSum = qty + price;
        if (Math.abs(wrongSum - solutionValue) < 0.01) {
          errors.push(`SCHWERER FEHLER: Addition (${qty}+${price}=${wrongSum}€) statt Multiplikation bei "zu je"-Aufgabe!`);
        }
      }
      break;
    }
  }

  // Pattern 2: "X Äpfel für Y €" - bundle price, should be Y
  const bundlePattern = /(\d+(?:[.,]\d+)?)\s+[^.]*?für\s*(\d+(?:[.,]\d+)?)\s*(€|euro)/gi;
  for (const match of p.matchAll(bundlePattern)) {
    const bundlePrice = parseFloat(match[2].replace(',', '.'));
    if (!isNaN(bundlePrice)) {
      expected = bundlePrice;
      if (Math.abs(expected - solutionValue) > 0.01) {
        errors.push(`Bundle-Preis falsch: "für ${bundlePrice}€" bedeutet Gesamtpreis ${bundlePrice}€, nicht ${solutionValue}€`);
      }
      break;
    }
  }

  return { expected, errors };
}

/**
 * Context and semantic validation
 */
export function validateContext(prompt: string, template: any): string[] {
  const issues: string[] = [];
  const lowerPrompt = prompt.toLowerCase();

  // Check for incomplete context
  if (lowerPrompt.includes('wie viele') && !lowerPrompt.includes('gibt es') && !lowerPrompt.includes('sind')) {
    issues.push('Unvollständige Fragestellung: "Wie viele" ohne Objektangabe');
  }

  // Check for missing units
  if ((lowerPrompt.includes('meter') || lowerPrompt.includes('zentimeter')) && 
      !lowerPrompt.includes('lang') && !lowerPrompt.includes('weit') && !lowerPrompt.includes('hoch')) {
    issues.push('Längeneinheit ohne entsprechende Messgröße');
  }

  // Check for time inconsistencies
  if (lowerPrompt.includes('stunde') && lowerPrompt.includes('minute')) {
    const hours = prompt.match(/(\d+)\s*stunde/i);
    const minutes = prompt.match(/(\d+)\s*minute/i);
    if (hours && minutes) {
      const h = parseInt(hours[1]);
      const m = parseInt(minutes[1]);
      if (m >= 60) {
        issues.push('Zeitangabe inkonsistent: Minuten >= 60');
      }
    }
  }

  // Check for age-appropriate content
  const grade = template.grade || 1;
  if (grade <= 3 && lowerPrompt.includes('prozent')) {
    issues.push('Prozentrechnung für zu niedrige Klassenstufe');
  }

  if (grade <= 2 && (lowerPrompt.includes('bruch') || lowerPrompt.includes('drittel'))) {
    issues.push('Bruchrechnung für zu niedrige Klassenstufe');
  }

  // Check for realistic scenarios
  if (lowerPrompt.includes('apfel') || lowerPrompt.includes('äpfel')) {
    const numbers = prompt.match(/\d+/g);
    if (numbers && parseInt(numbers[0]) > 100) {
      issues.push('Unrealistisches Szenario: Zu viele Äpfel für alltägliche Situation');
    }
  }

  return issues;
}

/**
 * Quality distribution analysis
 */
export function analyzeQualityDistribution(results: any[]): any {
  const distribution = {
    excellent: 0, // score >= 0.9
    good: 0,      // score >= 0.7
    fair: 0,      // score >= 0.5  
    poor: 0       // score < 0.5
  };

  results.forEach(result => {
    const score = result.score || 0;
    if (score >= 0.9) distribution.excellent++;
    else if (score >= 0.7) distribution.good++;
    else if (score >= 0.5) distribution.fair++;
    else distribution.poor++;
  });

  return distribution;
}

/**
 * Issue categorization for analysis
 */
export function categorizeIssues(results: any[]): any {
  const categories = {
    circular_tasks: 0,
    visual_tasks: 0,
    math_errors: 0,
    curriculum_misalignment: 0,
    missing_solutions: 0,
    context_issues: 0
  };

  results.forEach(result => {
    result.issues?.forEach((issue: string) => {
      const lowerIssue = issue.toLowerCase();
      if (lowerIssue.includes('zirkuläre') || lowerIssue.includes('lineal')) {
        categories.circular_tasks++;
      } else if (lowerIssue.includes('visuelle') || lowerIssue.includes('zeichne')) {
        categories.visual_tasks++;
      } else if (lowerIssue.includes('rechnung') || lowerIssue.includes('falsch')) {
        categories.math_errors++;
      } else if (lowerIssue.includes('klassen') || lowerIssue.includes('zahlenraum')) {
        categories.curriculum_misalignment++;
      } else if (lowerIssue.includes('lösung') || lowerIssue.includes('fehlt')) {
        categories.missing_solutions++;
      } else if (lowerIssue.includes('kontext') || lowerIssue.includes('unvollständig')) {
        categories.context_issues++;
      }
    });
  });

  return categories;
}

/**
 * Generate recommendations based on analysis
 */
export function generateRecommendations(qualityDist: any, issueCategories: any): string[] {
  const recommendations: string[] = [];

  if (qualityDist.poor > qualityDist.excellent) {
    recommendations.push('🚨 Generierungsqualität verbessern - zu viele schlechte Templates');
  }

  if (issueCategories.circular_tasks > 5) {
    recommendations.push('🔄 Zirkuläre Aufgaben-Filter verstärken');
  }

  if (issueCategories.math_errors > 10) {
    recommendations.push('🧮 Mathematische Validierung vor Template-Erstellung aktivieren');
  }

  if (issueCategories.curriculum_misalignment > 8) {
    recommendations.push('📚 Curriculum-Alignment in Generierung verbessern');
  }

  if (issueCategories.visual_tasks > 3) {
    recommendations.push('👁️ Visuelle Aufgaben-Detection verstärken');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Qualität ist zufriedenstellend - keine kritischen Probleme erkannt');
  }

  return recommendations;
}

/**
 * Enhanced validation patterns specifically for first-grade templates
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