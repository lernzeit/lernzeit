import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template_ids, grade, domain, batch_size = 50 }: ValidationRequest = await req.json();
    
    console.log(`🔍 PHASE 5: Starting template validation`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let query = supabase
      .from('templates')
      .select('id, student_prompt, solution, domain, grade, validation_status')
      .eq('status', 'ACTIVE')
      .limit(batch_size);
    
    if (template_ids && template_ids.length > 0) {
      query = query.in('id', template_ids);
    } else if (grade) {
      query = query.eq('grade', grade);
      if (domain) {
        query = query.eq('domain', domain);
      }
    }
    
    const { data: templates, error } = await query;
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No templates to validate',
        validated: 0,
        invalid: 0
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    console.log(`📊 Validating ${templates.length} templates`);
    
    let validatedCount = 0;
    let invalidCount = 0;
    const invalidTemplates = [];
    
    for (const template of templates) {
      try {
        const validationResult = await validateTemplate(template);
        
        if (validationResult.isValid) {
          // Update template as valid
          await supabase
            .from('templates')
            .update({
              validation_status: 'valid',
              quality_score: validationResult.score,
              last_validated: new Date().toISOString()
            })
            .eq('id', template.id);
          
          validatedCount++;
        } else {
          // Mark as invalid
          await supabase
            .from('templates')
            .update({
              validation_status: 'invalid',
              quality_score: 0,
              last_validated: new Date().toISOString()
            })
            .eq('id', template.id);
          
          invalidCount++;
          invalidTemplates.push({
            id: template.id,
            prompt: template.student_prompt.substring(0, 100),
            issues: validationResult.issues
          });
        }
      } catch (error) {
        console.error(`Error validating template ${template.id}:`, error);
        invalidCount++;
      }
    }
    
    console.log(`✅ Validation complete: ${validatedCount} valid, ${invalidCount} invalid`);
    
    return new Response(JSON.stringify({
      success: true,
      validated: validatedCount,
      invalid: invalidCount,
      total_processed: templates.length,
      invalid_templates: invalidTemplates.slice(0, 10) // Return first 10 invalid examples
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    
  } catch (error) {
    console.error('Template validation error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: string[];
}

async function validateTemplate(template: any): Promise<ValidationResult> {
  const issues: string[] = [];
  let score = 1.0;
  
  // Validate student prompt
  if (!template.student_prompt || template.student_prompt.trim().length < 10) {
    issues.push('Student prompt too short or missing');
    score -= 0.3;
  }
  
  // Validate solution format
  if (!template.solution) {
    issues.push('Solution is missing');
    score -= 0.5;
  } else if (typeof template.solution === 'object') {
    if (!template.solution.value) {
      issues.push('Solution object missing value property');
      score -= 0.3;
    }
  }
  
  // Check for visual content (forbidden)
  const visualKeywords = [
    'zeichne', 'male', 'konstruiere', 'entwirf', 'bild', 
    'diagramm', 'grafik', 'skizze', 'ordne.*zu', 'verbinde'
  ];
  
  for (const keyword of visualKeywords) {
    const regex = new RegExp(keyword, 'i');
    if (regex.test(template.student_prompt)) {
      issues.push(`Contains forbidden visual keyword: ${keyword}`);
      score -= 0.4;
    }
  }
  
  // Basic math validation for math domain
  if (template.domain === 'Zahlen & Operationen') {
    const mathValidation = validateMathSolution(template.student_prompt, template.solution);
    if (!mathValidation.isValid) {
      issues.push(`Math validation failed: ${mathValidation.reason}`);
      score -= 0.4;
    }
  }
  
  // Grade appropriateness check
  if (template.grade && template.student_prompt) {
    const complexityScore = assessComplexity(template.student_prompt, template.grade);
    if (complexityScore < 0.3) {
      issues.push('Content may be too simple for grade level');
      score -= 0.1;
    } else if (complexityScore > 0.8) {
      issues.push('Content may be too complex for grade level');
      score -= 0.2;
    }
  }
  
  return {
    isValid: issues.length === 0 && score >= 0.6,
    score: Math.max(0, score),
    issues
  };
}

function validateMathSolution(prompt: string, solution: any): { isValid: boolean; reason?: string } {
  try {
    // Basic checks for mathematical content
    if (!solution || (typeof solution === 'object' && !solution.value)) {
      return { isValid: false, reason: 'No solution provided' };
    }
    
    const solutionValue = typeof solution === 'object' ? solution.value : String(solution);
    
    // Check for obvious errors
    if (String(solutionValue).includes('INVALID') || String(solutionValue).includes('ERROR')) {
      return { isValid: false, reason: 'Solution contains error markers' };
    }
    
    // For now, basic validation - could be enhanced with actual math parsing
    if (prompt.toLowerCase().includes('subtrahiere') && prompt.toLowerCase().includes('von')) {
      // Check if it's the common "subtract A from B" format
      const match = prompt.match(/subtrahiere\s+([\d,]+)\s+von\s+([\d,]+)/i);
      if (match) {
        const a = parseFloat(match[1].replace(',', '.'));
        const b = parseFloat(match[2].replace(',', '.'));
        const expectedResult = b - a;
        const actualResult = parseFloat(String(solutionValue).replace(',', '.'));
        
        if (Math.abs(expectedResult - actualResult) > 0.01) {
          return { isValid: false, reason: `Expected ${expectedResult}, got ${actualResult}` };
        }
      }
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, reason: `Validation error: ${error.message}` };
  }
}

function assessComplexity(text: string, grade: number): number {
  const wordCount = text.split(/\s+/).length;
  const hasNumbers = /\d/.test(text);
  const hasOperations = /[+\-×÷=]/.test(text);
  const hasDecimals = /\d+,\d+/.test(text);
  const hasFractions = /\d+\/\d+/.test(text);
  
  let complexity = 0.3; // Base complexity
  
  // Word count factor
  if (wordCount > 20) complexity += 0.2;
  if (wordCount > 40) complexity += 0.2;
  
  // Mathematical complexity
  if (hasNumbers) complexity += 0.1;
  if (hasOperations) complexity += 0.1;
  if (hasDecimals && grade >= 3) complexity += 0.2;
  if (hasFractions && grade >= 4) complexity += 0.2;
  
  // Grade appropriateness
  if (grade <= 2 && (hasDecimals || hasFractions)) complexity += 0.3;
  if (grade >= 5 && !hasOperations && wordCount < 10) complexity -= 0.2;
  
  return Math.min(1.0, complexity);
}