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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Enhanced Template Mass Generator - Curriculum-Compliant');
    
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
      .select('grade, grade_app, quarter_app, domain, difficulty, subcategory, source_skill_id')
      .eq('status', 'ACTIVE');

    console.log(`📈 Existing Templates: ${existingTemplates?.length || 0}`);

    // Phase 2: Curriculum-integrierte Lücken-Identifikation
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

    // Phase 3: Systematische Template-Generierung
    const results = {
      totalGenerated: 0,
      successCount: 0,
      errorCount: 0,
      errors: [] as string[],
      generatedTemplates: [] as any[],
      coverageImprovement: 0,
      curriculumAlignment: 0
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
        
        const templates = await generateCurriculumCompliantTemplates(
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
      message: `Generated ${results.totalGenerated} curriculum-compliant templates, ${results.successCount} saved`,
      ...results,
      processingStats: {
        requestedCount: targetCount,
        gapsFound: gaps.length,
        gapsProcessed: targetGaps.length,
        successRate: `${Math.round((results.successCount / results.totalGenerated) * 100)}%`,
        curriculumMode: curriculumMode
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Enhanced Mass Generator Error:', error);
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

function identifyEnhancedCoverageGaps(
  existing: any[], 
  targetGrade?: number, 
  targetQuarter?: string, 
  targetDomain?: string,
  targetDifficulty?: string,
  curriculumMode?: boolean,
  targetSkillId?: string
) {
  const gaps = [];
  
  if (curriculumMode && targetSkillId) {
    // Spezifische Skill-basierte Lücken-Analyse
    const curriculumItem = FULL_CURRICULUM.find(item => item.id === targetSkillId);
    if (curriculumItem) {
      const difficulties = targetDifficulty ? [targetDifficulty] : DIFFICULTY_LEVELS;
      
      for (const difficulty of difficulties) {
        const existingCount = existing.filter(t => 
          t.grade_app === curriculumItem.grade_app &&
          t.quarter_app === curriculumItem.quarter_app &&
          t.domain === curriculumItem.domain &&
          t.difficulty === difficulty &&
          (t.source_skill_id === curriculumItem.id || t.subcategory === curriculumItem.subcategory)
        ).length;
        
        const targetMinimum = 15;
        if (existingCount < targetMinimum) {
          gaps.push({
            grade: curriculumItem.grade_app,
            quarter: curriculumItem.quarter_app,
            domain: curriculumItem.domain,
            difficulty: difficulty,
            skillId: curriculumItem.id,
            skill: curriculumItem.skill,
            subcategory: curriculumItem.subcategory,
            tags: curriculumItem.tags,
            existing: existingCount,
            needed: targetMinimum - existingCount,
            priority: calculateEnhancedPriority(curriculumItem, difficulty, existingCount),
            curriculumData: curriculumItem
          });
        }
      }
    }
  } else {
    // Vollständige systematische Analyse
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
            // Curriculum-Items für diese Kombination finden
            const relevantCurriculumItems = FULL_CURRICULUM.filter(item =>
              item.grade_app === grade &&
              item.quarter_app === quarter &&
              item.domain === domain
            );

            if (relevantCurriculumItems.length > 0) {
              // Für jeden Curriculum-Item prüfen
              for (const curriculumItem of relevantCurriculumItems) {
                const existingCount = existing.filter(t => 
                  t.grade_app === grade &&
                  t.quarter_app === quarter &&
                  t.domain === domain &&
                  t.difficulty === difficulty &&
                  (t.source_skill_id === curriculumItem.id || t.subcategory === curriculumItem.subcategory)
                ).length;
                
                const targetMinimum = 12;
                if (existingCount < targetMinimum) {
                  gaps.push({
                    grade,
                    quarter,
                    domain,
                    difficulty,
                    skillId: curriculumItem.id,
                    skill: curriculumItem.skill,
                    subcategory: curriculumItem.subcategory,
                    tags: curriculumItem.tags,
                    existing: existingCount,
                    needed: targetMinimum - existingCount,
                    priority: calculateEnhancedPriority(curriculumItem, difficulty, existingCount),
                    curriculumData: curriculumItem
                  });
                }
              }
            } else {
              // Fallback für Domänen ohne spezifische Curriculum-Items
              const existingCount = existing.filter(t => 
                t.grade_app === grade &&
                t.quarter_app === quarter &&
                t.domain === domain &&
                t.difficulty === difficulty
              ).length;
              
              const targetMinimum = 8; // Niedrigere Mindestanzahl für unspezifische Bereiche
              if (existingCount < targetMinimum) {
                gaps.push({
                  grade,
                  quarter,
                  domain,
                  difficulty,
                  skillId: null,
                  skill: `Allgemeine ${domain} Kompetenzen`,
                  subcategory: 'Allgemein',
                  tags: [],
                  existing: existingCount,
                  needed: targetMinimum - existingCount,
                  priority: calculateBasicPriority(grade, quarter, domain, difficulty, existingCount),
                  curriculumData: null
                });
              }
            }
          }
        }
      }
    }
  }
  
  return gaps.sort((a, b) => b.priority - a.priority);
}

