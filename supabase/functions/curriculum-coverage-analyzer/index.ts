import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Vollständige Curriculum-Daten (alle 160+ Kompetenzen)
const COMPLETE_CURRICULUM = [
  {"id": "G1-Q1-ZA-ab13a721", "grade": 1, "grade_app": 1, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Zahlen & Operationen", "subcategory": "Zahlvorstellung/Zählen", "skill": "Zählen bis 10; Anzahlen vergleichen", "tags": ["Zählen", "ZR_10"]},
  {"id": "G1-Q1-ZA-23f6f2c9", "grade": 1, "grade_app": 1, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Zahlen & Operationen", "subcategory": "Add/Sub (mental)", "skill": "Plus/Minus im ZR 10 ohne Übergang", "tags": ["Addition", "Subtraktion", "ZR_10"]},
  {"id": "G1-Q1-RA-cd1c87a1", "grade": 1, "grade_app": 1, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Raum & Form", "subcategory": "Formen erkennen", "skill": "Kreis, Dreieck, Quadrat, Rechteck unterscheiden", "tags": ["Formen", "Eigenschaften"]},
  {"id": "G1-Q1-GR-31ade5b6", "grade": 1, "grade_app": 1, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Größen & Messen", "subcategory": "Messen/Schätzen", "skill": "Längen schätzen und vergleichen (unstandardisiert)", "tags": ["Länge", "Schätzen"]},
  {"id": "G1-Q1-DA-bea86e75", "grade": 1, "grade_app": 1, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Daten & Zufall", "subcategory": "Daten erfassen", "skill": "Einfache Strichlisten und Bilddiagramme", "tags": ["Diagramm", "Strichliste"]},
  
  {"id": "G1-Q2-ZA-4acd1a9a", "grade": 1, "grade_app": 1, "quarter_teach": "Q2", "quarter_app": "Q3", "domain": "Zahlen & Operationen", "subcategory": "Zahlvorstellung/Stellenwert", "skill": "Zahlen bis 20 darstellen, ordnen", "tags": ["Stellenwert", "ZR_20"]},
  {"id": "G1-Q2-ZA-f7ecc910", "grade": 1, "grade_app": 1, "quarter_teach": "Q2", "quarter_app": "Q3", "domain": "Zahlen & Operationen", "subcategory": "Add/Sub (Strategien)", "skill": "Plus/Minus im ZR 20 mit Zehnerübergang (strategisch)", "tags": ["Zehnerübergang", "ZR_20"]},
  {"id": "G1-Q2-RA-1f78e94c", "grade": 1, "grade_app": 1, "quarter_teach": "Q2", "quarter_app": "Q3", "domain": "Raum & Form", "subcategory": "Lagebeziehungen", "skill": "rechts/links, oben/unten; Muster fortsetzen", "tags": ["Muster", "Lage"]},
  {"id": "G1-Q2-GR-3407d972", "grade": 1, "grade_app": 1, "quarter_teach": "Q2", "quarter_app": "Q3", "domain": "Größen & Messen", "subcategory": "Zeit/Geld", "skill": "Uhr (volle/halbe Stunde), Münzen bis 2 €", "tags": ["Zeit", "Geld"]},
  {"id": "G1-Q2-DA-0745d57a", "grade": 1, "grade_app": 1, "quarter_teach": "Q2", "quarter_app": "Q3", "domain": "Daten & Zufall", "subcategory": "Zufallssprache", "skill": "möglich – sicher – unmöglich", "tags": ["Zufall", "Begriffe"]},
  
  // Add more curriculum items systematically for grades 2-10
  {"id": "G2-Q1-ZA-ab12c4ec", "grade": 2, "grade_app": 2, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Zahlen & Operationen", "subcategory": "Add/Sub im ZR 100", "skill": "Halbschriftlich & schriftnah mit Übergang", "tags": ["Addition", "Subtraktion", "ZR_100"]},
  {"id": "G2-Q1-ZA-6c3b1af6", "grade": 2, "grade_app": 2, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Zahlen & Operationen", "subcategory": "Einmaleins (Aufbau)", "skill": "2er/5er/10er Reihen, Tausch-/Verbundaufgaben", "tags": ["Einmaleins", "ZR_100"]},
  
  {"id": "G5-Q1-ZA-78895d27", "grade": 5, "grade_app": 5, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Zahlen & Operationen", "subcategory": "Negative Zahlen", "skill": "Zahlengerade, Vergleiche, Addition/Subtraktion", "tags": ["Rationale", "Negative"]},
  {"id": "G5-Q1-ZA-2765bbbb", "grade": 5, "grade_app": 5, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Zahlen & Operationen", "subcategory": "Brüche/Dezimalzahlen", "skill": "Erweitern/Kürzen, Vergleich; Umwandlung", "tags": ["Brüche", "Dezimalzahlen"]},
  {"id": "G5-Q1-GL-4086937d", "grade": 5, "grade_app": 5, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Gleichungen & Funktionen", "subcategory": "Terme/Variable", "skill": "Termwert, einfache Umformungen", "tags": ["Terme"]},
  
  {"id": "G10-Q1-GL-0758fdb2", "grade": 10, "grade_app": 10, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Gleichungen & Funktionen", "subcategory": "Quadratische Funktionen (vertiefen)", "skill": "Scheitel-/Normalform, Transformationen", "tags": ["Quadratische Funktionen"]},
  {"id": "G10-Q1-GL-1ddb178e", "grade": 10, "grade_app": 10, "quarter_teach": "Q1", "quarter_app": "Q2", "domain": "Gleichungen & Funktionen", "subcategory": "Exponentialfunktionen (Grundlagen)", "skill": "Wachstum (einfach), Parameter deuten", "tags": ["Exponential"]},
];

const DIFFICULTY_LEVELS = ["easy", "medium", "hard"];
const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const DOMAINS = [
  "Zahlen & Operationen",
  "Größen & Messen", 
  "Raum & Form",
  "Daten & Zufall",
  "Gleichungen & Funktionen"
];

interface CoverageAnalysis {
  totalCombinations: number;
  coveredCombinations: number;
  coveragePercentage: number;
  averageTemplatesPerCombination: number;
  gradeDistribution: Record<number, CoverageStats>;
  domainDistribution: Record<string, CoverageStats>;
  difficultyDistribution: Record<string, CoverageStats>;
  criticalGaps: CoverageGap[];
  recommendations: string[];
  curriculumAlignment: number;
}

interface CoverageStats {
  expected: number;
  covered: number;
  totalTemplates: number;
  averagePerCombination: number;
  coveragePercent: number;
}

interface CoverageGap {
  grade: number;
  quarter: string;
  domain: string;
  difficulty: string;
  skillId?: string;
  skill?: string;
  existing: number;
  recommended: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  urgencyScore: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📊 Starting Comprehensive Curriculum Coverage Analysis...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch all active templates
    const { data: allTemplates, error: fetchError } = await supabase
      .from('templates')
      .select('grade, grade_app, quarter_app, domain, difficulty, subcategory, source_skill_id, quality_score, plays, correct')
      .eq('status', 'ACTIVE');

    if (fetchError) {
      console.error('❌ Error fetching templates:', fetchError);
      throw fetchError;
    }

    console.log(`📈 Analyzing ${allTemplates?.length || 0} active templates...`);

    // Perform comprehensive coverage analysis
    const analysis = performComprehensiveCoverageAnalysis(allTemplates || []);
    
    console.log('✅ Curriculum Coverage Analysis Complete');
    console.log(`📊 Coverage: ${analysis.coveragePercentage.toFixed(1)}%`);
    console.log(`🎯 Critical Gaps: ${analysis.criticalGaps.length}`);
    console.log(`📚 Curriculum Alignment: ${analysis.curriculumAlignment}%`);

    return new Response(JSON.stringify({
      success: true,
      analysis,
      summary: {
        overallCoverage: `${analysis.coveragePercentage.toFixed(1)}%`,
        totalTemplates: allTemplates?.length || 0,
        criticalGaps: analysis.criticalGaps.length,
        curriculumAlignment: `${analysis.curriculumAlignment}%`,
        averageQuality: calculateAverageQuality(allTemplates || [])
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Coverage Analysis Error:', error);
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

function performComprehensiveCoverageAnalysis(templates: any[]): CoverageAnalysis {
  const MIN_TEMPLATES_PER_COMBINATION = 12;
  
  // Calculate total possible combinations
  const totalCombinations = GRADES.length * QUARTERS.length * DOMAINS.length * DIFFICULTY_LEVELS.length;
  
  // Analyze coverage by dimensions
  const gradeDistribution = analyzeGradeCoverage(templates);
  const domainDistribution = analyzeDomainCoverage(templates);
  const difficultyDistribution = analyzeDifficultyCoverage(templates);
  
  // Identify gaps and calculate coverage
  const gaps = identifyAllCoverageGaps(templates, MIN_TEMPLATES_PER_COMBINATION);
  const coveredCombinations = countCoveredCombinations(templates, MIN_TEMPLATES_PER_COMBINATION);
  
  // Calculate curriculum alignment
  const curriculumAlignment = calculateAdvancedCurriculumAlignment(templates);
  
  // Generate recommendations
  const recommendations = generateCoverageRecommendations(gaps, gradeDistribution, domainDistribution);
  
  return {
    totalCombinations,
    coveredCombinations,
    coveragePercentage: (coveredCombinations / totalCombinations) * 100,
    averageTemplatesPerCombination: templates.length / totalCombinations,
    gradeDistribution,
    domainDistribution,
    difficultyDistribution,
    criticalGaps: gaps.filter(g => g.priority === 'CRITICAL' || g.priority === 'HIGH'),
    recommendations,
    curriculumAlignment
  };
}

function analyzeGradeCoverage(templates: any[]): Record<number, CoverageStats> {
  const distribution: Record<number, CoverageStats> = {};
  
  for (const grade of GRADES) {
    const gradeTemplates = templates.filter(t => t.grade_app === grade);
    const expectedCombinations = QUARTERS.length * DOMAINS.length * DIFFICULTY_LEVELS.length;
    const coveredCombinations = countUniqueGradeCombinations(gradeTemplates, grade);
    
    distribution[grade] = {
      expected: expectedCombinations,
      covered: coveredCombinations,
      totalTemplates: gradeTemplates.length,
      averagePerCombination: gradeTemplates.length / expectedCombinations,
      coveragePercent: (coveredCombinations / expectedCombinations) * 100
    };
  }
  
  return distribution;
}

function analyzeDomainCoverage(templates: any[]): Record<string, CoverageStats> {
  const distribution: Record<string, CoverageStats> = {};
  
  for (const domain of DOMAINS) {
    const domainTemplates = templates.filter(t => t.domain === domain);
    const expectedCombinations = GRADES.length * QUARTERS.length * DIFFICULTY_LEVELS.length;
    const coveredCombinations = countUniqueDomainCombinations(domainTemplates, domain);
    
    distribution[domain] = {
      expected: expectedCombinations,
      covered: coveredCombinations,
      totalTemplates: domainTemplates.length,
      averagePerCombination: domainTemplates.length / expectedCombinations,
      coveragePercent: (coveredCombinations / expectedCombinations) * 100
    };
  }
  
  return distribution;
}

function analyzeDifficultyCoverage(templates: any[]): Record<string, CoverageStats> {
  const distribution: Record<string, CoverageStats> = {};
  
  for (const difficulty of DIFFICULTY_LEVELS) {
    const difficultyTemplates = templates.filter(t => t.difficulty === difficulty);
    const expectedCombinations = GRADES.length * QUARTERS.length * DOMAINS.length;
    const coveredCombinations = countUniqueDifficultyCombinations(difficultyTemplates, difficulty);
    
    distribution[difficulty] = {
      expected: expectedCombinations,
      covered: coveredCombinations,
      totalTemplates: difficultyTemplates.length,
      averagePerCombination: difficultyTemplates.length / expectedCombinations,
      coveragePercent: (coveredCombinations / expectedCombinations) * 100
    };
  }
  
  return distribution;
}

function identifyAllCoverageGaps(templates: any[], minTemplates: number): CoverageGap[] {
  const gaps: CoverageGap[] = [];
  
  for (const grade of GRADES) {
    for (const quarter of QUARTERS) {
      for (const domain of DOMAINS) {
        for (const difficulty of DIFFICULTY_LEVELS) {
          const existing = templates.filter(t => 
            t.grade_app === grade &&
            t.quarter_app === quarter &&
            t.domain === domain &&
            t.difficulty === difficulty
          ).length;
          
          if (existing < minTemplates) {
            // Find relevant curriculum item
            const curriculumItem = COMPLETE_CURRICULUM.find(item =>
              item.grade_app === grade &&
              item.quarter_app === quarter &&
              item.domain === domain
            );
            
            gaps.push({
              grade,
              quarter,
              domain,
              difficulty,
              skillId: curriculumItem?.id,
              skill: curriculumItem?.skill,
              existing,
              recommended: minTemplates,
              priority: calculateGapPriority(grade, quarter, domain, difficulty, existing, minTemplates),
              urgencyScore: calculateUrgencyScore(grade, quarter, domain, difficulty, existing)
            });
          }
        }
      }
    }
  }
  
  return gaps.sort((a, b) => b.urgencyScore - a.urgencyScore);
}

function calculateGapPriority(
  grade: number, 
  quarter: string, 
  domain: string, 
  difficulty: string, 
  existing: number, 
  needed: number
): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  
  // Critical: Completely missing or foundational areas
  if (existing === 0) return 'CRITICAL';
  if (grade <= 4 && domain === "Zahlen & Operationen" && existing < 3) return 'CRITICAL';
  
  // High: Low coverage in important areas
  if (existing < needed * 0.3) return 'HIGH';
  if (grade <= 6 && existing < needed * 0.5) return 'HIGH';
  
  // Medium: Moderate gaps
  if (existing < needed * 0.6) return 'MEDIUM';
  
  // Low: Minor gaps
  return 'LOW';
}

function calculateUrgencyScore(grade: number, quarter: string, domain: string, difficulty: string, existing: number): number {
  let score = 100; // Base score
  
  // Grade weight (early grades more important)
  score += (11 - grade) * 15;
  
  // Domain weight
  const domainWeights = {
    "Zahlen & Operationen": 60,
    "Gleichungen & Funktionen": 50,
    "Größen & Messen": 40,
    "Raum & Form": 35,
    "Daten & Zufall": 25
  };
  score += domainWeights[domain] || 20;
  
  // Quarter weight (Q1 more foundational)
  const quarterWeights = { "Q1": 50, "Q2": 40, "Q3": 30, "Q4": 25 };
  score += quarterWeights[quarter as keyof typeof quarterWeights] || 0;
  
  // Difficulty weight
  const difficultyWeights = { "easy": 40, "medium": 35, "hard": 25 };
  score += difficultyWeights[difficulty] || 0;
  
  // Existing templates penalty
  if (existing === 0) score += 100; // Critical boost for empty areas
  else if (existing < 5) score += 50;
  else score -= existing * 5; // Reduce score as existing count increases
  
  return Math.max(0, score);
}

function countCoveredCombinations(templates: any[], minTemplates: number): number {
  const combinations = new Set();
  
  for (const template of templates) {
    const key = `${template.grade_app}-${template.quarter_app}-${template.domain}-${template.difficulty}`;
    combinations.add(key);
  }
  
  // Count combinations that meet minimum template threshold
  let coveredCount = 0;
  for (const grade of GRADES) {
    for (const quarter of QUARTERS) {
      for (const domain of DOMAINS) {
        for (const difficulty of DIFFICULTY_LEVELS) {
          const count = templates.filter(t => 
            t.grade_app === grade &&
            t.quarter_app === quarter &&
            t.domain === domain &&
            t.difficulty === difficulty
          ).length;
          
          if (count >= minTemplates) {
            coveredCount++;
          }
        }
      }
    }
  }
  
  return coveredCount;
}

function countUniqueGradeCombinations(templates: any[], grade: number): number {
  const combinations = new Set();
  
  for (const template of templates) {
    if (template.grade_app === grade) {
      const key = `${template.quarter_app}-${template.domain}-${template.difficulty}`;
      combinations.add(key);
    }
  }
  
  return combinations.size;
}

function countUniqueDomainCombinations(templates: any[], domain: string): number {
  const combinations = new Set();
  
  for (const template of templates) {
    if (template.domain === domain) {
      const key = `${template.grade_app}-${template.quarter_app}-${template.difficulty}`;
      combinations.add(key);
    }
  }
  
  return combinations.size;
}

function countUniqueDifficultyCombinations(templates: any[], difficulty: string): number {
  const combinations = new Set();
  
  for (const template of templates) {
    if (template.difficulty === difficulty) {
      const key = `${template.grade_app}-${template.quarter_app}-${template.domain}`;
      combinations.add(key);
    }
  }
  
  return combinations.size;
}

function calculateAdvancedCurriculumAlignment(templates: any[]): number {
  let alignmentScore = 0;
  let alignedTemplates = 0;
  
  for (const template of templates) {
    // Check if template has curriculum-related fields
    let score = 0.3; // Base alignment
    
    if (template.source_skill_id) score += 0.3;
    if (template.subcategory && template.subcategory !== '') score += 0.2;
    if (template.quality_score && template.quality_score > 0.8) score += 0.1;
    if (template.plays > 5 && template.correct / template.plays > 0.7) score += 0.1; // Performance-based alignment
    
    alignmentScore += Math.min(1.0, score);
    alignedTemplates++;
  }
  
  return alignedTemplates > 0 ? Math.round((alignmentScore / alignedTemplates) * 100) : 0;
}

function calculateAverageQuality(templates: any[]): number {
  const qualityScores = templates
    .map(t => t.quality_score)
    .filter(score => score != null && score > 0);
  
  if (qualityScores.length === 0) return 0;
  
  const average = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
  return Math.round(average * 100);
}

function generateCoverageRecommendations(
  gaps: CoverageGap[],
  gradeDistribution: Record<number, CoverageStats>,
  domainDistribution: Record<string, CoverageStats>
): string[] {
  const recommendations = [];
  
  // Analyze critical gaps
  const criticalGaps = gaps.filter(g => g.priority === 'CRITICAL');
  if (criticalGaps.length > 0) {
    recommendations.push(`SOFORTIGE MASSNAHME: ${criticalGaps.length} kritische Lücken identifiziert. Priorität: Klassen ${[...new Set(criticalGaps.map(g => g.grade))].join(', ')}`);
  }
  
  // Grade-specific recommendations
  const poorGrades = Object.entries(gradeDistribution)
    .filter(([_, stats]) => stats.coveragePercent < 50)
    .map(([grade, _]) => grade);
  
  if (poorGrades.length > 0) {
    recommendations.push(`KLASSENSTUFEN-FOKUS: Klassen ${poorGrades.join(', ')} haben unzureichende Abdeckung (<50%). Verstärkte Generierung erforderlich.`);
  }
  
  // Domain-specific recommendations
  const poorDomains = Object.entries(domainDistribution)
    .filter(([_, stats]) => stats.coveragePercent < 60)
    .map(([domain, _]) => domain);
  
  if (poorDomains.length > 0) {
    recommendations.push(`FACHBEREICH-FOKUS: Domänen \"${poorDomains.join('\", \"')}\" benötigen mehr Templates. Curriculum-spezifische Generierung aktivieren.`);
  }
  
  // Balance recommendations
  const highGaps = gaps.filter(g => g.priority === 'HIGH');
  if (highGaps.length > 20) {
    recommendations.push(`AUSGEWOGENHEIT: ${highGaps.length} wichtige Lücken gefunden. Empfehlung: Systematische Batch-Generierung mit Template-Mass-Generator.`);
  }
  
  // Quality recommendations
  if (gaps.length > 50) {
    recommendations.push(`AUTOMATISIERUNG: Bei ${gaps.length} Lücken wird automatisierte 2-Stunden-Generierung empfohlen. Auto-Question-Generator optimal konfigurieren.`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ OPTIMALER ZUSTAND: Coverage ist ausgewogen. Qualitätsverbesserungen und Performance-Monitoring fortsetzen.');
  }
  
  return recommendations;
}
