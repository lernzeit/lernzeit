import { supabase } from "@/integrations/supabase/client";
import { loadKnowledge, preselectCards } from "@/knowledge/knowledge";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/prompt/knowledgePromptFactory";
// import { generateWithLLM } from "@/llm/provider"; // später aktivieren

const TARGET = 50; // Ziel pro (grade, domain)

async function countActiveByGradeDomain(grade: number, domain: string) {
  const { data, error } = await supabase
    .from("templates").select("id", { count:"exact", head:true })
    .eq("status","ACTIVE").eq("grade",grade).eq("domain",domain);
  if (error) throw error;
  return data; // supabase-js v2: count via { count: "exact", head: true } -> use additionalCount if available
}

export async function pruneOldBad() {
  const { data, error } = await supabase
    .from("template_scores")
    .select("id, average_rating, success_rate, plays")
    .gte("plays", 30);
  if (error) throw error;
  const toArchive = (data ?? []).filter(t =>
    (t.plays ?? 0) >= 30 && ((t.average_rating ?? 0) < 2.8 || (t.success_rate ?? 0) < 0.50)
  ).map(t => t.id);
  if (toArchive.length) {
    await supabase.from("templates").update({ status:"ARCHIVED" }).in("id", toArchive);
  }
  return { archived: toArchive.length };
}

export async function topUpBank(grade: number, quarter: "Q1"|"Q2"|"Q3"|"Q4", generatePerDomain=10) {
  const { cards, blueprints } = await loadKnowledge();
  const domains = ["Zahlen & Operationen","Größen & Messen","Raum & Form","Gleichungen & Funktionen","Daten & Zufall"];

  const created: string[] = [];
  for (const domain of domains) {
    // Count active
    // NOTE: supabase-js count handling may differ; if needed replace by select+length
    const { data: active } = await supabase
      .from("templates").select("id", { count:"exact" })
      .eq("status","ACTIVE").eq("grade",grade).eq("domain",domain);
    const activeCount = active?.length ?? 0;
    if (activeCount >= TARGET) continue;

    // Knowledge pool
    const pool = preselectCards(cards as any, { grade, quarter, wantDomains:[domain] });
    if (!pool.length) continue;

    const bp = (blueprints as any[]).find(b => b.domain === domain) ?? (blueprints as any[])[0];
    const user = buildUserPrompt({ blueprint: bp, difficulty:"AFB I", n: generatePerDomain, knowledge: pool.slice(0,5) });

    // const json = await generateWithLLM("gemini", [{role:"system",content:SYSTEM_PROMPT},{role:"user",content:user}]);
    // const variants = JSON.parse(json);
    const variants: any[] = []; // solange der LLM-Call nicht aktiv ist

    // Insert (wenn LLM aktiv: mappe fields 1:1 auf templates)
    if (variants.length) {
      const rows = variants.map(v => ({
        status:"ACTIVE",
        grade: grade,
        grade_app: v.grade_suggestion ?? grade,
        quarter_app: v.quarter_app,
        domain, subcategory: v.subcategory,
        difficulty: v.difficulty, question_type: v.question_type,
        student_prompt: v.student_prompt, variables: v.variables,
        solution: v.solution, unit: v.unit, distractors: v.distractors,
        explanation_teacher: v.explanation_teacher, source_skill_id: v.source_skill_id,
        tags: v.tags, seed: v.seed, plays:0, correct:0, rating_sum:0, rating_count:0
      }));
      const { error } = await supabase.from("templates").insert(rows);
      if (error) console.error(error); else created.push(`${domain}:${rows.length}`);
    }
  }
  return { created };
}