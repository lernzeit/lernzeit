import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchGenerationRequest {
  grade?: number;
  quarter?: string;
  domain?: string;
  difficulty?: string;
  question_type?: string;
  batchSize?: number;
  prioritizeGaps?: boolean;
  targetQuality?: number;
}

interface TemplateGap {
  grade: number;
  quarter_app: string;
  domain: string;
  difficulty: string;
  question_type: string;
  current_count: number;
  target_count: number;
  priority: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const requestBody = await req.json() as BatchGenerationRequest;
    const {
      grade,
      quarter,
      domain,
      difficulty,
      question_type,
      batchSize = 20,
      prioritizeGaps = true,
      targetQuality = 0.8
    } = requestBody;

    console.log(`🚀 Starting systematic batch generation: ${batchSize} templates`);

    // Step 1: Analyze coverage gaps
    let targetCombinations: TemplateGap[] = [];

    if (prioritizeGaps) {
      targetCombinations = await analyzeCoverageGaps(supabase);
      console.log(`📊 Found ${targetCombinations.length} coverage gaps`);
    } else {
      // Create single combination if specific parameters provided
      if (grade && quarter && domain && difficulty && question_type) {
        targetCombinations = [{
          grade,
          quarter_app: quarter,
          domain,
          difficulty,
          question_type,
          current_count: 0,
          target_count: batchSize,
          priority: getPriority(grade)
        }];
      }
    }

