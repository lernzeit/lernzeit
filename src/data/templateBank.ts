import { supabase } from "@/integrations/supabase/client";

export type Quarter = "Q1"|"Q2"|"Q3"|"Q4";
function qIndex(q: Quarter){ return ["Q1","Q2","Q3","Q4"].indexOf(q); }

export async function fetchActiveTemplates(params: {
  grade: number; quarter: Quarter; limit?: number;
}) {
  const { grade, quarter, limit = 200 } = params;
  const { data, error } = await supabase
    .from("template_scores")
    .select("*")
    .eq("status","ACTIVE")
    .lte("grade_app", grade)
    .lte("quarter_app", quarter)
    .order("qscore",{ ascending:false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export function pickSessionTemplates(all: any[], opts: {
  count: number; minDistinctDomains: number; difficulty?: "AFB I"|"AFB II"|"AFB III";
}) {
  const { count, minDistinctDomains, difficulty } = opts;
  const pool = difficulty ? all.filter(t => t.difficulty === difficulty) : all.slice();
  const byDomain = new Map<string, any[]>();
  for (const t of pool){ if (!byDomain.has(t.domain)) byDomain.set(t.domain, []); byDomain.get(t.domain)!.push(t); }
  const domains = Array.from(byDomain.keys());
  const out: any[] = [];
  // 1) je Domäne 1
  for (const d of domains){
    const arr = byDomain.get(d)!;
    if (arr.length) out.push(arr[Math.floor(Math.random()*arr.length)]);
    if (out.length >= count) return out.slice(0,count);
  }
  // 2) auffüllen
  const flat = pool.slice().sort(()=>Math.random()-0.5);
  while (out.length < count && flat.length) out.push(flat.pop()!);
  // 3) min Domänen erzwingen (notfalls random swap)
  return out.slice(0,count);
}