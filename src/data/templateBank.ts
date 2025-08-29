import { supabase } from "@/integrations/supabase/client";

export type Quarter = "Q1"|"Q2"|"Q3"|"Q4";

// Get current school quarter based on month
export function getCurrentSchoolQuarter(): Quarter {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 9 && month <= 11) return "Q1"; // Sep-Nov
  if (month >= 12 || month <= 2) return "Q2"; // Dec-Feb  
  if (month >= 3 && month <= 5) return "Q3"; // Mar-May
  return "Q4"; // Jun-Aug
}

function qIndex(q: Quarter){ return ["Q1","Q2","Q3","Q4"].indexOf(q); }

export async function fetchActiveTemplates(params: {
  grade: number; quarter?: Quarter; limit?: number;
}) {
  const { grade, quarter = getCurrentSchoolQuarter(), limit = 200 } = params;
  
  console.log(`🔧 PHASE 2 FIX: Fetching from generated_templates for Grade ${grade} ${quarter}`);
  
  // 🔧 USE REACTIVATED generated_templates TABLE
  let query = supabase
    .from("generated_templates")
    .select("*")
    .eq("is_active", true)
    .eq("grade", grade);
  
  // Filter by category if math-specific
  query = query.eq("category", "math");
  
  // Exclude visual/drawing questions
  query = query
    .not("content", "ilike", "%zeichn%")
    .not("content", "ilike", "%mal %") 
    .not("content", "ilike", "%konstruier%")
    .not("content", "ilike", "%entwirf%")
    .not("content", "ilike", "%bild%")
    .not("content", "ilike", "%ordne%")
    .not("content", "ilike", "%verbind%");

  // Apply curriculum-based filtering
  if (grade < 5) {
    console.log(`🚫 Excluding advanced math for Grade ${grade}`);
    query = query
      .not("content", "ilike", "%prozent%")
      .not("content", "ilike", "%variable%")
      .not("content", "ilike", "%gleichung%")
      .not("content", "ilike", "%term%");
  }

  let { data, error } = await query
    .order("quality_score", { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('❌ Generated templates fetch error:', error);
    return [];
  }
  
  if (!data || data.length === 0) {
    console.log(`⚠️ No generated templates found for Grade ${grade}, trying fallback`);
    // Try adjacent grades as fallback
    const fallbackGrades = [grade - 1, grade + 1].filter(g => g >= 1 && g <= 10);
    
    for (const fallbackGrade of fallbackGrades) {
      const { data: fallbackData } = await supabase
        .from("generated_templates")
        .select("*")
        .eq("is_active", true)
        .eq("grade", fallbackGrade)
        .eq("category", "math")
        .order("quality_score", { ascending: false })
        .limit(limit);
        
      if (fallbackData && fallbackData.length > 0) {
        console.log(`✅ Using ${fallbackData.length} templates from Grade ${fallbackGrade} fallback`);
        data = fallbackData;
        break;
      }
    }
  }
  
  console.log(`📚 Found ${data?.length || 0} active generated_templates`);
  return data ? data.map(mapGeneratedTemplateToTemplate) : [];
}

// 🔧 PHASE 2 FIX: Map from generated_templates to Template interface
function mapGeneratedTemplateToTemplate(template: any): any {
  return {
    id: template.id,
    grade: template.grade,
    domain: template.category || 'math',
    subcategory: template.question_type || 'basic', 
    difficulty: 'medium', // Default difficulty
    question_type: template.question_type || 'multiple-choice',
    student_prompt: template.content || 'Keine Aufgabe definiert',
    solution: { value: 1 }, // Will be calculated dynamically
    distractors: [],
    variables: {},
    explanation_teacher: '',
    tags: [],
    quarter_app: 'Q1', // Default quarter
    qscore: template.quality_score || 0.5, // Map quality_score to qscore for compatibility
    status: template.is_active ? 'ACTIVE' : 'INACTIVE'
  };
}

export function pickSessionTemplates(all: any[], opts: {
  count: number; minDistinctDomains: number; difficulty?: "AFB I"|"AFB II"|"AFB III";
}) {
  const { count, minDistinctDomains, difficulty } = opts;
  const pool = difficulty ? all.filter(t => t.difficulty === difficulty) : all.slice();
  
  if (pool.length === 0) {
    console.warn("🚨 No templates available for selection");
    return [];
  }
  
  const byDomain = new Map<string, any[]>();
  for (const t of pool) { 
    if (!byDomain.has(t.domain)) byDomain.set(t.domain, []); 
    byDomain.get(t.domain)!.push(t); 
  }
  
  const domains = Array.from(byDomain.keys());
  const out: any[] = [];
  
  console.log(`🎯 Picking ${count} templates from ${domains.length} domains (min ${minDistinctDomains}):`, domains);
  
  // 1) Mindestens eine Frage pro verfügbarer Domäne (bis minDistinctDomains erreicht)
  for (const d of domains.slice(0, Math.min(domains.length, minDistinctDomains))) {
    const arr = byDomain.get(d)!;
    if (arr.length) {
      const selected = arr[Math.floor(Math.random() * arr.length)];
      out.push(selected);
      console.log(`✅ Domain ${d}: Selected template ${selected.id || 'no-id'}`);
    }
    if (out.length >= count) break;
  }
  
  // 2) Restliche Plätze auffüllen (bevorzugt aus bereits verwendeten Domänen)
  const remaining = pool.filter(t => !out.some(o => o.id === t.id));
  const shuffled = remaining.sort(() => Math.random() - 0.5);
  
  while (out.length < count && shuffled.length) {
    out.push(shuffled.pop()!);
  }
  
  // 3) Domänenverteilung prüfen
  const finalDomains = [...new Set(out.map(t => t.domain))];
  console.log(`📊 Final selection: ${out.length} templates across ${finalDomains.length} domains:`, finalDomains);
  
  if (finalDomains.length < minDistinctDomains && domains.length >= minDistinctDomains) {
    console.warn(`⚠️ Could not achieve minimum domain diversity: ${finalDomains.length}/${minDistinctDomains}`);
  }
  
  return out.slice(0, count);
}