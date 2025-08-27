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
  
  // Quartalslogik: Inhalte aus Q1 werden in Q2 abgefragt, etc.
  const availableQuarters = getAvailableQuarters(quarter);
  
  console.log(`🏦 Fetching templates for Grade ${grade}, current quarter: ${quarter}, available quarters:`, availableQuarters);
  
  const { data, error } = await supabase
    .from("template_scores")
    .select("*")
    .eq("status","ACTIVE")
    .eq("grade_app", grade)
    .in("quarter_app", availableQuarters)
    .order("qscore",{ ascending:false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Quartalslogik: Q1 Inhalte werden in Q2+ abgefragt
function getAvailableQuarters(currentQuarter: Quarter): Quarter[] {
  const quarters: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];
  const currentIndex = qIndex(currentQuarter);
  return quarters.slice(0, currentIndex + 1); // Q1 ist immer verfügbar, plus alle vorherigen
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