function calculateEnhancedPriority(curriculumItem: any, difficulty: string, existingCount: number): number {
  let priority = 120; // Höhere Basis-Priorität für Curriculum-Items

  // Klassenstufe-Gewichtung
  priority += (11 - curriculumItem.grade_app) * 12;
  
  // Domain-spezifische Prioritäten
  const domainPriorities = {
    "Zahlen & Operationen": 70,
    "Gleichungen & Funktionen": 60,
    "Größen & Messen": 45,
    "Raum & Form": 40,
    "Daten & Zufall": 30
  };
  priority += domainPriorities[curriculumItem.domain] || 25;

  // Schwierigkeitsgrad (ausgewogene Verteilung)
  const difficultyPriorities = { "easy": 45, "medium": 40, "hard": 30 };
  priority += difficultyPriorities[difficulty] || 0;

  // Quartal-Priorität
  const quarterPriorities = { "Q1": 60, "Q2": 50, "Q3": 40, "Q4": 35 };
  priority += quarterPriorities[curriculumItem.quarter_app] || 0;

  // Kritische Lücken
  if (existingCount === 0) priority += 150;
  else if (existingCount < 3) priority += 80;
  else if (existingCount < 6) priority += 40;

  // Skill-Wichtigkeit
  const skillText = curriculumItem.skill?.toLowerCase() || '';
  if (skillText.includes('grundlagen') || skillText.includes('einführung')) priority += 40;
  if (skillText.includes('zählen') || skillText.includes('rechnen')) priority += 35;
  if (skillText.includes('verstehen') || skillText.includes('erkennen')) priority += 25;

  // Tag-basierte Prioritäten
  if (curriculumItem.tags?.includes('ZR_10') || curriculumItem.tags?.includes('ZR_20')) priority += 30;
  if (curriculumItem.tags?.includes('Addition') || curriculumItem.tags?.includes('Subtraktion')) priority += 25;

  return Math.round(priority);
}

function calculateBasicPriority(grade: number, quarter: string, domain: string, difficulty: string, existing: number): number {
  let priority = 80; // Niedrigere Basis-Priorität für unspezifische Items
  
  priority += (11 - grade) * 8;
  
  const domainPriorities = {
    "Zahlen & Operationen": 50, "Größen & Messen": 30, "Raum & Form": 25,
    "Daten & Zufall": 20, "Gleichungen & Funktionen": 40
  };
  priority += domainPriorities[domain] || 15;
  
  const difficultyPriorities = { "easy": 30, "medium": 25, "hard": 20 };
  priority += difficultyPriorities[difficulty] || 0;
  
  const quarterPriorities = { "Q1": 40, "Q2": 30, "Q3": 25, "Q4": 20 };
  priority += quarterPriorities[quarter as keyof typeof quarterPriorities] || 0;
  
  if (existing === 0) priority += 100;
  
  return Math.round(priority);
}

async function generateCurriculumCompliantTemplates(gap: any, apiKey: string, count: number = 5) {
  const prompt = buildEnhancedCurriculumPrompt(gap);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Du bist ein Experte für deutsches Mathematik-Curriculum und erstellst perfekte, lehrplangerechte Aufgaben für deutsche Schulen.' 
          },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 5000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    return parseEnhancedTemplates(content, count);
    
  } catch (error) {
    console.error('❌ Enhanced AI generation error:', error);
    throw error;
  }
}

