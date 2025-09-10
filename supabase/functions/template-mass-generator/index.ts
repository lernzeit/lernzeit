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
}

interface MathCurriculumItem {
  id: string;
  grade: number;
  grade_app: number;
  quarter_teach: string;
  quarter_app: string;
  domain: string;
  subcategory: string;
  skill: string;
  tags: string[];
}

// Math curriculum data for systematic coverage (Klassen 1-10)
const MATH_CURRICULUM: MathCurriculumItem[] = [
  // Klasse 1
  { id: "G1-Q1-ZA-1", grade: 1, grade_app: 1, quarter_teach: "Q1", quarter_app: "Q2", domain: "Zahlen & Operationen", subcategory: "Zahlvorstellung/Zählen", skill: "Zählen bis 10; Anzahlen vergleichen", tags: ["Zählen", "ZR_10"] },
  { id: "G1-Q1-ZA-2", grade: 1, grade_app: 1, quarter_teach: "Q1", quarter_app: "Q2", domain: "Zahlen & Operationen", subcategory: "Add/Sub (mental)", skill: "Plus/Minus im ZR 10 ohne Übergang", tags: ["Addition", "Subtraktion", "ZR_10"] },
  { id: "G1-Q1-RA-1", grade: 1, grade_app: 1, quarter_teach: "Q1", quarter_app: "Q2", domain: "Raum & Form", subcategory: "Formen erkennen", skill: "Kreis, Dreieck, Quadrat, Rechteck unterscheiden", tags: ["Formen", "Eigenschaften"] },
  { id: "G1-Q1-GR-1", grade: 1, grade_app: 1, quarter_teach: "Q1", quarter_app: "Q2", domain: "Größen & Messen", subcategory: "Messen/Schätzen", skill: "Längen schätzen und vergleichen (unstandardisiert)", tags: ["Länge", "Schätzen"] },
  
  // Klasse 2
  { id: "G2-Q1-ZA-1", grade: 2, grade_app: 2, quarter_teach: "Q1", quarter_app: "Q2", domain: "Zahlen & Operationen", subcategory: "Add/Sub im ZR 100", skill: "Halbschriftlich & schriftnah mit Übergang", tags: ["Addition", "Subtraktion", "ZR_100"] },
  { id: "G2-Q1-ZA-2", grade: 2, grade_app: 2, quarter_teach: "Q1", quarter_app: "Q2", domain: "Zahlen & Operationen", subcategory: "Einmaleins (Aufbau)", skill: "2er/5er/10er Reihen, Tausch-/Verbundaufgaben", tags: ["Einmaleins", "ZR_100"] },
  
  // Klasse 3-10 (abbreviated for space, will generate all systematically)
  { id: "G3-Q1-ZA-1", grade: 3, grade_app: 3, quarter_teach: "Q1", quarter_app: "Q2", domain: "Zahlen & Operationen", subcategory: "ZR 1000 sicher", skill: "Ordnen, Runden, Zahlstrahl", tags: ["Runden", "ZR_1000"] },
  { id: "G4-Q1-ZA-1", grade: 4, grade_app: 4, quarter_teach: "Q1", quarter_app: "Q2", domain: "Zahlen & Operationen", subcategory: "ZR 1 Mio", skill: "Stellenwert, Runden, Zahlbeziehungen", tags: ["ZR_1000000"] },
  { id: "G5-Q1-ZA-1", grade: 5, grade_app: 5, quarter_teach: "Q1", quarter_app: "Q2", domain: "Zahlen & Operationen", subcategory: "Negative Zahlen", skill: "Zahlengerade, Vergleiche, Addition/Subtraktion", tags: ["Rationale", "Negative"] }
];

