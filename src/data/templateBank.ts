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
  // 🎲 FIXED: Increase limit and add randomization for better variety
  // Default to 800 templates (80% of ~1000 available for grade 1) instead of 200
  const { grade, quarter = getCurrentSchoolQuarter(), limit = 800 } = params;
  
  console.log(`🎯 Fetching from TEMPLATES table for Grade ${grade} ${quarter} (limit: ${limit})`);
  
  // ✅ PHASE 1: Use high-quality templates table
  let query = supabase
    .from("templates")
    .select("*")
    .eq("status", "ACTIVE")
    .eq("grade", grade)
  
  // ✅ STRICT: Exclude ALL visual/drawing questions from student_prompt
  query = query
    .not("student_prompt", "ilike", "%zeichn%")
    .not("student_prompt", "ilike", "%skizz%")
    .not("student_prompt", "ilike", "%konstruier%")
    .not("student_prompt", "ilike", "%draw%")
    .not("student_prompt", "ilike", "%paint%")
    .not("student_prompt", "ilike", "%male %");

  // Apply curriculum-based filtering for lower grades
  if (grade < 5) {
    console.log(`📚 Applying curriculum filters for Grade ${grade}`);
    query = query
      .not("student_prompt", "ilike", "%prozent%")
      .not("student_prompt", "ilike", "%variable%")
      .not("student_prompt", "ilike", "%gleichung%")
      .not("student_prompt", "ilike", "%term%");
  }

  // FIRST-GRADE SPECIFIC: Simplified filtering (redundant logic moved to ConsolidatedFirstGradeValidator)
  if (grade === 1) {
    console.log(`🎯 Applying FIRST-GRADE specific filters`);
    query = query
      // Restrict to simple question types only
      .in("question_type", ["MULTIPLE_CHOICE", "FREETEXT", "TEXT"])
      // Block problematic malformed data (archival cleanup handled by migration)
      .neq("status", "ARCHIVED");
  }

  // 🎲 FIXED: Fetch large pool first, then randomize client-side for better variety
  // Remove .order() to get results in random DB order, then shuffle client-side
  let { data, error } = await query.limit(limit * 2); // Fetch 2x limit for better randomization
  
  if (error) {
    console.error('❌ Templates fetch error:', error);
    return [];
  }
  
  // 🎲 FIXED: Shuffle the entire result set to ensure random selection
  if (data && data.length > 0) {
    // Fisher-Yates shuffle for true randomization
    for (let i = data.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [data[i], data[j]] = [data[j], data[i]];
    }
    // Take only the requested limit after shuffling
    data = data.slice(0, limit);
    console.log(`🎲 Shuffled and selected ${data.length} random templates from pool`);
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
        .limit(limit);
        
      if (fallbackData && fallbackData.length > 0) {
        // Shuffle fallback data too
        for (let i = fallbackData.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [fallbackData[i], fallbackData[j]] = [fallbackData[j], fallbackData[i]];
        }
        console.log(`✅ Using ${fallbackData.length} shuffled templates from Grade ${fallbackGrade} fallback`);
        data = fallbackData;
        break;
      }
    }
  }
  
  console.log(`🎯 Final: ${data?.length || 0} randomized templates from TEMPLATES table`);
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
  count: number; minDistinctDomains: number; difficulty?: "easy"|"medium"|"hard";
}) {
  const { count, minDistinctDomains, difficulty } = opts;
  const poolRaw = difficulty ? all.filter(t => t.difficulty === difficulty) : all.slice();
  
  // ENHANCED: De-duplicate by multiple criteria to prevent repetitions
  const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const seenPrompts = new Set<string>();
  const seenIds = new Set<string>();
  
  const pool = poolRaw.filter(t => {
    // Skip duplicate IDs
    const id = String(t.id || '');
    if (id && seenIds.has(id)) return false;
    if (id) seenIds.add(id);
    
    // Skip duplicate normalized prompts
    const key = normalize(t.student_prompt);
    if (!key) return true;
    if (seenPrompts.has(key)) {
      console.log(`🔄 Skipping duplicate prompt: ${key.substring(0, 50)}...`);
      return false;
    }
    seenPrompts.add(key);
    return true;
  });
  
  console.log(`📊 Pre-deduplication: ${poolRaw.length} → Post-deduplication: ${pool.length} templates`);
  
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
  
  console.log(`🎯 FIXED: Picking ${count} templates from ${domains.length} domains (min ${minDistinctDomains}), pool size: ${pool.length}`);
  
  // FIXED: More flexible domain selection - don't enforce strict domain minimums that limit variety
  if (minDistinctDomains > 0 && domains.length > 0) {
    // Select at least one from each domain if possible, but don't limit total selection
    for (const d of domains.slice(0, Math.min(domains.length, minDistinctDomains))) {
      const arr = byDomain.get(d)!;
      if (arr.length && out.length < count) {
        // Pick multiple from same domain if count allows
        const domainPicks = Math.min(Math.ceil(count / domains.length), arr.length);
        for (let i = 0; i < domainPicks && out.length < count; i++) {
          const selected = arr[Math.floor(Math.random() * arr.length)];
          if (!out.some(o => o.id === selected.id)) {
            out.push(selected);
            console.log(`✅ Domain ${d}: Selected template ${selected.id || 'no-id'} (${i+1}/${domainPicks})`);
          }
        }
      }
    }
  }
  
  // Fill remaining slots with any available templates (prioritize variety)
  const remaining = pool.filter(t => !out.some(o => o.id === t.id));
  const shuffled = remaining.sort(() => Math.random() - 0.5);
  
  while (out.length < count && shuffled.length) {
    out.push(shuffled.pop()!);
  }
  
  // Final stats
  const finalDomains = [...new Set(out.map(t => t.domain))];
  console.log(`📊 FIXED Final selection: ${out.length} templates across ${finalDomains.length} domains:`, finalDomains);
  console.log(`📊 Template IDs selected:`, out.map(t => t.id).slice(0, 10));
  
  return out.slice(0, count);
}