import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cleanup-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const results: Record<string, number | string> = {
      duplicates_removed: 0,
      reported_cleaned: 0,
      match_fixed: 0,
      match_removed: 0,
      old_rotated: 0,
      timestamp: new Date().toISOString(),
    };

    // ── 1. Remove duplicate questions ──
    // Find duplicates by normalized question_text + grade + subject
    const { data: allQuestions, error: fetchErr } = await supabase
      .from("ai_question_cache")
      .select("id, question_text, grade, subject, created_at, times_served")
      .order("created_at", { ascending: true });

    if (fetchErr) throw fetchErr;

    if (allQuestions && allQuestions.length > 0) {
      const seen = new Map<string, string>(); // normalized key -> best id
      const duplicateIds: string[] = [];

      for (const q of allQuestions) {
        const key = normalizeCacheKey(q.question_text, q.grade, q.subject);
        const existing = seen.get(key);
        if (existing) {
          // Keep the one served less (fresher), remove the other
          duplicateIds.push(q.id);
        } else {
          seen.set(key, q.id);
        }
      }

      if (duplicateIds.length > 0) {
        // Delete in batches of 100
        for (let i = 0; i < duplicateIds.length; i += 100) {
          const batch = duplicateIds.slice(i, i + 100);
          const { error: delErr } = await supabase
            .from("ai_question_cache")
            .delete()
            .in("id", batch);
          if (delErr) console.error("Delete batch error:", delErr);
        }
        results.duplicates_removed = duplicateIds.length;
      }
    }

    // ── 2. Remove questions that were reported as incorrect ──
    // Find feedback with type 'wrong_answer' or 'inappropriate' and remove matching cache entries
    const { data: reportedFeedback, error: fbErr } = await supabase
      .from("question_feedback")
      .select("question_content, grade, category")
      .in("feedback_type", ["wrong_answer", "inappropriate", "wrong_question_type"])
      .order("created_at", { ascending: false })
      .limit(500);

    if (fbErr) {
      console.error("Feedback fetch error:", fbErr);
    } else if (reportedFeedback && reportedFeedback.length > 0) {
      for (const fb of reportedFeedback) {
        const { data: matches, error: matchErr } = await supabase
          .from("ai_question_cache")
          .select("id")
          .eq("subject", fb.category)
          .eq("grade", fb.grade)
          .ilike("question_text", `%${fb.question_content.substring(0, 80)}%`)
          .limit(5);

        if (matchErr || !matches || matches.length === 0) continue;

        const ids = matches.map((m: { id: string }) => m.id);
        const { error: delErr } = await supabase
          .from("ai_question_cache")
          .delete()
          .in("id", ids);

        if (!delErr) {
          results.reported_cleaned += ids.length;
        }
      }
    }

    // ── 3. Fix or remove broken MATCH questions ──
    // MATCH questions need options with leftItems/rightItems derived from correct_answer
    let matchFixed = 0;
    let matchRemoved = 0;
    const { data: matchQuestions, error: matchErr } = await supabase
      .from("ai_question_cache")
      .select("id, correct_answer, options, question_type")
      .eq("question_type", "MATCH")
      .limit(500);

    if (!matchErr && matchQuestions) {
      for (const q of matchQuestions) {
        const ca = q.correct_answer;
        const opts = q.options;
        // Check if options already has leftItems/rightItems
        if (opts && typeof opts === 'object' && (opts as any).leftItems && (opts as any).rightItems) {
          continue; // Already properly structured
        }
        // Try to fix from correct_answer
        if (ca && typeof ca === 'object' && !Array.isArray(ca) && Object.keys(ca as object).length >= 3) {
          const leftItems = Object.keys(ca as object);
          const rightItems = Object.values(ca as object) as string[];
          const shuffledRight = [...rightItems].sort(() => Math.random() - 0.5);
          const { error: updateErr } = await supabase
            .from("ai_question_cache")
            .update({ options: { leftItems, rightItems: shuffledRight } })
            .eq("id", q.id);
          if (!updateErr) matchFixed++;
        } else {
          // Broken MATCH question — remove it
          const { error: delErr } = await supabase
            .from("ai_question_cache")
            .delete()
            .eq("id", q.id);
          if (!delErr) matchRemoved++;
        }
      }
    }
    results.match_fixed = matchFixed;
    results.match_removed = matchRemoved;

    // ── 4. Rotate old, heavily-served questions ──
    // Remove questions served 10+ times that are older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: oldQuestions, error: oldErr } = await supabase
      .from("ai_question_cache")
      .select("id")
      .gte("times_served", 10)
      .lt("created_at", thirtyDaysAgo)
      .limit(200);

    if (oldErr) {
      console.error("Old questions fetch error:", oldErr);
    } else if (oldQuestions && oldQuestions.length > 0) {
      const oldIds = oldQuestions.map((q: { id: string }) => q.id);
      
      for (let i = 0; i < oldIds.length; i += 100) {
        const batch = oldIds.slice(i, i + 100);
        const { error: delErr } = await supabase
          .from("ai_question_cache")
          .delete()
          .in("id", batch);
        if (delErr) console.error("Old rotation delete error:", delErr);
      }
      results.old_rotated = oldIds.length;
    }

    console.log("🧹 Cache cleanup completed:", JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Cache cleanup failed:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Normalize a cache key for deduplication.
 * For math: sort operands so 3+4 == 4+3
 */
function normalizeCacheKey(text: string, grade: number, subject: string): string {
  let normalized = text.toLowerCase().trim().replace(/\s+/g, " ");

  if (subject === "math") {
    // Sort operands in simple math expressions
    normalized = normalized.replace(
      /(\d+)\s*([+×*])\s*(\d+)/g,
      (_match, a, op, b) => {
        const nums = [parseInt(a), parseInt(b)].sort((x, y) => x - y);
        return `${nums[0]}${op}${nums[1]}`;
      }
    );
  }

  return `${grade}|${subject}|${normalized}`;
}