function buildEnhancedCurriculumPrompt(gap: any): string {
  return `
# DEUTSCHES MATHEMATIK-CURRICULUM: PRÄZISE AUFGABEN-ERSTELLUNG

Du bist Experte für **deutsches Mathematik-Curriculum** und erstellst Aufgaben nach **deutschen Bildungsstandards**.

## ZIELSPEZIFIKATION
**Klassenstufe:** ${gap.grade}
**Schuljahr-Quartal:** ${gap.quarter}  
**Fachbereich:** ${gap.domain}
**Schwierigkeitsgrad:** ${gap.difficulty}
**Spezifische Kompetenz:** ${gap.skill}
**Unterkategorie:** ${gap.subcategory}
${gap.tags ? `**Curriculum-Tags:** ${gap.tags.join(', ')}` : ''}

## LEHRPLAN-KONFORMITÄT (KRITISCH!)

### Klassenstufe ${gap.grade} - ${gap.quarter} Requirements:
${getDomainCurriculumRequirements(gap.domain, gap.grade, gap.quarter)}

### Schwierigkeitsgrad "${gap.difficulty}" Definition:
${getDifficultyDefinition(gap.difficulty, gap.grade)}

### Spezifische Kompetenz-Anforderungen:
**Skill:** ${gap.skill}
- Diese Kompetenz MUSS im Mittelpunkt jeder Aufgabe stehen
- Aufgaben müssen diese spezifische Fähigkeit gezielt trainieren
- Realitätsbezug für Klasse ${gap.grade} herstellen

## QUALITÄTS-STANDARDS (NICHT-VERHANDELBAR!)

### 1. MATHEMATISCHE PERFEKTION
- ALLE Berechnungen 100% korrekt
- Eindeutige, nachprüfbare Lösungen
- Keine Rundungs- oder Rechenfehler
- Altersgerechte Zahlenräume

### 2. PÄDAGOGISCHE EXZELLENZ  
- Sprache für ${gap.grade}. Klasse optimal
- Schritt-für-Schritt Erklärungen
- Positive, ermutigende Formulierung
- Alltagsbezug und Motivation

### 3. ANTI-VISUAL DESIGN
- KEINE Diagramme, Grafiken, Konstruktionen
- Nur bei Klasse 1: Simple Emojis (🍎🏀⭐)
- Rein textbasierte Mathematik
- VERBOTEN: "zeichne", "male", "konstruiere"

## ERWARTETES JSON-FORMAT:

Erstelle genau ${Math.min(8, gap.needed)} Aufgaben im Format:

\`\`\`json
[
  {
    "student_prompt": "Vollständige, verständliche Aufgabe in deutscher Sprache",
    "solution": {"value": "EXAKTE_ANTWORT_ALS_STRING"},
    "explanation": "Kindgerechte Schritt-für-Schritt Erklärung mit positiver Sprache",
    "question_type": "text-input",
    "distractors": ["Plausible falsche Antwort 1", "Falsche Antwort 2", "Falsche Antwort 3"],
    "tags": ["${gap.tags?.join('", "') || 'Mathematik'}"],
    "subcategory": "${gap.subcategory}",
    "variables": {},
    "unit": "${getExpectedUnit(gap.domain, gap.skill)}"
  }
]
\`\`\`

## DOMAIN-SPEZIFISCHE EXPERTISE:
${getAdvancedDomainGuidance(gap.domain, gap.grade, gap.skill)}

## BEISPIEL KINDGERECHTE ERKLÄRUNG:
❌ Falsch: "Verwende die Formel V = l × b × h"
✅ Richtig: "Um das Volumen zu berechnen, multiplizierst du Länge × Breite × Höhe. Also: 4 × 3 × 2 = 24. Das Volumen ist 24 cm³."

**JETZT ERSTELLE ${Math.min(8, gap.needed)} PERFEKTE, LEHRPLANGERECHTE AUFGABEN:**`;
}

