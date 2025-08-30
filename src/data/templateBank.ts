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
  
  console.log(`🎯 PHASE 1: Fetching from high-quality TEMPLATES table for Grade ${grade} ${quarter}`);
  
  // ✅ PHASE 1: Use high-quality templates table (659 premium templates)
  let query = supabase
    .from("templates")
    .select("*")
    .eq("status", "ACTIVE")
    .eq("grade", grade)
  
  // ✅ STRICT: Exclude ALL visual/drawing questions from student_prompt
  query = query
    .not("student_prompt", "ilike", "%zeichn%")
    .not("student_prompt", "ilike", "%zeich%")
    .not("student_prompt", "ilike", "%mal %") 
    .not("student_prompt", "ilike", "%konstruier%")
    .not("student_prompt", "ilike", "%entwirf%")
    .not("student_prompt", "ilike", "%bild%")
    .not("student_prompt", "ilike", "%ordne%")
    .not("student_prompt", "ilike", "%verbind%")
    .not("student_prompt", "ilike", "%diagramm%")
    .not("student_prompt", "ilike", "%grafik%")
    .not("student_prompt", "ilike", "%skizz%")
    .not("student_prompt", "ilike", "%netz%")
    .not("student_prompt", "ilike", "%draw%")
    .not("student_prompt", "ilike", "%paint%");

  // Apply curriculum-based filtering for lower grades
  if (grade < 5) {
    console.log(`📚 Applying curriculum filters for Grade ${grade}`);
    query = query
      .not("student_prompt", "ilike", "%prozent%")
      .not("student_prompt", "ilike", "%variable%")
      .not("student_prompt", "ilike", "%gleichung%")
      .not("student_prompt", "ilike", "%term%");
  }

  let { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('❌ Templates fetch error:', error);
    return [];
  }
  
  if (!data || data.length === 0) {
    console.log(`⚠️ No templates for Grade ${grade}, trying adjacent grades`);
    // Try adjacent grades as fallback
    const fallbackGrades = [grade - 1, grade + 1].filter(g => g >= 1 && g <= 10);
    
    for (const fallbackGrade of fallbackGrades) {
      const { data: fallbackData } = await supabase
        .from("templates")
        .select("*")
        .eq("status", "ACTIVE")
        .eq("grade", fallbackGrade)
        .order("created_at", { ascending: false })
        .limit(limit);
        
      if (fallbackData && fallbackData.length > 0) {
        console.log(`✅ Using ${fallbackData.length} templates from Grade ${fallbackGrade} fallback`);
        data = fallbackData;
        break;
      }
    }
  }
  
  console.log(`🎯 Found ${data?.length || 0} high-quality templates from TEMPLATES table`);
  return data ? data.map(mapTemplateToInterface) : [];
}

// ✅ PHASE 1: Direct mapping from templates table (no conversion needed)
function mapTemplateToInterface(template: any): any {
  return {
    id: template.id,
    grade: template.grade,
    domain: template.domain,
    subcategory: template.subcategory,
    difficulty: template.difficulty,
    question_type: template.question_type,
    student_prompt: template.student_prompt,
    solution: template.solution || { value: 1 },
    distractors: template.distractors || [],
    variables: template.variables || {},
    explanation: template.explanation || '',
    tags: template.tags || [],
    quarter_app: template.quarter_app,
    qscore: 0.8, // High quality score for premium templates
    status: template.status
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