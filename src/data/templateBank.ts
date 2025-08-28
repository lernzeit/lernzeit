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
  
  // Quartalslogik: Je nach Quartal, unterschiedliche Ziel-Klassenstufe und -Quartal
  const availableQuarters = getAvailableQuarters(quarter);
  const targetGrade = quarter === "Q1" ? grade - 1 : grade; // Q1 holt Inhalte aus vorheriger Klasse
  
  console.log(`🏦 Fetching templates for User Grade ${grade} ${quarter}, targeting Grade ${targetGrade} quarters:`, availableQuarters);
  
  // Versuche zuerst die berechnete Ziel-Klassenstufe und -Quartal
  let query = supabase
    .from("template_scores")
    .select("*")
    .eq("status","ACTIVE")
    .eq("grade_app", targetGrade)
    .in("quarter_app", availableQuarters)
    // Filtere visuelle/Zeichen-Fragen aus
    .not("student_prompt", "ilike", "%zeichn%")
    .not("student_prompt", "ilike", "%mal %")
    .not("student_prompt", "ilike", "%konstruier%")
    .not("student_prompt", "ilike", "%entwirf%")
    .not("student_prompt", "ilike", "%bild%")
    .not("student_prompt", "ilike", "%ordne%")
    .not("student_prompt", "ilike", "%verbind%");

  // ✅ KRITISCH: Prozentrechnung erst ab Klasse 5 Q3!
  // Schüler in Klasse 5 Q1 bekommen Klasse 4 Q4 Inhalte → keine Prozente
  if (targetGrade < 5 || (targetGrade === 5 && !availableQuarters.includes("Q3") && !availableQuarters.includes("Q4"))) {
    console.log(`🚫 Excluding percentage questions for Grade ${targetGrade} quarters ${availableQuarters.join(',')}`);
    query = query
      .not("student_prompt", "ilike", "%prozent%")
      .not("student_prompt", "ilike", "%von 15 schülern%")
      .not("student_prompt", "ilike", "%von 100 kindern%")
      .not("student_prompt", "ilike", "%von 40 kindern%")
      .not("student_prompt", "ilike", "%das sind __ %")
      .not("student_prompt", "ilike", "%wie viel prozent%");
  }

  let { data, error } = await query
    .order("qscore",{ ascending:false })
    .limit(limit);
  
  if (error) throw error;
  
  // Fallback-Strategie: Wenn keine Templates gefunden, suche systematisch
  if (!data || data.length === 0) {
    console.log(`⚠️ No templates found for target grade ${targetGrade}, trying systematic fallback`);
    
    // Für Q1: Versuche erst vorherige Klasse Q4, dann Q3, dann Q2, dann Q1
    // Für andere Quartale: Versuche erst kleinere Klassenstufen
    const fallbackSearch = async (searchGrade: number, searchQuarters: Quarter[]) => {
      let fallbackQuery = supabase
        .from("template_scores")
        .select("*")
        .eq("status","ACTIVE")
        .eq("grade_app", searchGrade)
        .in("quarter_app", searchQuarters)
        // Filtere visuelle/Zeichen-Fragen aus
        .not("student_prompt", "ilike", "%zeichn%")
        .not("student_prompt", "ilike", "%mal %")
        .not("student_prompt", "ilike", "%konstruier%")
        .not("student_prompt", "ilike", "%entwirf%")
        .not("student_prompt", "ilike", "%bild%")
        .not("student_prompt", "ilike", "%ordne%")
        .not("student_prompt", "ilike", "%verbind%");

      // ✅ Auch bei Fallback: Prozentrechnung ausschließen wenn zu früh
      if (searchGrade < 5 || (searchGrade === 5 && !searchQuarters.includes("Q3") && !searchQuarters.includes("Q4"))) {
        fallbackQuery = fallbackQuery
          .not("student_prompt", "ilike", "%prozent%")
          .not("student_prompt", "ilike", "%von 15 schülern%")
          .not("student_prompt", "ilike", "%von 100 kindern%")
          .not("student_prompt", "ilike", "%von 40 kindern%")
          .not("student_prompt", "ilike", "%das sind __ %")
          .not("student_prompt", "ilike", "%wie viel prozent%");
      }

      const { data: fallbackData, error: fallbackError } = await fallbackQuery
        .order("qscore", { ascending: false })
        .limit(limit);
      
      if (fallbackError) throw fallbackError;
      return fallbackData;
    };

    // Erweiterte Fallback-Logik für alle Quartale
    const allQuarters: Quarter[] = ["Q4", "Q3", "Q2", "Q1"];
    
    for (let fallbackGrade = targetGrade; fallbackGrade >= 1; fallbackGrade--) {
      for (const searchQuarter of allQuarters) {
        console.log(`🔍 Trying fallback: Grade ${fallbackGrade}, Quarter ${searchQuarter}`);
        
        const fallbackData = await fallbackSearch(fallbackGrade, [searchQuarter]);
        
        if (fallbackData && fallbackData.length > 0) {
          console.log(`✅ Using ${fallbackData.length} templates from Grade ${fallbackGrade} ${searchQuarter} for User Grade ${grade} ${quarter}`);
          data = fallbackData;
          return data;
        }
      }
    }
  }
  
  return data ?? [];
}

// Quartalslogik: Inhalte aus der vorherigen Klasse/Quartal werden abgefragt
// Z.B. Klasse 5 Q1 fragt Klasse 4 Q4 Inhalte ab
function getAvailableQuarters(currentQuarter: Quarter): Quarter[] {
  // Für Q1: Hole Q4 Inhalte der vorherigen Klasse
  if (currentQuarter === "Q1") return ["Q4"];
  // Für Q2: Hole Q1 Inhalte der aktuellen Klasse
  if (currentQuarter === "Q2") return ["Q1"]; 
  // Für Q3: Hole Q2 Inhalte der aktuellen Klasse
  if (currentQuarter === "Q3") return ["Q2"];
  // Für Q4: Hole Q3 Inhalte der aktuellen Klasse
  return ["Q3"];
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