function getDomainCurriculumRequirements(domain: string, grade: number, quarter: string): string {
  const requirements = {
    "Zahlen & Operationen": {
      1: "Zahlraum 0-20, Grundrechenarten ohne Übergang, Zählen und Zahlverständnis",
      2: "Zahlraum 0-100, Einmaleins, halbschriftliche Verfahren",
      3: "Zahlraum 0-1000, schriftliche Addition/Subtraktion, Multiplikation",
      4: "Zahlraum bis 1 Million, alle schriftlichen Verfahren",
      5: "Negative Zahlen, Brüche, Dezimalzahlen, Prozent-Grundlagen",
      6: "Rationale Zahlen, Prozentrechnung, Potenzen (Grundlagen)",
      7: "Terme, lineare Gleichungen, Prozent-/Zinsrechnung",
      8: "Termumformungen, lineare Funktionen, Gleichungssysteme",
      9: "Quadratische Funktionen, Wurzeln, Potenzen erweitert",
      10: "Exponentialfunktionen, komplexe Terme, Zinseszins"
    },
    "Größen & Messen": {
      1: "Längen vergleichen, Zeit (Stunde), Geld (Euro/Cent)",
      2: "cm/m, Uhrzeit, Geld bis 100€",
      3: "mm/cm/m/km, Zeit-Spannen, Umfang/Fläche Rechteck",
      4: "Alle Längeneinheiten, Volumen, Maßstab einfach",
      5: "Flächeninhalt, Volumen Quader, Umrechnungen sicher",
      6: "Kreis (Umfang/Fläche), Prismen-Volumen",
      7: "Oberflächen, zusammengesetzte Körper",
      8: "Zylinder, Kegel (Grundlagen), Trigonometrie einfach",
      9: "Pyramide, Kegel, Kugel, Trigonometrie erweitert",
      10: "Komplexe Körper, trigonometrische Berechnungen"
    },
    "Raum & Form": {
      1: "Grundformen erkennen, räumliche Lagebeziehungen",
      2: "Eigenschaften Vierecke/Dreiecke, symmetrische Figuren",
      3: "Achsensymmetrie, Muster, einfache Konstruktionen",
      4: "Koordinaten (1. Quadrant), geometrische Figuren klassifizieren",
      5: "Koordinatensystem erweitert, Dreiecke/Vierecke konstruieren",
      6: "4-Quadranten-System, Abbildungen (Spiegelung/Drehung)",
      7: "Winkel, Dreiecks-Konstruktionen, Ähnlichkeit",
      8: "Strahlensätze, Kreis-Geometrie, Koordinaten-Geometrie",
      9: "Trigonometrie im Dreieck, Vektoren (Grundlagen)",
      10: "Trigonometrische Funktionen, analytische Geometrie"
    },
    "Daten & Zufall": {
      1: "Daten sammeln, einfache Strichlisten",
      2: "Säulendiagramme lesen, Häufigkeiten zählen",
      3: "Mittelwert berechnen, einfache Experimente",
      4: "Median, Diagramme erstellen und interpretieren",
      5: "Statistik-Grundlagen, relative Häufigkeit",
      6: "Wahrscheinlichkeit als Bruch, Baumdiagramme einfach",
      7: "Laplace-Versuche, mehrstufige Experimente",
      8: "Bedingte Wahrscheinlichkeit, Vierfeldertafel",
      9: "Normalverteilung (Grundlagen), Boxplots",
      10: "Statistische Tests, Korrelation, Regression"
    },
    "Gleichungen & Funktionen": {
      5: "Variable als Platzhalter, einfache Terme",
      6: "Lineare Gleichungen (Grundform), Proportionalität",
      7: "Termumformungen, Gleichungssysteme (2 Unbekannte)",
      8: "Lineare Funktionen, Steigung, y-Achsenabschnitt",
      9: "Quadratische Funktionen, Parabeln, Nullstellen",
      10: "Exponential-/Logarithmusfunktionen, Kurvendiskussion"
    }
  };
  
  return requirements[domain]?.[grade] || `Allgemeine ${domain}-Kompetenzen für Klasse ${grade}`;
}

function getDifficultyDefinition(difficulty: string, grade: number): string {
  const definitions = {
    "easy": `Grundwissen abrufen und bekannte Verfahren anwenden. Für Klasse ${grade}: Direkte Anwendung gelernter Regeln und Formeln.`,
    "medium": `Gelerntes auf neue Situationen übertragen und Zusammenhänge erkennen. Für Klasse ${grade}: Kombination mehrerer Schritte oder leichte Transferleistungen.`,
    "hard": `Problemlösung und kreative Lösungswege finden. Für Klasse ${grade}: Unbekannte Situationen analysieren und eigenständig Lösungsstrategien entwickeln.`
  };
  return definitions[difficulty] || "Standard-Schwierigkeitsgrad";
}

function getExpectedUnit(domain: string, skill: string): string {
  const skillLower = skill?.toLowerCase() || '';
  
  if (skillLower.includes('länge') || skillLower.includes('cm') || skillLower.includes('meter')) return 'cm';
  if (skillLower.includes('fläche') || skillLower.includes('quadrat')) return 'cm²';
  if (skillLower.includes('volumen') || skillLower.includes('raum')) return 'cm³';
  if (skillLower.includes('zeit') || skillLower.includes('stunde')) return 'min';
  if (skillLower.includes('geld') || skillLower.includes('euro')) return '€';
  if (skillLower.includes('winkel') || skillLower.includes('grad')) return '°';
  if (skillLower.includes('prozent') || skillLower.includes('%')) return '%';
  if (skillLower.includes('gewicht') || skillLower.includes('gramm')) return 'g';
  
  return ''; // Keine Einheit wenn nicht eindeutig
}

