import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-analyze-secret',
};

const MAX_NEW_RULES_PER_RUN = 5;
const MAX_ACTIVE_RULES = 30;
const MIN_CLUSTER_SIZE = 3;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Auth: admin JWT OR service_role key in Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Check if it's the service role key (for automated/cron invocations)
    if (token !== serviceRoleKey) {
      // Verify as user JWT
      const anonClient = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await anonClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: isAdmin } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Nur Admins' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 1. Load unanalyzed feedback
    const { data: feedbacks, error: fbError } = await supabase
      .from('question_feedback')
      .select('*')
      .is('analyzed_at', null)
      .order('created_at', { ascending: true })
      .limit(200);

    if (fbError) throw fbError;
    if (!feedbacks || feedbacks.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Keine unanalysierten Feedbacks vorhanden',
        newRules: 0,
        analyzedFeedbacks: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📊 Found ${feedbacks.length} unanalyzed feedbacks`);

    // 2. Cluster by feedback_type + category (content quality rules)
    const clusters = new Map<string, typeof feedbacks>();
    // 2b. Also cluster for variant/question-type issues
    const variantIssues: typeof feedbacks = [];

    for (const fb of feedbacks) {
      // Skip too_hard/too_easy from clustering — these are user-specific
      // Skip good_question — handled separately for positive reinforcement rules
      if (fb.feedback_type === 'too_hard' || fb.feedback_type === 'too_easy' || fb.feedback_type === 'good_question') {
        continue;
      }

      const key = `${fb.feedback_type}__${fb.category}`;
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key)!.push(fb);

      // Detect variant mismatch feedback (from details mentioning Zuordnung, Reihenfolge, etc.)
      if (fb.feedback_details) {
        const detailsLower = typeof fb.feedback_details === 'string' 
          ? fb.feedback_details.toLowerCase() 
          : JSON.stringify(fb.feedback_details).toLowerCase();
        if (detailsLower.includes('zuordnung') || 
            detailsLower.includes('reihenfolge') || 
            detailsLower.includes('fragetyp') ||
            detailsLower.includes('sortier') ||
            detailsLower.includes('multiple choice') ||
            detailsLower.includes('falscher typ')) {
          variantIssues.push(fb);
        }
      }
    }

    // 3. Filter clusters with >= MIN_CLUSTER_SIZE
    const significantClusters = Array.from(clusters.entries())
      .filter(([, items]) => items.length >= MIN_CLUSTER_SIZE)
      .slice(0, MAX_NEW_RULES_PER_RUN);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY nicht konfiguriert' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load existing rules for deduplication & merging
    const { data: existingRules } = await supabase
      .from('prompt_rules')
      .select('id, rule_text, subject, grade_min, grade_max, source_feedback_count, source_feedback_ids')
      .eq('is_active', true);

    const activeRules = (existingRules || []) as Array<{
      id: string; rule_text: string; subject: string | null;
      grade_min: number | null; grade_max: number | null;
      source_feedback_count: number; source_feedback_ids: string[];
    }>;
    const existingTexts = activeRules.map(r => r.rule_text.toLowerCase());
    const activeRuleCount = existingTexts.length;

    let newRulesCreated = 0;

    // 4. For each significant cluster, generate a content quality rule
    for (const [clusterKey, items] of significantClusters) {
      if (activeRuleCount + newRulesCreated >= MAX_ACTIVE_RULES) {
        await deactivateOldestRule(supabase);
      }

      const [feedbackType, category] = clusterKey.split('__');
      const sampleTexts = items.slice(0, 5).map(i =>
        `- Frage: "${(i.question_content || '').substring(0, 200)}" | Grund: ${i.feedback_type} | Details: ${i.feedback_details || 'keine'}`
      ).join('\n');

      const grades = [...new Set(items.map(i => i.grade))].sort((a, b) => a - b);

      const ruleText = await generateRule(LOVABLE_API_KEY, {
        type: 'content_quality',
        category,
        feedbackType,
        sampleTexts,
        itemCount: items.length,
      });

      if (!ruleText) continue;

      // Check for similar existing rule → merge instead of skip
      const similarMatch = findSimilarRule(activeRules, ruleText);
      if (similarMatch) {
        console.log(`🔀 Merging with existing rule ${similarMatch.id} for ${clusterKey}`);
        const merged = await mergeRules(LOVABLE_API_KEY, similarMatch.rule_text, ruleText);
        if (merged) {
          const newFeedbackIds = [...new Set([...similarMatch.source_feedback_ids, ...items.map(i => i.id)])];
          await supabase
            .from('prompt_rules')
            .update({
              rule_text: merged,
              source_feedback_count: similarMatch.source_feedback_count + items.length,
              source_feedback_ids: newFeedbackIds,
              grade_min: grades.length > 0 ? Math.min(similarMatch.grade_min ?? Infinity, ...grades) : similarMatch.grade_min,
              grade_max: grades.length > 0 ? Math.max(similarMatch.grade_max ?? -Infinity, ...grades) : similarMatch.grade_max,
            })
            .eq('id', similarMatch.id);
          // Update local cache
          similarMatch.rule_text = merged;
          console.log(`✅ Merged rule: "${merged}"`);
        }
        continue;
      }

      const ruleSubject = normalizeCategory(category);
      const { error: insertError } = await supabase
        .from('prompt_rules')
        .insert({
          rule_text: ruleText,
          subject: ruleSubject,
          grade_min: grades.length > 0 ? Math.min(...grades) : null,
          grade_max: grades.length > 0 ? Math.max(...grades) : null,
          source_feedback_ids: items.map(i => i.id),
          source_feedback_count: items.length,
        });

      if (insertError) {
        console.error(`Error inserting rule: ${insertError.message}`);
        continue;
      }

      newRulesCreated++;
      activeRules.push({
        id: 'new',
        rule_text: ruleText,
        subject: normalizeCategory(category),
        grade_min: grades.length > 0 ? Math.min(...grades) : null,
        grade_max: grades.length > 0 ? Math.max(...grades) : null,
        source_feedback_count: items.length,
        source_feedback_ids: items.map(i => i.id),
      });
      console.log(`✅ Content rule for ${clusterKey}: "${ruleText}"`);
    }

    // 5. Generate VARIANT OPTIMIZATION rules from question type feedback
    if (variantIssues.length > 0) {
      console.log(`🔄 Found ${variantIssues.length} variant-related feedbacks`);

      const variantRule = await generateRule(LOVABLE_API_KEY, {
        type: 'variant_optimization',
        category: 'all',
        feedbackType: 'variant_mismatch',
        sampleTexts: variantIssues.slice(0, 8).map(i => {
          const details = typeof i.feedback_details === 'string' 
            ? i.feedback_details 
            : JSON.stringify(i.feedback_details);
          return `- Fach: ${i.category} | Klasse: ${i.grade} | Frage: "${(i.question_content || '').substring(0, 150)}" | Nutzer-Feedback: ${details?.substring(0, 300) || 'keine'}`;
        }).join('\n'),
        itemCount: variantIssues.length,
      });

      if (variantRule) {
        const mergeResult = await mergeOrInsertRule(supabase, LOVABLE_API_KEY, activeRules, variantRule, {
          subject: null,
          grade_min: null,
          grade_max: null,
          feedbackIds: variantIssues.map(i => i.id),
          feedbackCount: variantIssues.length,
        }, activeRuleCount, newRulesCreated, MAX_ACTIVE_RULES);
        if (mergeResult === 'inserted') newRulesCreated++;
      }
    }

    // 6. Also generate subject-specific variant preference rules
    // Cluster variant issues by category
    const variantByCategory = new Map<string, typeof feedbacks>();
    for (const fb of feedbacks) {
      // Analyze question content for type mismatches
      const content = (fb.question_content || '').toLowerCase();
      const isAssignment = content.includes('ordne') || content.includes('zuordnung') || content.includes('sortiere') || content.includes('passend');
      const questionType = fb.question_type || '';
      
      if (isAssignment && (questionType.includes('sort') || questionType.includes('SORT'))) {
        const key = `variant__${fb.category}`;
        if (!variantByCategory.has(key)) variantByCategory.set(key, []);
        variantByCategory.get(key)!.push(fb);
      }
    }

    for (const [key, items] of variantByCategory) {
      if (items.length < MIN_CLUSTER_SIZE) continue;
      
      const category = key.split('__')[1];
      const sampleTexts = items.slice(0, 5).map(i =>
        `- Frage: "${(i.question_content || '').substring(0, 200)}" | Typ: ${i.question_type}`
      ).join('\n');

      const variantRule = await generateRule(LOVABLE_API_KEY, {
        type: 'variant_selection',
        category,
        feedbackType: 'wrong_variant',
        sampleTexts,
        itemCount: items.length,
      });

      if (variantRule) {
        const ruleSubject = normalizeCategory(category);
        const mergeResult = await mergeOrInsertRule(supabase, LOVABLE_API_KEY, activeRules, variantRule, {
          subject: ruleSubject,
          grade_min: null,
          grade_max: null,
          feedbackIds: items.map(i => i.id),
          feedbackCount: items.length,
        }, activeRuleCount, newRulesCreated, MAX_ACTIVE_RULES);
        if (mergeResult === 'inserted') newRulesCreated++;
      }
    }

    // 7. Generate POSITIVE REINFORCEMENT rules from good_question feedback
    const positiveClusters = new Map<string, typeof feedbacks>();
    for (const fb of feedbacks) {
      if (fb.feedback_type !== 'good_question') continue;
      const key = `good_question__${fb.category}`;
      if (!positiveClusters.has(key)) positiveClusters.set(key, []);
      positiveClusters.get(key)!.push(fb);
    }

    for (const [key, items] of positiveClusters) {
      if (items.length < MIN_CLUSTER_SIZE) continue;

      const category = key.split('__')[1];
      const sampleTexts = items.slice(0, 8).map(i =>
        `- Frage: "${(i.question_content || '').substring(0, 200)}" | Klasse: ${i.grade} | Typ: ${i.question_type}`
      ).join('\n');

      const grades = [...new Set(items.map(i => i.grade))].sort((a, b) => a - b);

      const positiveRule = await generateRule(LOVABLE_API_KEY, {
        type: 'positive_reinforcement',
        category,
        feedbackType: 'good_question',
        sampleTexts,
        itemCount: items.length,
      });

      if (positiveRule) {
        const ruleSubject = normalizeCategory(category);
        const mergeResult = await mergeOrInsertRule(supabase, LOVABLE_API_KEY, activeRules, positiveRule, {
          subject: ruleSubject,
          grade_min: grades.length > 0 ? Math.min(...grades) : null,
          grade_max: grades.length > 0 ? Math.max(...grades) : null,
          feedbackIds: items.map(i => i.id),
          feedbackCount: items.length,
        }, activeRuleCount, newRulesCreated, MAX_ACTIVE_RULES);
        if (mergeResult === 'inserted') newRulesCreated++;
      }
    }

    // 8. Mark ALL feedbacks as analyzed
    const allFeedbackIds = feedbacks.map(f => f.id);
    for (let i = 0; i < allFeedbackIds.length; i += 50) {
      const batch = allFeedbackIds.slice(i, i + 50);
      await supabase
        .from('question_feedback')
        .update({ analyzed_at: new Date().toISOString() })
        .in('id', batch);
    }

    const response = {
      success: true,
      message: `${newRulesCreated} neue Regel(n) erstellt`,
      newRules: newRulesCreated,
      analyzedFeedbacks: feedbacks.length,
      clusters: significantClusters.length,
      variantIssuesFound: variantIssues.length,
    };

    console.log(`📋 Analysis complete:`, response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('analyze-feedback error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Interner Fehler bei der Feedback-Analyse',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// --- Helper functions ---

async function deactivateOldestRule(supabase: any) {
  const { data: oldestRule } = await supabase
    .from('prompt_rules')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (oldestRule) {
    await supabase
      .from('prompt_rules')
      .update({ is_active: false, deactivated_at: new Date().toISOString() })
      .eq('id', oldestRule.id);
  }
}

function normalizeCategory(category: string): string | null {
  const map: Record<string, string> = {
    'mathematik': 'math', 'mathe': 'math', 'math': 'math',
    'deutsch': 'german', 'german': 'german',
    'englisch': 'english', 'english': 'english',
    'erdkunde': 'geography', 'geography': 'geography',
    'geschichte': 'history', 'history': 'history',
    'physik': 'physics', 'physics': 'physics',
    'biologie': 'biology', 'biology': 'biology',
    'chemie': 'chemistry', 'chemistry': 'chemistry',
    'latein': 'latin', 'latin': 'latin',
  };
  const normalized = map[category.toLowerCase()];
  return normalized || (category === 'general' ? null : category.toLowerCase());
}

interface RuleGenerationContext {
  type: 'content_quality' | 'variant_optimization' | 'variant_selection' | 'positive_reinforcement';
  category: string;
  feedbackType: string;
  sampleTexts: string;
  itemCount: number;
}

async function generateRule(apiKey: string, ctx: RuleGenerationContext): Promise<string | null> {
  let prompt: string;

  if (ctx.type === 'positive_reinforcement') {
    prompt = `Du bist ein Qualitätsmanager für einen KI-Fragengenerator für Schulkinder.

Hier sind ${ctx.itemCount} positiv bewertete Fragen (👍 Daumen hoch) im Fach "${ctx.category}":

${ctx.sampleTexts}

Analysiere, was diese Fragen gut macht (z.B. klare Formulierung, passender Schwierigkeitsgrad, gute Antwortalternativen).
Formuliere EINE kurze, präzise Imperativ-Regel (max. 2 Sätze), die der Fragengenerator befolgen soll, um mehr solcher guten Fragen zu erzeugen.

Antworte NUR mit der Regel, ohne Anführungszeichen, ohne Erklärung.`;
  } else if (ctx.type === 'content_quality') {
    prompt = `Du bist ein Qualitätsmanager für einen KI-Fragengenerator für Schulkinder.

Hier sind ${ctx.itemCount} Beschwerden zum Fach "${ctx.category}", Typ "${ctx.feedbackType}":

${ctx.sampleTexts}

Formuliere EINE kurze, präzise Imperativ-Regel (max. 1 Satz), die der Fragengenerator befolgen soll, um diesen Fehlertyp in Zukunft zu vermeiden.

Antworte NUR mit der Regel, ohne Anführungszeichen, ohne Erklärung.`;
  } else if (ctx.type === 'variant_optimization') {
    prompt = `Du bist ein Qualitätsmanager für einen KI-Fragengenerator für Schulkinder.
Der Generator kann 4 Fragetypen erstellen: MULTIPLE_CHOICE, FREETEXT, SORT (Reihenfolge), MATCH (Zuordnung).

Nutzer haben sich beschwert, dass Fragen den FALSCHEN Fragetyp verwenden:

${ctx.sampleTexts}

Formuliere EINE kurze, präzise Imperativ-Regel (max. 2 Sätze), die definiert, WANN welcher Fragetyp verwendet werden soll. Fokussiere auf die häufigsten Fehler aus dem Feedback.
Beispiel: "Verwende MATCH statt SORT, wenn Elemente Kategorien zugeordnet werden sollen; SORT nur für echte Reihenfolgen (zeitlich, numerisch, alphabetisch)."

Antworte NUR mit der Regel, ohne Anführungszeichen, ohne Erklärung.`;
  } else {
    // variant_selection
    prompt = `Du bist ein Qualitätsmanager für einen KI-Fragengenerator für Schulkinder.
Der Generator kann 4 Fragetypen erstellen: MULTIPLE_CHOICE, FREETEXT, SORT (Reihenfolge), MATCH (Zuordnung).

Bei folgenden Fragen im Fach "${ctx.category}" wurde der falsche Fragetyp (SORT statt MATCH) verwendet:

${ctx.sampleTexts}

Formuliere EINE kurze, präzise Imperativ-Regel (max. 2 Sätze) für das Fach "${ctx.category}", die beschreibt, wann MATCH statt SORT verwendet werden soll.

Antworte NUR mit der Regel, ohne Anführungszeichen, ohne Erklärung.`;
  }

  try {
    const { response } = await callAI({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    if (!response.ok) {
      console.error(`AI error: ${response.status}`);
      return null;
    }

    const result = await response.json();
    const ruleText = result.choices?.[0]?.message?.content?.trim();

    if (!ruleText || ruleText.length < 10 || ruleText.length > 500) {
      console.warn(`Invalid rule text: "${ruleText}"`);
      return null;
    }

    return ruleText;
  } catch (err) {
    console.error('AI call failed:', err);
    return null;
  }
}

function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}
