import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  template_ids?: string[];
  grade?: number;
  domain?: string;
  batch_size?: number;
}

interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: string[];
  shouldExclude: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json() as ValidationRequest;
    const { template_ids, grade, domain, batch_size = 50 } = body;

    console.log('🔍 Starting Phase 2 systematic template validation...', { template_ids, grade, domain, batch_size });

    // Build query to fetch templates for validation
    let query = supabase
      .from('templates')
      .select('*')
      .eq('status', 'ACTIVE');

    if (template_ids && template_ids.length > 0) {
      query = query.in('id', template_ids);
    }
    if (grade) {
      query = query.eq('grade', grade);
    }
    if (domain) {
      query = query.eq('domain', domain);
    }

    query = query.limit(batch_size);

    const { data: templates, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Template fetch error: ${fetchError.message}`);
    }

    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No templates found for validation',
        validated: 0,
        invalid: 0,
        excluded: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📊 Validating ${templates.length} templates...`);

    let validatedCount = 0;
    let invalidCount = 0;
    let excludedCount = 0;
    const validationResults: any[] = [];

    // Validate each template
    for (const template of templates) {
      try {
        const result = await validateTemplate(template);
        
        // Update template in database with validation results
        const updateData: any = {
          validation_status: result.isValid ? 'valid' : 'invalid',
          quality_score: result.score,
          last_validated: new Date().toISOString()
        };

        // If template should be excluded, mark as ARCHIVED
        if (result.shouldExclude) {
          updateData.status = 'ARCHIVED';
          excludedCount++;
        }

        const { error: updateError } = await supabase
          .from('templates')
          .update(updateData)
          .eq('id', template.id);

        if (updateError) {
          console.error(`Update error for template ${template.id}:`, updateError);
        } else {
          validatedCount++;
          if (!result.isValid) invalidCount++;
        }

        validationResults.push({
          template_id: template.id,
          prompt: template.student_prompt?.substring(0, 100) + '...',
          ...result
        });

      } catch (error) {
        console.error(`Validation error for template ${template.id}:`, error);
        invalidCount++;
      }
    }

    // Phase 2: Additional analysis and reporting
    const qualityDistribution = analyzeQualityDistribution(validationResults);
    const issueCategories = categorizeIssues(validationResults);
    
    console.log(`✅ Phase 2 validation complete: ${validatedCount} processed, ${invalidCount} invalid, ${excludedCount} excluded`);
    console.log(`📊 Quality distribution:`, qualityDistribution);

    return new Response(JSON.stringify({
      success: true,
      validated: validatedCount,
      invalid: invalidCount,
      excluded: excludedCount,
      total: templates.length,
      quality_distribution: qualityDistribution,
      issue_categories: issueCategories,
      problematic_templates: validationResults
        .filter(r => !r.isValid || r.shouldExclude)
        .slice(0, 15),
      recommendations: generateRecommendations(qualityDistribution, issueCategories),
      message: `Phase 2: Validated ${validatedCount} templates, found ${invalidCount} invalid, excluded ${excludedCount}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Phase 1 validation function error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Phase 2 comprehensive template validation function with enhanced logic checking
 */
async function validateTemplate(template: any): Promise<ValidationResult> {
  const issues: string[] = [];
  let score = 0.8; // Base score
  let shouldExclude = false;

  const prompt = template.student_prompt || '';
  const solution = template.solution;
  const grade = template.grade || 1;

  // 1. Basic requirements
  if (!prompt || prompt.length < 10) {
    issues.push('Prompt zu kurz oder fehlend');
    score -= 0.3;
  }

  if (!solution) {
    issues.push('Lösung fehlt');
    score -= 0.4;
  }

  // 2. Phase 2: Enhanced problematic pattern detection
  const problematicIssues = checkProblematicPatterns(prompt);
  issues.push(...problematicIssues);
  if (problematicIssues.length > 0) {
    score = 0.2; // Very low score for problematic content
    shouldExclude = true; // Exclude immediately
  }

  // 2.1. FIRST-GRADE SPECIFIC: Additional validation for grade 1 templates
  if (grade === 1) {
    const firstGradeIssues = checkFirstGradeProblematicPatterns(prompt);
    issues.push(...firstGradeIssues);
    if (firstGradeIssues.length > 0) {
      score = 0.1; // Even lower score for first-grade issues
      shouldExclude = true;
    }
  }

  // 3. Phase 2: Enhanced solution validation with mathematical logic
  const solutionIssues = validateMathSolution(prompt, solution);
  if (!solutionIssues.isValid) {
    issues.push(solutionIssues.reason || 'Lösungsformat ungültig');
    score -= 0.3;
  }

  // 4. Phase 2: Advanced complexity assessment
  const complexity = assessComplexity(prompt, grade);
  if (complexity > 0.8 && grade <= 2) {
    issues.push('Zu komplex für Klassenstufe');
    score -= 0.2;
  }

  // 5. Phase 2: Enhanced mathematical correctness check
  const mathValidationIssues = validateMathematicalCorrectness(prompt, solution);
  issues.push(...mathValidationIssues);
  if (mathValidationIssues.length > 0) {
    score -= mathValidationIssues.length * 0.15;
  }

  // 6. Phase 2: Context and semantic validation
  const contextIssues = validateContext(prompt, template);
  issues.push(...contextIssues);
  if (contextIssues.length > 0) {
    score -= contextIssues.length * 0.1;
  }

  // 7. Phase 2: Higher quality threshold
  if (score < 0.6) {
    shouldExclude = true;
  }

  return {
    isValid: issues.length === 0,
    score: Math.max(0, Math.min(1, score)),
    issues,
    shouldExclude
  };
}

/**
 * Phase 1: Check for problematic question patterns (IMMEDIATE EXCLUSIONS)
 */
function checkProblematicPatterns(prompt: string): string[] {
  const issues: string[] = [];
  const lowerPrompt = prompt.toLowerCase();

  // 🚨 CRITICAL: Circular/impossible tasks
  const circularPatterns = [
    { pattern: /miss.*lineal.*lineal/, message: '🚨 KRITISCH: Zirkuläre Messaufgabe (Lineal mit Lineal)' },
    { pattern: /wie lang.*lineal/, message: '🚨 KRITISCH: Unmögliche Linealmessung' },
    { pattern: /größe.*dein/, message: '🚨 KRITISCH: Persönliche Messung unmöglich' },
    { pattern: /miss.*bleistift.*ohne/, message: '🚨 KRITISCH: Bleistift ohne Messwerkzeug messen' },
    { pattern: /länge.*eingeben.*lineal/, message: '🚨 KRITISCH: Keine Standard-Lineallänge verfügbar' }
  ];

  // 🚨 CRITICAL: Visual/drawing tasks that cannot be completed digitally
  const visualPatterns = [
    { pattern: /zeichne|male|konstruiere/, message: '🚨 KRITISCH: Visuelle Aufgabe digital unmöglich' },
    { pattern: /bastle|schneide|klebe|falte/, message: '🚨 KRITISCH: Physische Manipulation unmöglich' },
    { pattern: /markiere|verbinde.*linie/, message: '🚨 KRITISCH: Interaktive Aufgabe ohne Interface' },
    { pattern: /ordne.*zu(?!.*zahl)/i, message: '🚨 KRITISCH: Zuordnung ohne visuelle Elemente' },
    { pattern: /betrachte.*bild|welches bild/, message: '🚨 KRITISCH: Bildaufgabe ohne bereitgestelltes Bild' },
    { pattern: /schaue dir.*an|sieh dir.*an/, message: '🚨 KRITISCH: Visuelle Betrachtung ohne Material' }
  ];

  // Check all critical patterns
  [...circularPatterns, ...visualPatterns].forEach(({ pattern, message }) => {
    if (pattern.test(lowerPrompt)) {
      issues.push(message);
    }
  });

  // Additional blacklist keywords
  const blacklistWords = ['miss dein', 'länge deines', 'wie alt bist du', 'deine lieblingsfarbe'];
  blacklistWords.forEach(word => {
    if (lowerPrompt.includes(word)) {
      issues.push(`🚨 KRITISCH: Blacklist-Wort "${word}" erkannt`);
    }
  });

  return issues;
}

/**
 * Validate mathematical solution
 */
function validateMathSolution(prompt: string, solution: any): { isValid: boolean; reason?: string } {
  if (!solution) {
    return { isValid: false, reason: 'Keine Lösung vorhanden' };
  }

  // Extract solution value
  let solutionValue: any = null;
  if (typeof solution === 'string') {
    solutionValue = solution;
  } else if (solution.value !== undefined) {
    solutionValue = solution.value;
  } else if (solution.answer !== undefined) {
    solutionValue = solution.answer;
  }

  if (solutionValue === null || solutionValue === undefined) {
    return { isValid: false, reason: 'Lösungswert nicht extrahierbar' };
  }

  // Check for error markers
  const solutionStr = String(solutionValue).toLowerCase();
  if (solutionStr.includes('undefined') || solutionStr.includes('null') || solutionStr.includes('error')) {
    return { isValid: false, reason: 'Lösung enthält Fehlerwerte' };
  }

  // Basic math validation for subtraction problems (common error source)
  if (prompt.includes('−') || prompt.includes('-') || prompt.toLowerCase().includes('minus')) {
    const numbers = prompt.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
      const a = parseInt(numbers[0]);
      const b = parseInt(numbers[1]);
      const expected = a - b;
      const provided = parseFloat(String(solutionValue));
      
      if (!isNaN(provided) && Math.abs(expected - provided) > 0.1) {
        return { isValid: false, reason: `Subtraktionsrechnung falsch: ${a}-${b}=${expected}, aber Lösung ist ${provided}` };
      }
    }
  }

  return { isValid: true };
}

/**
 * Assess text complexity based on content
 */
function assessComplexity(text: string, grade: number): number {
  let complexity = 0;

  // Word count factor
  const wordCount = text.split(/\s+/).length;
  complexity += Math.min(0.3, wordCount / 50);

  // Number complexity
  const numbers = text.match(/\d+/g) || [];
  const maxNumber = Math.max(...numbers.map(n => parseInt(n))) || 0;
  
  if (maxNumber > 1000) complexity += 0.3;
  else if (maxNumber > 100) complexity += 0.2;
  else if (maxNumber > 20) complexity += 0.1;

  // Operation complexity
  if (text.includes('×') || text.includes('÷')) complexity += 0.2;
  if (text.includes('²') || text.includes('³')) complexity += 0.3;
  if (text.toLowerCase().includes('prozent')) complexity += 0.4;
  if (text.toLowerCase().includes('bruch')) complexity += 0.3;

  // Adjust for grade level expectations
  const gradeAdjustment = (grade - 1) * 0.1;
  
  return Math.max(0, Math.min(1, complexity - gradeAdjustment));
}

// Import Phase 2 validation functions and first-grade specific validators
import { 
  validateMathematicalCorrectness, 
  validateContext, 
  analyzeQualityDistribution,
  categorizeIssues,
  generateRecommendations 
} from './phase2-validators.ts';

import { checkFirstGradeProblematicPatterns } from './enhanced-first-grade-validator.ts';