function getAdvancedDomainGuidance(domain: string, grade: number, skill: string): string {
  const guidance = {
    "Zahlen & Operationen": `
**Zahlenraum:** ${grade <= 2 ? 'bis 100' : grade <= 4 ? 'bis 1.000.000' : 'unbegrenzt'}
**Rechenverfahren:** ${grade <= 3 ? 'halbschriftlich' : 'schriftlich und mental'}
**Besonderheiten:** Realitätsbezug durch Alltagssituationen, schrittweise Erklärungen`,
    
    "Größen & Messen": `
**Einheiten Klasse ${grade}:** ${grade <= 2 ? 'cm, €, h' : grade <= 4 ? 'mm-km, g-kg, min-h' : 'alle Einheiten'}
**Messgenauigkeit:** ${grade <= 3 ? 'ganze Zahlen' : 'Dezimalzahlen möglich'}
**Anwendung:** Praktische Mess- und Schätzaufgaben`,
    
    "Raum & Form": `
**Geometrie-Level:** ${grade <= 3 ? 'Erkennen und Beschreiben' : grade <= 6 ? 'Konstruieren und Berechnen' : 'Beweisen und Anwenden'}
**Hilfsmittel:** ${grade <= 4 ? 'kein Geodreieck nötig' : 'Geodreieck und Zirkel'}
**Fokus:** ${skill}`,
    
    "Daten & Zufall": `
**Daten-Umfang:** ${grade <= 3 ? 'bis 10 Werte' : 'größere Datensätze'}
**Darstellung:** ${grade <= 4 ? 'einfache Diagramme' : 'komplexe Visualisierungen'}
**Wahrscheinlichkeit:** ${grade <= 5 ? 'als Bruch' : 'als Dezimal/Prozent'}`,
    
    "Gleichungen & Funktionen": `
**Komplexität:** ${grade <= 6 ? 'lineare Zusammenhänge' : 'auch quadratische Funktionen'}
**Darstellung:** Tabelle, Graph, Formel (altersgerecht)
**Anwendung:** Realitätsbezogene Funktions-Situationen`
  };
  
  return guidance[domain] || `Spezielle Anforderungen für ${domain} in Klasse ${grade}`;
}

function parseEnhancedTemplates(content: string, expectedCount: number): any[] {
  try {
    const templates = [];
    
    // Try to extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.student_prompt && item.solution && item.explanation) {
            // Enhanced validation with curriculum compliance
            let qualityScore = 0.85; // Higher base score for curriculum mode
            
            // Quality indicators
            const prompt = item.student_prompt.toLowerCase();
            const explanation = item.explanation.toLowerCase();
            
            if (explanation.includes('schritt') || explanation.includes('zuerst')) qualityScore += 0.1;
            if (explanation.length > 60) qualityScore += 0.05;
            if (!prompt.includes('zeichn') && !prompt.includes('konstruier')) qualityScore += 0.05;
            if (prompt.includes('berechne') || prompt.includes('bestimme')) qualityScore += 0.05;
            
            // Ensure solution format
            let solution = item.solution;
            if (typeof solution === 'string' || typeof solution === 'number') {
              solution = { value: solution.toString() };
            }
            
            templates.push({
              student_prompt: item.student_prompt,
              solution: solution,
              explanation: item.explanation,
              question_type: item.question_type || 'text-input',
              distractors: Array.isArray(item.distractors) ? item.distractors : [],
              tags: Array.isArray(item.tags) ? item.tags : [],
              subcategory: item.subcategory || '',
              variables: item.variables || {},
              unit: item.unit || '',
              quality_score: Math.min(1.0, qualityScore)
            });
            
            console.log(`✅ Enhanced template validated (Quality: ${Math.min(1.0, qualityScore).toFixed(2)})`);
          }
        }
      }
    }
    
    console.log(`🔍 Parsed ${templates.length} enhanced templates from AI response`);
    return templates;
    
  } catch (error) {
    console.error('❌ Enhanced parsing error:', error);
    return [];
  }
}

function calculateCurriculumAlignment(templates: any[]): number {
  if (templates.length === 0) return 0;
  
  let alignmentScore = 0;
  for (const template of templates) {
    let score = 0.5; // Base alignment
    
    if (template.subcategory && template.subcategory !== '') score += 0.2;
    if (template.tags && template.tags.length > 0) score += 0.15;
    if (template.unit && template.unit !== '') score += 0.1;
    if (template.quality_score > 0.8) score += 0.05;
    
    alignmentScore += Math.min(1.0, score);
  }
  
  return Math.round((alignmentScore / templates.length) * 100);
}