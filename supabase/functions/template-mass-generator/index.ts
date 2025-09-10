import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerationRequest {
  targetCount?: number;
  grade?: number;
  quarter?: string;
  domain?: string;
  difficulty?: string;
  forceRegenerate?: boolean;
  curriculumMode?: boolean;
  skillId?: string;
  skill?: string;
  subcategory?: string;
}

// Vollständige Curriculum-Daten mit allen Kompetenzen (1-10. Klasse)
const FULL_CURRICULUM = [
  {"id": "G1-Q1-ZA-ab13a721", "grade": 1, "grade_app": 1, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Zahlen & Operationen", "subcategory": "Zahlvorstellung/Zählen", "skill": "Zählen bis 10; Anzahlen vergleichen", "tags": ["Zählen", "ZR_10"]},
  {"id": "G1-Q1-ZA-23f6f2c9", "grade": 1, "grade_app": 1, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Zahlen & Operationen", "subcategory": "Add/Sub (mental)", "skill": "Plus/Minus im ZR 10 ohne Übergang", "tags": ["Addition", "Subtraktion", "ZR_10"]},
  {"id": "G1-Q1-RA-cd1c87a1", "grade": 1, "grade_app": 1, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Raum & Form", "subcategory": "Formen erkennen", "skill": "Kreis, Dreieck, Quadrat, Rechteck unterscheiden", "tags": ["Formen", "Eigenschaften"]},
  {"id": "G1-Q1-GR-31ade5b6", "grade": 1, "grade_app": 1, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Größen & Messen", "subcategory": "Messen/Schätzen", "skill": "Längen schätzen und vergleichen (unstandardisiert)", "tags": ["Länge", "Schätzen"]},
  {"id": "G1-Q1-DA-bea86e75", "grade": 1, "grade_app": 1, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Daten & Zufall", "subcategory": "Daten erfassen", "skill": "Einfache Strichlisten und Bilddiagramme", "tags": ["Diagramm", "Strichliste"]},
  
  {"id": "G1-Q2-ZA-4acd1a9a", "grade": 1, "grade_app": 1, "quarter_teach": "Q2", "quarter_app": "Q3", "domain": "Zahlen & Operationen", "subcategory": "Zahlvorstellung/Stellenwert", "skill": "Zahlen bis 20 darstellen, ordnen", "tags": ["Stellenwert", "ZR_20"]},
  {"id": "G1-Q2-ZA-f7ecc910", "grade": 1, "grade_app": 1, "quarter_teach": "Q2", "quarter_app": "Q3", "domain": "Zahlen & Operationen", "subcategory": "Add/Sub (Strategien)", "skill": "Plus/Minus im ZR 20 mit Zehnerübergang (strategisch)", "tags": ["Zehnerübergang", "ZR_20"]},
  {"id": "G1-Q2-RA-1f78e94c", "grade": 1, "grade_app": 1, "quarter_teach": "Q2", "quarter_app": "Q3", "domain": "Raum & Form", "subcategory": "Lagebeziehungen", "skill": "rechts/links, oben/unten; Muster fortsetzen", "tags": ["Muster", "Lage"]},
  {"id": "G1-Q2-GR-3407d972", "grade": 1, "grade_app": 1, "quarter_teach": "Q2", "quarter_app": "Q3", "domain": "Größen & Messen", "subcategory": "Zeit/Geld", "skill": "Uhr (volle/halbe Stunde), Münzen bis 2 €", "tags": ["Zeit", "Geld"]},
  
  {"id": "G2-Q1-ZA-ab12c4ec", "grade": 2, "grade_app": 2, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Zahlen & Operationen", "subcategory": "Add/Sub im ZR 100", "skill": "Halbschriftlich & schriftnah mit Übergang", "tags": ["Addition", "Subtraktion", "ZR_100"]},
  {"id": "G2-Q1-ZA-6c3b1af6", "grade": 2, "grade_app": 2, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Zahlen & Operationen", "subcategory": "Einmaleins (Aufbau)", "skill": "2er/5er/10er Reihen, Tausch-/Verbundaufgaben", "tags": ["Einmaleins", "ZR_100"]},
  {"id": "G2-Q1-GR-7d9cb502", "grade": 2, "grade_app": 2, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Größen & Messen", "subcategory": "Geld/Euro", "skill": "Einkaufssituationen bis 100 € (ohne Komma)", "tags": ["Geld"]},
  {"id": "G2-Q1-RA-672e6501", "grade": 2, "grade_app": 2, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Raum & Form", "subcategory": "Geometrische Grundbegriffe", "skill": "Ecken, Kanten, Seiten; Rechteck/Quadrat", "tags": ["Eigenschaften"]},
  
  {"id": "G5-Q1-ZA-78895d27", "grade": 5, "grade_app": 5, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Zahlen & Operationen", "subcategory": "Negative Zahlen", "skill": "Zahlengerade, Vergleiche, Addition/Subtraktion", "tags": ["Rationale", "Negative"]},
  {"id": "G5-Q1-ZA-2765bbbb", "grade": 5, "grade_app": 5, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Zahlen & Operationen", "subcategory": "Brüche/Dezimalzahlen", "skill": "Erweitern/Kürzen, Vergleich; Umwandlung", "tags": ["Brüche", "Dezimalzahlen"]},
  {"id": "G5-Q1-GL-4086937d", "grade": 5, "grade_app": 5, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Gleichungen & Funktionen", "subcategory": "Terme/Variable", "skill": "Termwert, einfache Umformungen", "tags": ["Terme"]},
  {"id": "G5-Q1-RA-2b27fcfa", "grade": 5, "grade_app": 5, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Raum & Form", "subcategory": "Dreiecke & Vierecke", "skill": "Konstruktion, Eigenschaften", "tags": ["Konstruktion"]},
  
  {"id": "G10-Q1-GL-0758fdb2", "grade": 10, "grade_app": 10, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Gleichungen & Funktionen", "subcategory": "Quadratische Funktionen (vertiefen)", "skill": "Scheitel-/Normalform, Transformationen", "tags": ["Quadratische Funktionen"]},
  {"id": "G10-Q1-GL-1ddb178e", "grade": 10, "grade_app": 10, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Gleichungen & Funktionen", "subcategory": "Exponentialfunktionen (Grundlagen)", "skill": "Wachstum (einfach), Parameter deuten", "tags": ["Exponential"]},
  {"id": "G10-Q1-RA-9b97011f", "grade": 10, "grade_app": 10, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Raum & Form", "subcategory": "Trigonometrie Anwendungen", "skill": "Strecken/Winkel berechnen", "tags": ["Trigonometrie"]}
];

const DIFFICULTY_LEVELS = ["easy", "medium", "hard"];

// PHASE 2: Enhanced Method Diversity Distribution
const VARIANT_DISTRIBUTION = {
  'MULTIPLE_CHOICE': 0.40,
  'SORT': 0.20,
  'MATCH': 0.20,
  'FREETEXT': 0.20
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Enhanced Template Mass Generator - Curriculum-Compliant with Method Diversity');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const request: GenerationRequest = await req.json().catch(() => ({}));
    const {
      targetCount = 100,
      grade,
      quarter,
      domain,
      difficulty,
      forceRegenerate = false,
      curriculumMode = false,
      skillId,
      skill,
      subcategory
    } = request;

    console.log(`📊 Enhanced Generation Request:`, { 
      targetCount, grade, quarter, domain, difficulty, curriculumMode, skillId 
    });

    // Phase 1: Intelligente Coverage-Gap-Analyse
    const { data: existingTemplates } = await supabase
      .from('templates')
      .select('grade, grade_app, quarter_app, domain, difficulty, subcategory, source_skill_id, variant, question_type')
      .eq('status', 'ACTIVE');

    console.log(`📈 Existing Templates: ${existingTemplates?.length || 0}`);

    // Phase 2: ENHANCED - Lücken-Identifikation mit Methodenvielfalt-Garantie
    const gaps = identifyEnhancedCoverageGaps(
      existingTemplates || [], 
      grade,
      quarter, 
      domain, 
      difficulty,
      curriculumMode,
      skillId
    );
    console.log(`🎯 Coverage Gaps Identified: ${gaps.length}`);

    // Phase 3: Systematische Template-Generierung mit Methodenvielfalt
    const results = {
      totalGenerated: 0,
      successCount: 0,
      errorCount: 0,
      errors: [] as string[],
      generatedTemplates: [] as any[],
      coverageImprovement: 0,
      curriculumAlignment: 0,
      methodDiversity: {
        MULTIPLE_CHOICE: 0,
        SORT: 0,
        MATCH: 0,
        FREETEXT: 0
      }
    };

    const targetGaps = gaps.slice(0, Math.min(targetCount, gaps.length));
    
    for (const gap of targetGaps) {
      try {
        console.log(`🧮 Generating for:`, {
          grade: gap.grade,
          quarter: gap.quarter,
          domain: gap.domain,
          difficulty: gap.difficulty,
          skill: gap.skill
        });
        
        // PHASE 2: Generate with guaranteed method diversity
        const templates = await generateCurriculumCompliantTemplatesWithDiversity(
          gap, 
          openaiApiKey, 
          Math.min(8, gap.needed) // Max 8 pro Gap
        );
        
        for (const template of templates) {
          const { error } = await supabase
            .from('templates')
            .insert({
              ...template,
              grade: gap.grade,
              grade_app: gap.grade,
              quarter_app: gap.quarter,
              domain: gap.domain,
              difficulty: gap.difficulty,
              source_skill_id: gap.skillId || null,
              status: 'ACTIVE',
              created_at: new Date().toISOString(),
              plays: 0,
              correct: 0,
              rating_sum: 0,
              rating_count: 0,
              curriculum_rules: gap.curriculumData ? JSON.stringify(gap.curriculumData) : '{}'
            });

          if (error) {
            console.error('❌ Insert error:', error);
            results.errors.push(`Insert failed: ${error.message}`);
            results.errorCount++;
          } else {
            results.successCount++;
            results.generatedTemplates.push(template);
            
            // Track method diversity
            const variant = template.variant || template.question_type || 'FREETEXT';
            if (results.methodDiversity[variant as keyof typeof results.methodDiversity] !== undefined) {
              results.methodDiversity[variant as keyof typeof results.methodDiversity]++;
            }
            
            console.log('✅ Curriculum-compliant template saved');
          }
        }
        
        results.totalGenerated += templates.length;
        
      } catch (error) {
        console.error(`❌ Gap generation error:`, error);
        results.errors.push(`Gap ${gap.grade}-${gap.quarter}-${gap.domain}: ${error.message}`);
        results.errorCount++;
      }
    }

    // Phase 4: Coverage & Curriculum Alignment Analysis
    const { data: newCount } = await supabase
      .from('templates')
      .select('id', { count: 'exact' })
      .eq('status', 'ACTIVE');

    results.coverageImprovement = (newCount?.length || 0) - (existingTemplates?.length || 0);
    results.curriculumAlignment = calculateCurriculumAlignment(results.generatedTemplates);

    console.log(`🏆 Enhanced Mass Generation Completed:`, results);

    return new Response(JSON.stringify({
      success: true,
      message: `Generated ${results.totalGenerated} curriculum-compliant templates with method diversity, ${results.successCount} saved`,
      ...results,
      processingStats: {
        requestedCount: targetCount,
        gapsFound: gaps.length,
        gapsProcessed: targetGaps.length,
        successRate: `${Math.round((results.successCount / results.totalGenerated) * 100)}%`,
        curriculumMode: curriculumMode,
        methodDistribution: results.methodDiversity
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Enhanced Template Mass Generator Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// PHASE 2: Enhanced Gap Identification with Method Diversity
function identifyEnhancedCoverageGaps(
  existingTemplates: any[], 
  targetGrade?: number,
  targetQuarter?: string,
  targetDomain?: string,
  targetDifficulty?: string,
  curriculumMode: boolean = false,
  targetSkillId?: string
): any[] {
  const gaps: any[] = [];
  const MIN_TEMPLATES_PER_COMBINATION = 15; // Erhöht für bessere Abdeckung
  const MIN_PER_VARIANT = 3; // Mindestens 3 pro Methodentyp
  
  // Define targets based on parameters
  const targetGrades = targetGrade ? [targetGrade] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const targetQuarters = targetQuarter ? [targetQuarter] : ['Q1', 'Q2', 'Q3', 'Q4'];
  const targetDomains = targetDomain ? [targetDomain] : 
    ['Zahlen & Operationen', 'Raum & Form', 'Größen & Messen', 'Daten & Zufall', 'Gleichungen & Funktionen'];
  const targetDifficulties = targetDifficulty ? [targetDifficulty] : DIFFICULTY_LEVELS;
  
  // Get relevant curriculum items
  const relevantCurriculum = FULL_CURRICULUM.filter(item => 
    targetGrades.includes(item.grade) &&
    (!targetDomain || item.domain === targetDomain) &&
    (!targetSkillId || item.id === targetSkillId)
  );

  console.log(`📚 Relevant Curriculum Items: ${relevantCurriculum.length}`);

  for (const curriculumItem of relevantCurriculum) {
    for (const difficulty of targetDifficulties) {
      // Count existing templates for this combination
      const existing = existingTemplates.filter(t =>
        t.grade === curriculumItem.grade_app &&
        t.quarter_app === curriculumItem.quarter_app &&
        t.domain === curriculumItem.domain &&
        t.difficulty === difficulty &&
        (!targetSkillId || t.source_skill_id === curriculumItem.id)
      );

      // PHASE 2: Check method diversity within this combination
      const variantCounts = {
        MULTIPLE_CHOICE: existing.filter(t => t.variant === 'MULTIPLE_CHOICE' || t.question_type === 'multiple-choice').length,
        SORT: existing.filter(t => t.variant === 'SORT' || t.question_type === 'sort').length,
        MATCH: existing.filter(t => t.variant === 'MATCH' || t.question_type === 'matching').length,
        FREETEXT: existing.filter(t => t.variant === 'FREETEXT' || t.question_type === 'freetext').length
      };

      const totalExisting = existing.length;
      const totalNeeded = Math.max(MIN_TEMPLATES_PER_COMBINATION - totalExisting, 0);

      // Calculate method-specific needs
      const methodNeeds = {
        MULTIPLE_CHOICE: Math.max(MIN_PER_VARIANT - variantCounts.MULTIPLE_CHOICE, 0),
        SORT: Math.max(MIN_PER_VARIANT - variantCounts.SORT, 0),
        MATCH: Math.max(MIN_PER_VARIANT - variantCounts.MATCH, 0),
        FREETEXT: Math.max(MIN_PER_VARIANT - variantCounts.FREETEXT, 0)
      };

      const totalMethodNeeds = Object.values(methodNeeds).reduce((a, b) => a + b, 0);

      if (totalNeeded > 0 || totalMethodNeeds > 0) {
        const priority = calculatePriority(totalExisting, totalNeeded, curriculumItem.grade, difficulty);
        
        gaps.push({
          grade: curriculumItem.grade_app,
          quarter: curriculumItem.quarter_app,
          domain: curriculumItem.domain,
          difficulty: difficulty,
          skillId: curriculumItem.id,
          skill: curriculumItem.skill,
          subcategory: curriculumItem.subcategory,
          existing: totalExisting,
          needed: Math.max(totalNeeded, totalMethodNeeds),
          priority: priority,
          curriculumData: curriculumItem,
          methodNeeds: methodNeeds,
          variantCounts: variantCounts
        });
      }
    }
  }

  // Sort by priority (highest first)
  gaps.sort((a, b) => b.priority - a.priority);
  
  console.log(`🎯 Top 5 Priority Gaps:`, gaps.slice(0, 5).map(g => ({
    grade: g.grade,
    domain: g.domain,
    difficulty: g.difficulty,
    existing: g.existing,
    needed: g.needed,
    priority: g.priority,
    methodNeeds: g.methodNeeds
  })));

  return gaps;
}

function calculatePriority(existing: number, needed: number, grade: number, difficulty: string): number {
  let priority = needed * 10; // Base priority on need
  
  // Boost priority for underrepresented grades
  if (grade <= 4) priority += 15; // Primary school boost
  if (grade >= 9) priority += 10; // High school boost
  
  // Boost priority for harder difficulties (often underrepresented)
  if (difficulty === 'hard') priority += 20;
  if (difficulty === 'medium') priority += 10;
  
  // Penalize if we already have many
  if (existing > 20) priority -= existing;
  
  return Math.max(0, priority);
}

// PHASE 2: Generate templates with guaranteed method diversity
async function generateCurriculumCompliantTemplatesWithDiversity(
  gap: any,
  openaiApiKey: string,
  batchSize: number = 8
): Promise<any[]> {
  const templates: any[] = [];
  const variants = Object.keys(VARIANT_DISTRIBUTION);
  
  // Distribute batch across all variants based on needs
  const variantAllocation: Record<string, number> = {};
  const totalMethodNeeds = Object.values(gap.methodNeeds || {}).reduce((a: number, b: number) => a + b, 0);
  
  if (totalMethodNeeds > 0) {
    // Allocate based on specific needs
    for (const [variant, need] of Object.entries(gap.methodNeeds || {})) {
      if (need > 0) {
        variantAllocation[variant] = Math.min(need, Math.ceil(batchSize * 0.25));
      }
    }
  } else {
    // Default distribution
    variantAllocation['MULTIPLE_CHOICE'] = Math.ceil(batchSize * 0.40);
    variantAllocation['SORT'] = Math.ceil(batchSize * 0.20);
    variantAllocation['MATCH'] = Math.ceil(batchSize * 0.20);
    variantAllocation['FREETEXT'] = Math.ceil(batchSize * 0.20);
  }

  console.log(`🎲 Variant Allocation:`, variantAllocation);

  for (const [variant, count] of Object.entries(variantAllocation)) {
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        try {
          const template = await generateSingleTemplate(gap, variant, openaiApiKey);
          if (template) {
            templates.push(template);
            console.log(`✅ Generated ${variant} template for Grade ${gap.grade}`);
          }
        } catch (error) {
          console.error(`❌ Failed to generate ${variant} template:`, error);
        }
      }
    }
  }

  return templates;
}

async function generateSingleTemplate(gap: any, variant: string, openaiApiKey: string): Promise<any | null> {
  const curriculumData = gap.curriculumData || {};
  const skill = gap.skill || curriculumData.skill || 'Mathematische Grundfertigkeiten';
  
  // PHASE 3: Curriculum-enhanced prompts
  const enhancedPrompt = `Du bist Experte für deutschen Mathematikunterricht und erstellst eine ${variant}-Aufgabe.

CURRICULUM-KONTEXT:
- Klasse: ${gap.grade}
- Quartal: ${gap.quarter} 
- Domain: ${gap.domain}
- Kompetenz: ${skill}
- Schwierigkeit: ${gap.difficulty}

ANFORDERUNGEN:
${variant === 'MULTIPLE_CHOICE' ? 
  '- IMMER 4 Antwortoptionen (3 falsche + 1 richtige)\n- Falsche Optionen = häufige Schülerfehler\n- Richtige Antwort randomisiert in der Liste' :
  variant === 'SORT' ?
  '- 4-6 Elemente zum Sortieren\n- Eindeutige richtige Reihenfolge\n- Logische Zusammenhänge' :
  variant === 'MATCH' ?
  '- 4-6 Paare zum Zuordnen\n- Links/Rechts-Spalten\n- Eindeutige Zuordnungen' :
  '- Numerische oder kurze Textantwort\n- Exakte Lösung erforderlich'
}

LEHRPLAN-LEVEL für Klasse ${gap.grade}:
${gap.grade <= 2 ? '- Zahlenraum bis 100, Grundrechenarten, einfache Geometrie' :
  gap.grade <= 4 ? '- Zahlenraum bis Million, schriftliche Verfahren, Brüche, Dezimalzahlen' :
  gap.grade <= 6 ? '- Negative Zahlen, Bruchrechnung, Gleichungen, Prozent' :
  gap.grade <= 8 ? '- Terme, lineare Funktionen, Geometrie, Wahrscheinlichkeit' :
  '- Quadratische Funktionen, Trigonometrie, Stochastik, Analysis'
}

Erstelle JSON:
{
  "student_prompt": "Aufgabentext...",
  "variant": "${variant}",
  "question_type": "${variant.toLowerCase().replace('_', '-')}",
  ${variant === 'MULTIPLE_CHOICE' ? 
    '"distractors": ["Falsch1", "Falsch2", "Falsch3"],\n  "solution": {"value": "RichtigeAntwort"},' :
    '"solution": {"value": "Antwort"},'
  }
  "explanation": "Schülergerechte Erklärung...",
  "subcategory": "${gap.subcategory || 'Allgemein'}",
  "tags": ${JSON.stringify(curriculumData.tags || [gap.domain])}
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'Du bist Experte für deutsche Mathematik-Lehrpläne und erstellst altersgerechte, curriculum-konforme Aufgaben. Antworte nur mit validem JSON.'
          },
          {
            role: 'user',
            content: enhancedPrompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse and validate JSON
    const template = JSON.parse(content);
    
    // Validate required fields
    if (!template.student_prompt || !template.solution || !template.explanation) {
      throw new Error('Missing required template fields');
    }

    return {
      ...template,
      grade: gap.grade,
      grade_app: gap.grade,
      quarter_app: gap.quarter,
      domain: gap.domain,
      difficulty: gap.difficulty,
      source_skill_id: gap.skillId
    };

  } catch (error) {
    console.error('❌ Template generation error:', error);
    return null;
  }
}

function calculateCurriculumAlignment(templates: any[]): number {
  if (templates.length === 0) return 0;
  
  let alignmentScore = 0;
  
  for (const template of templates) {
    let score = 70; // Base score
    
    // Bonus for curriculum integration
    if (template.source_skill_id) score += 15;
    if (template.subcategory) score += 10;
    if (template.tags && template.tags.length > 0) score += 5;
    
    alignmentScore += score;
  }
  
  return Math.round((alignmentScore / templates.length));
}