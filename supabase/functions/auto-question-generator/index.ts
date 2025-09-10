import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Vollständige Lehrplan-Daten (aus dem Curriculum)
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
  
  {"id": "G5-Q1-ZA-78895d27", "grade": 5, "grade_app": 5, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Zahlen & Operationen", "subcategory": "Negative Zahlen", "skill": "Zahlengerade, Vergleiche, Addition/Subtraktion", "tags": ["Rationale", "Negative"]},
  {"id": "G5-Q1-ZA-2765bbbb", "grade": 5, "grade_app": 5, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Zahlen & Operationen", "subcategory": "Brüche/Dezimalzahlen", "skill": "Erweitern/Kürzen, Vergleich; Umwandlung", "tags": ["Brüche", "Dezimalzahlen"]},
  {"id": "G5-Q1-GL-4086937d", "grade": 5, "grade_app": 5, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Gleichungen & Funktionen", "subcategory": "Terme/Variable", "skill": "Termwert, einfache Umformungen", "tags": ["Terme"]},
  
  {"id": "G10-Q1-GL-0758fdb2", "grade": 10, "grade_app": 10, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Gleichungen & Funktionen", "subcategory": "Quadratische Funktionen (vertiefen)", "skill": "Scheitel-/Normalform, Transformationen", "tags": ["Quadratische Funktionen"]},
  {"id": "G10-Q1-GL-1ddb178e", "grade": 10, "grade_app": 10, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Gleichungen & Funktionen", "subcategory": "Exponentialfunktionen (Grundlagen)", "skill": "Wachstum (einfach), Parameter deuten", "tags": ["Exponential"]},
  {"id": "G10-Q1-RA-9b97011f", "grade": 10, "grade_app": 10, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Raum & Form", "subcategory": "Trigonometrie Anwendungen", "skill": "Strecken/Winkel berechnen", "tags": ["Trigonometrie"]}
];

const DIFFICULTY_LEVELS = ["easy", "medium", "hard"];

interface CoverageGap {
  grade: number;
  quarter: string;
  domain: string;
  difficulty: string;
  skillId?: string;
  skill?: string;
  subcategory?: string;
  existing: number;
  needed: number;
  priority: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Intelligenter Auto-Generator: Systematische Lehrplan-basierte Generierung...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Phase 1: Vollständige Coverage-Gap-Analyse
    const { data: existingTemplates, error: fetchError } = await supabase
      .from('templates')
      .select('grade, grade_app, quarter_app, domain, difficulty, subcategory, source_skill_id')
      .eq('status', 'ACTIVE');

    if (fetchError) {
      console.error('❌ Fehler beim Laden der Templates:', fetchError);
      throw fetchError;
    }

    console.log(`📊 Existierende Templates: ${existingTemplates?.length || 0}`);

    // Phase 2: Intelligente Lücken-Identifikation
    const gaps = identifySystematicCoverageGaps(existingTemplates || []);
    console.log(`🎯 Identifizierte Lücken: ${gaps.length}`);

    if (gaps.length === 0) {
      console.log('✅ Keine prioritären Lücken gefunden, System ist ausgewogen');
      return new Response(JSON.stringify({
        success: true,
        message: 'Keine Lücken gefunden - System ist ausgewogen',
        currentCount: existingTemplates?.length || 0,
        generated: 0,
        coverage: 'optimal'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Phase 3: Priorisierte Generierung 
    const topGap = gaps[0]; // Höchste Priorität
    console.log(`🎲 Generierung für höchste Priorität:`, {
      grade: topGap.grade,
      quarter: topGap.quarter,
      domain: topGap.domain,
      difficulty: topGap.difficulty,
      skill: topGap.skill,
      priority: topGap.priority
    });

    // Phase 4: Template-Mass-Generator aufrufen für effiziente Batch-Generierung
    const { data: generateResult, error: generateError } = await supabase.functions.invoke('template-mass-generator', {
      body: {
        targetCount: Math.min(15, topGap.needed), // Nicht mehr als 15 pro Durchlauf
        grade: topGap.grade,
        quarter: topGap.quarter,
        domain: topGap.domain,
        difficulty: topGap.difficulty,
        curriculumMode: true, // Neue Flag für lehrplan-basierte Generierung
        skillId: topGap.skillId,
        skill: topGap.skill,
        subcategory: topGap.subcategory
      }
    });

    if (generateError) {
      console.error('❌ Batch-Generierung Fehler:', generateError);
      throw generateError;
    }

    console.log('✅ Systematische Generierung abgeschlossen:', generateResult);

    return new Response(JSON.stringify({
      success: true,
      message: `Systematische Generierung: ${generateResult?.successCount || 0} Templates für ${topGap.domain} Klasse ${topGap.grade}`,
      currentCount: existingTemplates?.length || 0,
      generated: generateResult?.totalGenerated || 0,
      gap: {
        grade: topGap.grade,
        quarter: topGap.quarter,
        domain: topGap.domain,
        difficulty: topGap.difficulty,
        priority: topGap.priority
      },
      coverageStats: {
        totalGaps: gaps.length,
        highPriorityGaps: gaps.filter(g => g.priority > 200).length,
        processedGap: topGap
      },
      generateResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Intelligenter Auto-Generator Fehler:', error);
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

function identifySystematicCoverageGaps(existing: any[]): CoverageGap[] {
  const gaps: CoverageGap[] = [];
  const MIN_TEMPLATES_PER_COMBINATION = 12; // Mindestanzahl pro Kombination
  
  // Für jede Lehrplan-Einheit prüfen
  for (const curriculumItem of FULL_CURRICULUM) {
    for (const difficulty of DIFFICULTY_LEVELS) {
      // Bestehende Templates für diese Kombination zählen
      const existingCount = existing.filter(t => 
        t.grade_app === curriculumItem.grade_app &&
        t.quarter_app === curriculumItem.quarter_app &&
        t.domain === curriculumItem.domain &&
        t.difficulty === difficulty &&
        (t.source_skill_id === curriculumItem.id || t.subcategory === curriculumItem.subcategory)
      ).length;

      if (existingCount < MIN_TEMPLATES_PER_COMBINATION) {
        const gap: CoverageGap = {
          grade: curriculumItem.grade_app,
          quarter: curriculumItem.quarter_app,
          domain: curriculumItem.domain,
          difficulty: difficulty,
          skillId: curriculumItem.id,
          skill: curriculumItem.skill,
          subcategory: curriculumItem.subcategory,
          existing: existingCount,
          needed: MIN_TEMPLATES_PER_COMBINATION - existingCount,
          priority: calculateSystematicPriority(curriculumItem, difficulty, existingCount)
        };
        gaps.push(gap);
      }
    }
  }

  // Sortiere nach Priorität (höchste zuerst)
  return gaps.sort((a, b) => b.priority - a.priority);
}

function calculateSystematicPriority(curriculumItem: any, difficulty: string, existingCount: number): number {
  let priority = 100; // Basis-Priorität

  // 1. Klassenstufe (Grundlagen sind wichtiger)
  priority += (11 - curriculumItem.grade_app) * 15;
  
  // 2. Domain-Priorität basierend auf Curriculum-Wichtigkeit
  const domainPriorities = {
    "Zahlen & Operationen": 60,    // Höchste Priorität - Grundlage
    "Größen & Messen": 40,         // Wichtig für Alltag
    "Raum & Form": 35,             // Geometrisches Verständnis
    "Gleichungen & Funktionen": 50, // Höhere Klassen wichtig
    "Daten & Zufall": 25           // Ergänzend
  };
  priority += domainPriorities[curriculumItem.domain] || 20;

  // 3. Schwierigkeitsgrad-Priorität (ausgeglichene Verteilung)
  const difficultyPriorities = { "easy": 40, "medium": 35, "hard": 25 };
  priority += difficultyPriorities[difficulty] || 0;

  // 4. Quartal-Priorität (Q1 ist fundamentaler)
  const quarterPriorities = { "Q1": 50, "Q2": 40, "Q3": 30, "Q4": 25 };
  priority += quarterPriorities[curriculumItem.quarter_app] || 0;

  // 5. Kritische Lücken (komplett fehlende Kombinationen)
  if (existingCount === 0) {
    priority += 120; // Massive Priorität für komplett fehlende Bereiche
  } else if (existingCount < 5) {
    priority += 60; // Hohe Priorität für fast leere Bereiche
  }

  // 6. Skill-spezifische Priorität
  const skillText = curriculumItem.skill?.toLowerCase() || '';
  if (skillText.includes('grundlagen') || skillText.includes('einführung')) {
    priority += 30; // Grundlagen-Skills sind wichtiger
  }
  if (skillText.includes('zählen') || skillText.includes('rechnen') || skillText.includes('addition')) {
    priority += 25; // Fundamentale mathematische Skills
  }

  return Math.round(priority);
}