const DIFFICULTY_LEVELS = ["AFB I", "AFB II", "AFB III"];
const QUESTION_TYPES = ["multiple-choice", "text-input"];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Template Mass Generator started');
    
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
      forceRegenerate = false
    } = request;

    console.log(`📊 Generation request:`, { targetCount, grade, quarter, domain, difficulty });

    // Step 1: Analyze coverage gaps
    const { data: existingTemplates } = await supabase
      .from('templates')
      .select('grade, quarter_app, domain, difficulty')
      .eq('status', 'ACTIVE');

    console.log(`📈 Found ${existingTemplates?.length || 0} existing templates`);

    // Step 2: Identify priority gaps
    const gaps = identifyCoverageGaps(existingTemplates || [], grade, quarter, domain, difficulty);
    console.log(`🎯 Identified ${gaps.length} coverage gaps`);

    // Step 3: Generate templates systematically
    const results = {
      totalGenerated: 0,
      successCount: 0,
      errorCount: 0,
      errors: [] as string[],
      generatedTemplates: [] as any[],
      coverageImprovement: 0
    };

    const targetGaps = gaps.slice(0, Math.min(targetCount, gaps.length));
    
    for (const gap of targetGaps) {
      try {
        console.log(`🧮 Generating for Grade ${gap.grade}, ${gap.quarter}, ${gap.domain}, ${gap.difficulty}`);
        
        const templates = await generateTemplatesForGap(gap, openaiApiKey, 5); // 5 templates per gap
        
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
              status: 'ACTIVE',
              created_at: new Date().toISOString(),
              plays: 0,
              correct: 0,
              rating_sum: 0,
              rating_count: 0
            });

          if (error) {
            console.error('❌ Insert error:', error);
            results.errors.push(`Insert failed: ${error.message}`);
            results.errorCount++;
          } else {
            results.successCount++;
            results.generatedTemplates.push(template);
            console.log('✅ Template saved successfully');
          }
        }
        
        results.totalGenerated += templates.length;
        
      } catch (error) {
        console.error(`❌ Gap generation error:`, error);
        results.errors.push(`Gap ${gap.grade}-${gap.quarter}-${gap.domain}: ${error.message}`);
        results.errorCount++;
      }
    }

    // Step 4: Calculate coverage improvement
    const { data: newCount } = await supabase
      .from('templates')
      .select('id', { count: 'exact' })
      .eq('status', 'ACTIVE');

    results.coverageImprovement = (newCount?.length || 0) - (existingTemplates?.length || 0);

    console.log(`🏆 Mass generation completed:`, results);

    return new Response(JSON.stringify({
      success: true,
      message: `Generated ${results.totalGenerated} templates, ${results.successCount} saved successfully`,
      ...results,
      processingStats: {
        requestedCount: targetCount,
        gapsFound: gaps.length,
        gapsProcessed: targetGaps.length,
        successRate: `${Math.round((results.successCount / results.totalGenerated) * 100)}%`
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Mass generator error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function identifyCoverageGaps(
  existing: any[], 
  targetGrade?: number, 
  targetQuarter?: string, 
  targetDomain?: string,
  targetDifficulty?: string
) {
  const gaps = [];
  
  // Generate all possible combinations
  const grades = targetGrade ? [targetGrade] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const quarters = targetQuarter ? [targetQuarter] : ["Q1", "Q2", "Q3", "Q4"];
  const domains = targetDomain ? [targetDomain] : [
    "Zahlen & Operationen",
    "Größen & Messen", 
    "Raum & Form",
    "Daten & Zufall",
    "Gleichungen & Funktionen"
  ];
  const difficulties = targetDifficulty ? [targetDifficulty] : DIFFICULTY_LEVELS;

  for (const grade of grades) {
    for (const quarter of quarters) {
      for (const domain of domains) {
        for (const difficulty of difficulties) {
          // Count existing templates for this combination
          const existingCount = existing.filter(t => 
            t.grade === grade && 
            t.quarter_app === quarter && 
            t.domain === domain && 
            t.difficulty === difficulty
          ).length;
          
          // Target: minimum 10-15 templates per combination
          const targetMinimum = 12;
          
          if (existingCount < targetMinimum) {
            gaps.push({
              grade,
              quarter,
              domain,
              difficulty,
              existing: existingCount,
              needed: targetMinimum - existingCount,
              priority: calculatePriority(grade, quarter, domain, difficulty, existingCount)
            });
          }
        }
      }
    }
  }
  
  // Sort by priority (higher priority first)
  return gaps.sort((a, b) => b.priority - a.priority);
}

function calculatePriority(grade: number, quarter: string, domain: string, difficulty: string, existing: number): number {
  let priority = 100; // Base priority
  
  // Higher priority for lower grades (foundation is critical)
  priority += (11 - grade) * 10;
  
  // Higher priority for core domains
  if (domain === "Zahlen & Operationen") priority += 50;
  if (domain === "Größen & Messen") priority += 30;
  
  // Higher priority for basic difficulties
  if (difficulty === "AFB I") priority += 30;
  if (difficulty === "AFB II") priority += 20;
  
  // Higher priority for earlier quarters
  const quarterPriority = { "Q1": 40, "Q2": 30, "Q3": 20, "Q4": 10 };
  priority += quarterPriority[quarter as keyof typeof quarterPriority] || 0;
  
  // Much higher priority for completely missing combinations
  if (existing === 0) priority += 100;
  
  return priority;
}

async function generateTemplatesForGap(gap: any, apiKey: string, count: number = 5) {
  const prompt = buildMathGenerationPrompt(gap);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: 'You are an expert mathematics curriculum designer creating German curriculum-compliant educational templates.' },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    return parseGeneratedTemplates(content, count);
    
  } catch (error) {
    console.error('❌ AI generation error:', error);
    throw error;
  }
}

function buildMathGenerationPrompt(gap: any): string {
  return `
Erstelle ${5} verschiedene Mathematik-Aufgaben für das deutsche Schulsystem:

**Zielgruppe:** Klasse ${gap.grade}, ${gap.quarter}
**Bereich:** ${gap.domain}
**Schwierigkeit:** ${gap.difficulty}

**Anforderungen:**
1. **Curriculum-Konform:** Genau passend für deutsche Lehrpläne Klasse ${gap.grade}
2. **Anti-Visual:** KEINE Diagramme, Grafiken oder Bilder (außer bei Klasse 1 einfache Emojis: 🍎🍌)
3. **Schwierigkeitsgrad ${gap.difficulty}:**
   - AFB I: Reproduktion, einfache Anwendung
   - AFB II: Zusammenhänge erkennen, Methoden anwenden
   - AFB III: Verallgemeinern, Bewerten, komplexe Probleme
4. **Deutsche Sprache:** Vollständig auf Deutsch
5. **Präzise Lösungen:** Eindeutige, berechenbare Antworten

**Format pro Aufgabe:**
\`\`\`json
{
  "student_prompt": "Die vollständige Aufgabenstellung auf Deutsch",
  "solution": {"value": "Die exakte Lösung"},
  "explanation": "Detaillierte Schritt-für-Schritt Erklärung",
  "question_type": "multiple-choice" oder "text-input",
  "distractors": ["Falsche Antwort 1", "Falsche Antwort 2", "Falsche Antwort 3"],
  "tags": ["passende", "curriculum", "tags"],
  "subcategory": "Spezifische Unterkategorie",
  "variables": {}
}
\`\`\`

**Domain-spezifische Anforderungen für "${gap.domain}":**
${getDomainSpecificRequirements(gap.domain, gap.grade)}

Erstelle jetzt ${5} vollständige, curriculum-konforme Aufgaben im JSON-Format:
`;
}

function getDomainSpecificRequirements(domain: string, grade: number): string {
  const requirements = {
    "Zahlen & Operationen": `
- Klasse 1-2: Zahlenraum bis 20/100, Grundrechenarten
- Klasse 3-4: Zahlenraum bis 1000/Million, schriftliche Verfahren
- Klasse 5-6: Brüche, Dezimalzahlen, Prozent
- Klasse 7-8: Rationale Zahlen, Terme
- Klasse 9-10: Potenzen, Wurzeln, komplexe Zahlen`,
    
    "Größen & Messen": `
- Klasse 1-2: Länge, Zeit, Geld (einfach)
- Klasse 3-4: cm/m/km, Umfang, Fläche
- Klasse 5-6: Einheiten umrechnen, Volumen
- Klasse 7-8: Maßstab, zusammengesetzte Größen
- Klasse 9-10: Trigonometrische Berechnungen`,
    
    "Raum & Form": `
- Klasse 1-2: Grundformen erkennen, Muster
- Klasse 3-4: Eigenschaften, einfache Konstruktionen
- Klasse 5-6: Winkel, Symmetrie, Körper
- Klasse 7-8: Dreiecke, Vierecke, Ähnlichkeit
- Klasse 9-10: Trigonometrie, Koordinatengeometrie`,
    
    "Daten & Zufall": `
- Klasse 1-2: Strichlisten, einfache Diagramme
- Klasse 3-4: Mittelwert, Experimente
- Klasse 5-6: Diagramme interpretieren, relative Häufigkeit
- Klasse 7-8: Wahrscheinlichkeit, Baumdiagramme
- Klasse 9-10: Boxplots, statistische Kennwerte`,
    
    "Gleichungen & Funktionen": `
- Klasse 5-6: Terme, einfache Gleichungen
- Klasse 7-8: Lineare Funktionen, Gleichungssysteme
- Klasse 9-10: Quadratische Funktionen, Parabeln`
  };
  
  return requirements[domain] || "Allgemeine mathematische Kompetenzen für die Klassenstufe.";
}

function parseGeneratedTemplates(content: string, expectedCount: number): any[] {
  try {
    // Try to extract JSON objects from the response
    const jsonBlocks = content.match(/```json\s*([\s\S]*?)\s*```/g) || [];
    const templates = [];
    
    for (const block of jsonBlocks) {
      try {
        const jsonStr = block.replace(/```json\s*/, '').replace(/\s*```/, '');
        const parsed = JSON.parse(jsonStr);
        
        // Validate required fields
        if (parsed.student_prompt && parsed.solution && parsed.explanation) {
          templates.push({
            student_prompt: parsed.student_prompt,
            solution: parsed.solution,
            explanation: parsed.explanation,
            question_type: parsed.question_type || 'text-input',
            distractors: parsed.distractors || [],
            tags: parsed.tags || [],
            subcategory: parsed.subcategory || '',
            variables: parsed.variables || {},
            quality_score: 0.8 // High quality from AI generation
          });
        }
      } catch (parseError) {
        console.warn('⚠️ Failed to parse JSON block:', parseError);
      }
    }
    
    // Fallback: try parsing entire content as JSON array
    if (templates.length === 0) {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, expectedCount);
        }
      } catch {
        // Ignore fallback parsing errors
      }
    }
    
    console.log(`📝 Parsed ${templates.length} templates from AI response`);
    return templates.slice(0, expectedCount);
    
  } catch (error) {
    console.error('❌ Template parsing error:', error);
    return [];
  }
}