    if (targetCombinations.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No gaps found or invalid parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Step 2: Generate templates systematically
    const results = {
      successful: 0,
      failed: 0,
      generated_templates: [] as any[],
      errors: [] as string[]
    };

    // Process combinations with balanced distribution across grades
    const balancedCombinations = getBalancedCombinations(targetCombinations, batchSize);

    for (const combination of balancedCombinations) {
      try {
        console.log(`🎯 Generating template for Grade ${combination.grade}, ${combination.domain}, ${combination.difficulty}`);

        const generatedTemplate = await generateSingleTemplate(
          combination,
          openAIApiKey,
          targetQuality
        );

        if (generatedTemplate) {
          // Save to database with quality validation
          const { data: savedTemplate, error: saveError } = await supabase
            .from('templates')
            .insert([generatedTemplate])
            .select()
            .single();

          if (saveError) {
            console.error('Error saving template:', saveError);
            results.errors.push(`Save error for ${combination.grade}-${combination.domain}: ${saveError.message}`);
            results.failed++;
          } else {
            console.log(`✅ Template saved successfully: ${savedTemplate.id}`);
            results.generated_templates.push(savedTemplate);
            results.successful++;
          }
        } else {
          results.failed++;
          results.errors.push(`Generation failed for ${combination.grade}-${combination.domain}-${combination.difficulty}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error generating template for combination:`, error);
        results.failed++;
        results.errors.push(`${combination.grade}-${combination.domain}: ${error.message}`);
      }
    }

    console.log(`🏁 Systematic generation complete: ${results.successful} successful, ${results.failed} failed`);

    // Automatic duplicate cleanup after successful generation
    if (results.successful > 0) {
      try {
        console.log('🧹 Running automatic duplicate cleanup...');
        const cleanupResponse = await supabase.functions.invoke('cleanup-duplicates', {
          body: { trigger: 'post-generation', source: 'batch-generate-questions' }
        });
        
        if (cleanupResponse.data?.success) {
          console.log(`✅ Cleanup completed: ${cleanupResponse.data.total_deactivated} duplicates removed`);
        }
      } catch (cleanupError) {
        console.warn('⚠️ Cleanup failed but generation succeeded:', cleanupError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Systematic generation complete: ${results.successful}/${results.successful + results.failed} templates generated`,
        results,
        processed_combinations: balancedCombinations.length,
        coverage_analysis: {
          total_gaps: targetCombinations.length,
          high_priority_gaps: targetCombinations.filter(g => g.priority === 'HIGH').length,
          medium_priority_gaps: targetCombinations.filter(g => g.priority === 'MEDIUM').length,
          low_priority_gaps: targetCombinations.filter(g => g.priority === 'LOW').length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Systematic generation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Systematic generation failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Coverage analysis function
async function analyzeCoverageGaps(supabase: any): Promise<TemplateGap[]> {
  const { data: templates, error } = await supabase
    .from('templates')
    .select('grade, quarter_app, domain, difficulty, question_type')
    .eq('status', 'ACTIVE');

  if (error) throw error;

  const gaps: TemplateGap[] = [];
  const targetCount = 8; // Target: 8 templates per combination (more realistic)

  const grades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const domains = [
    'Zahlen & Operationen',
    'Raum & Form',
    'Größen & Messen',
    'Daten & Zufall',
    'Gleichungen & Funktionen'
  ];
  const difficulties = ['easy', 'medium', 'hard'];
  const questionTypes = ['MULTIPLE_CHOICE', 'FREETEXT', 'SORT', 'MATCH'];

  // Count existing templates
  const templateCounts = new Map<string, number>();
  templates?.forEach(template => {
    const key = `${template.grade}-${template.quarter_app}-${template.domain}-${template.difficulty}-${template.question_type}`;
    templateCounts.set(key, (templateCounts.get(key) || 0) + 1);
  });

  // Identify gaps
  grades.forEach(grade => {
    quarters.forEach(quarter => {
      domains.forEach(domain => {
        // Skip domains not applicable to certain grades
        if (domain === 'Gleichungen & Funktionen' && grade < 4) return;
        if (domain === 'Daten & Zufall' && grade < 2) return;

        difficulties.forEach(difficulty => {
          questionTypes.forEach(questionType => {
            const key = `${grade}-${quarter}-${domain}-${difficulty}-${questionType}`;
            const currentCount = templateCounts.get(key) || 0;

            if (currentCount < targetCount) {
              gaps.push({
                grade,
                quarter_app: quarter,
                domain,
                difficulty,
                question_type: questionType,
                current_count: currentCount,
                target_count: targetCount,
                priority: getPriority(grade)
              });
            }
          });
        });
      });
    });
  });

  return gaps.filter(gap => gap.current_count < gap.target_count);
}

function getPriority(grade: number): string {
  if (grade >= 1 && grade <= 4) return 'HIGH';
  if (grade >= 5 && grade <= 6) return 'MEDIUM';
  return 'LOW';
}

// Balanced distribution function to ensure coverage across all grades/domains
function getBalancedCombinations(gaps: TemplateGap[], targetCount: number): TemplateGap[] {
  console.log(`📊 Balancing ${gaps.length} gaps across ${targetCount} templates`);
  
  if (gaps.length <= targetCount) {
    return gaps;
  }

  // Group gaps by grade, domain, difficulty, and question type
  const gradeGroups = new Map<number, TemplateGap[]>();
  const domainGroups = new Map<string, TemplateGap[]>();
  const difficultyGroups = new Map<string, TemplateGap[]>();
  const questionTypeGroups = new Map<string, TemplateGap[]>();

  gaps.forEach(gap => {
    // Group by grade
    if (!gradeGroups.has(gap.grade)) {
      gradeGroups.set(gap.grade, []);
    }
    gradeGroups.get(gap.grade)!.push(gap);

    // Group by domain
    if (!domainGroups.has(gap.domain)) {
      domainGroups.set(gap.domain, []);
    }
    domainGroups.get(gap.domain)!.push(gap);

    // Group by difficulty
    if (!difficultyGroups.has(gap.difficulty)) {
      difficultyGroups.set(gap.difficulty, []);
    }
    difficultyGroups.get(gap.difficulty)!.push(gap);

    // Group by question type
    if (!questionTypeGroups.has(gap.question_type)) {
      questionTypeGroups.set(gap.question_type, []);
    }
    questionTypeGroups.get(gap.question_type)!.push(gap);
  });

  const selected: TemplateGap[] = [];
  const used = new Set<string>();

  // Calculate distribution targets
  const gradesCount = gradeGroups.size;
  const domainsCount = domainGroups.size;
  const difficultiesCount = difficultyGroups.size;
  const questionTypesCount = questionTypeGroups.size;

  const templatesPerGrade = Math.floor(targetCount / gradesCount);
  const templatesPerDomain = Math.floor(targetCount / domainsCount);
  const templatesPerDifficulty = Math.floor(targetCount / difficultiesCount);
  const templatesPerType = Math.floor(targetCount / questionTypesCount);

  console.log(`🎯 Distribution: ${templatesPerGrade}/grade, ${templatesPerDomain}/domain, ${templatesPerDifficulty}/difficulty, ${templatesPerType}/type`);

  // Round-robin selection to ensure balanced coverage
  const maxIterations = targetCount * 2; // Prevent infinite loops
  let iterations = 0;

  while (selected.length < targetCount && iterations < maxIterations) {
    iterations++;

    // Try to select one from each grade
    for (const [grade, gradeGaps] of gradeGroups) {
      if (selected.length >= targetCount) break;

      // Count current selections for this grade
      const gradeSelections = selected.filter(s => s.grade === grade).length;
      if (gradeSelections >= templatesPerGrade + 2) continue; // Allow some flexibility

      // Find unused gaps for this grade
      const availableGaps = gradeGaps.filter(gap => {
        const key = `${gap.grade}-${gap.quarter_app}-${gap.domain}-${gap.difficulty}-${gap.question_type}`;
        return !used.has(key);
      });

      if (availableGaps.length === 0) continue;

      // Prefer gaps that improve overall balance
      const bestGap = availableGaps.find(gap => {
        const domainCount = selected.filter(s => s.domain === gap.domain).length;
        const difficultyCount = selected.filter(s => s.difficulty === gap.difficulty).length;
        const typeCount = selected.filter(s => s.question_type === gap.question_type).length;

        return domainCount < templatesPerDomain + 1 &&
               difficultyCount < templatesPerDifficulty + 1 &&
               typeCount < templatesPerType + 1;
      }) || availableGaps[0]; // Fallback to first available

      const key = `${bestGap.grade}-${bestGap.quarter_app}-${bestGap.domain}-${bestGap.difficulty}-${bestGap.question_type}`;
      used.add(key);
      selected.push(bestGap);
    }
  }

  // Fill remaining slots with high-priority gaps
  while (selected.length < targetCount) {
    const remaining = gaps.filter(gap => {
      const key = `${gap.grade}-${gap.quarter_app}-${gap.domain}-${gap.difficulty}-${gap.question_type}`;
      return !used.has(key);
    });

    if (remaining.length === 0) break;

    // Sort by priority and select
    remaining.sort((a, b) => {
      const priorityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder];
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder];
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      // Secondary sort by current count (fewer templates = higher priority)
      return a.current_count - b.current_count;
    });

    const gap = remaining[0];
    const key = `${gap.grade}-${gap.quarter_app}-${gap.domain}-${gap.difficulty}-${gap.question_type}`;
    used.add(key);
    selected.push(gap);
  }

  // Log distribution
  const gradeDistribution = new Map<number, number>();
  const domainDistribution = new Map<string, number>();
  const difficultyDistribution = new Map<string, number>();
  const typeDistribution = new Map<string, number>();

  selected.forEach(gap => {
    gradeDistribution.set(gap.grade, (gradeDistribution.get(gap.grade) || 0) + 1);
    domainDistribution.set(gap.domain, (domainDistribution.get(gap.domain) || 0) + 1);
    difficultyDistribution.set(gap.difficulty, (difficultyDistribution.get(gap.difficulty) || 0) + 1);
    typeDistribution.set(gap.question_type, (typeDistribution.get(gap.question_type) || 0) + 1);
  });

  console.log('📈 Selected distribution:');
  console.log('Grades:', Object.fromEntries(gradeDistribution));
  console.log('Domains:', Object.fromEntries(domainDistribution));
  console.log('Difficulties:', Object.fromEntries(difficultyDistribution));
  console.log('Types:', Object.fromEntries(typeDistribution));

  return selected;
}

// Template generation function
async function generateSingleTemplate(
  combination: TemplateGap,
  openAIApiKey: string,
  targetQuality: number
): Promise<any | null> {
  const difficultyRules = getDifficultyRules(combination.grade);
  const curriculum = getCurriculumContext(combination.grade, combination.quarter_app, combination.domain);

  const prompt = buildGenerationPrompt(combination, curriculum, difficultyRules);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Sie sind ein Experte für deutsche Mathematikaufgaben. Erstellen Sie hochqualitative, lehrplangerechte Aufgaben für Klasse ${combination.grade}.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    // Parse and validate the generated template
    const template = parseGeneratedTemplate(generatedContent, combination);
    
    if (template && validateTemplateQuality(template, targetQuality)) {
      return template;
    } else {
      console.warn('Generated template did not meet quality standards');
      return null;
    }

  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return null;
  }
}

function getDifficultyRules(grade: number): any {
  const rules = {
    1: { zahlenraumMax: 20, operations: ['+', '-'], complexity: 'basic' },
    2: { zahlenraumMax: 100, operations: ['+', '-', '×', '÷'], complexity: 'basic' },
    3: { zahlenraumMax: 1000, operations: ['+', '-', '×', '÷'], complexity: 'intermediate' },
    4: { zahlenraumMax: 1000000, operations: ['+', '-', '×', '÷'], complexity: 'advanced' }
  };
  
  return rules[grade as keyof typeof rules] || rules[4];
}

function getCurriculumContext(grade: number, quarter: string, domain: string): string {
  const contexts = {
    'Zahlen & Operationen': {
      1: 'Zahlen bis 20, Grundrechenarten, Zählen',
      2: 'Zahlen bis 100, Einmaleins, Geldrechnung',
      3: 'Zahlen bis 1000, schriftliche Verfahren',
      4: 'Große Zahlen, Dezimalzahlen, komplexe Rechnungen'
    },
    'Raum & Form': {
      1: 'Grundformen, einfache Geometrie',
      2: 'Eigenschaften von Formen, Symmetrie',
      3: 'Flächenberechnung, Umfang',
      4: 'Volumen, Netze, erweiterte Geometrie'
    }
  };

  return contexts[domain as keyof typeof contexts]?.[grade as keyof any] || 'Allgemeine Mathematik';
}

function buildGenerationPrompt(combination: TemplateGap, curriculum: string, rules: any): string {
  return `Erstellen Sie eine ${combination.difficulty} Mathematikaufgabe für Klasse ${combination.grade}, Quartal ${combination.quarter_app}.

**Vorgaben:**
- Domain: ${combination.domain}
- Fragetyp: ${combination.question_type}
- Schwierigkeit: ${combination.difficulty}
- Zahlenraum: 1-${rules.zahlenraumMax}
- Curriculum: ${curriculum}

**Format (JSON):**
{
  "grade": ${combination.grade},
  "quarter_app": "${combination.quarter_app}",
  "domain": "${combination.domain}",
  "subcategory": "passende Unterkategorie",
  "difficulty": "${combination.difficulty}",
  "question_type": "${combination.question_type}",
  "student_prompt": "Aufgabentext für Schüler",
  "solution": {"value": "korrekte Antwort"},
  "variables": {entsprechende Parameter},
  "distractors": [für Multiple Choice: 3 falsche Antworten],
  "explanation": "kindgerechte Erklärung",
  "unit": "Einheit falls zutreffend",
  "tags": ["relevante Tags"]
}

**Qualitätskriterien:**
- Mathematisch korrekt und eindeutig lösbar
- Altersgerecht formuliert
- Lehrplankonform für Klasse ${combination.grade}
- ${combination.question_type === 'MULTIPLE_CHOICE' ? 'Korrekte Antwort muss in den 4 Optionen enthalten sein' : ''}

Antworten Sie nur mit dem JSON-Objekt, ohne zusätzlichen Text.`;
}

function parseGeneratedTemplate(content: string, combination: TemplateGap): any | null {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response');
      return null;
    }

    const template = JSON.parse(jsonMatch[0]);
    
    // Add system fields
    template.status = 'ACTIVE';
    template.quality_score = 0.8;
    template.is_parametrized = false;
    template.source_skill_id = `${combination.grade}-${combination.quarter_app}-${combination.domain}`;
    template.grade_app = combination.grade;

    return template;
  } catch (error) {
    console.error('Error parsing generated template:', error);
    return null;
  }
}

function validateTemplateQuality(template: any, targetQuality: number): boolean {
  let score = 1.0;

  // Basic validation checks
  if (!template.student_prompt || template.student_prompt.length < 10) score -= 0.3;
  if (!template.solution) score -= 0.3;
  if (!template.explanation || template.explanation.length < 20) score -= 0.2;

  // Question type specific validation
  if (template.question_type === 'MULTIPLE_CHOICE') {
    if (!template.distractors || template.distractors.length !== 3) score -= 0.2;
  }

  // Update quality score
  template.quality_score = Math.max(0, score);

  return template.quality_score >= targetQuality;
}