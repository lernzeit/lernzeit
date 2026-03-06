import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-analyze-secret',
};

const MAX_NEW_RULES_PER_RUN = 5;
const MAX_ACTIVE_RULES = 20;
const MIN_CLUSTER_SIZE = 3;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: require admin role via JWT or x-analyze-secret header
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin (via Authorization header)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
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
    } else {
      return new Response(JSON.stringify({ error: 'Nicht authentifiziert' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    // 2. Cluster by feedback_type + category
    const clusters = new Map<string, typeof feedbacks>();
    for (const fb of feedbacks) {
      const key = `${fb.feedback_type}__${fb.category}`;
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key)!.push(fb);
    }

    // 3. Filter clusters with >= MIN_CLUSTER_SIZE
    const significantClusters = Array.from(clusters.entries())
      .filter(([, items]) => items.length >= MIN_CLUSTER_SIZE)
      .slice(0, MAX_NEW_RULES_PER_RUN);

    if (significantClusters.length === 0) {
      // Mark all as analyzed even if no cluster is significant
      const allIds = feedbacks.map(f => f.id);
      await supabase
        .from('question_feedback')
        .update({ analyzed_at: new Date().toISOString() })
        .in('id', allIds);

      return new Response(JSON.stringify({
        success: true,
        message: `${feedbacks.length} Feedbacks analysiert, aber kein Cluster groß genug (min. ${MIN_CLUSTER_SIZE})`,
        newRules: 0,
        analyzedFeedbacks: feedbacks.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY nicht konfiguriert' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load existing rules for deduplication
    const { data: existingRules } = await supabase
      .from('prompt_rules')
      .select('rule_text')
      .eq('is_active', true);

    const existingTexts = (existingRules || []).map(r => r.rule_text.toLowerCase());
    const activeRuleCount = existingTexts.length;

    let newRulesCreated = 0;
    const allAnalyzedIds: string[] = [];

    // 4. For each significant cluster, generate a rule
    for (const [clusterKey, items] of significantClusters) {
      if (activeRuleCount + newRulesCreated >= MAX_ACTIVE_RULES) {
        // Deactivate oldest rule to make room
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

      const [feedbackType, category] = clusterKey.split('__');
      const feedbackIds = items.map(i => i.id);
      allAnalyzedIds.push(...feedbackIds);

      // Build summary for AI
      const sampleTexts = items.slice(0, 5).map(i =>
        `- Frage: "${i.question_content.substring(0, 200)}" | Grund: ${i.feedback_type} | Details: ${i.feedback_details || 'keine'}`
      ).join('\n');

      const grades = [...new Set(items.map(i => i.grade))].sort((a, b) => a - b);

      const aiPrompt = `Du bist ein Qualitätsmanager für einen KI-Fragengenerator für Schulkinder.

Hier sind ${items.length} Beschwerden zum Fach "${category}", Typ "${feedbackType}":

${sampleTexts}

Formuliere EINE kurze, präzise Imperativ-Regel (max. 1 Satz), die der Fragengenerator befolgen soll, um diesen Fehlertyp in Zukunft zu vermeiden.

Antworte NUR mit der Regel, ohne Anführungszeichen, ohne Erklärung.`;

      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: aiPrompt }],
            temperature: 0.3,
          }),
        });

        if (!response.ok) {
          console.error(`AI error for cluster ${clusterKey}: ${response.status}`);
          continue;
        }

        const result = await response.json();
        const ruleText = result.choices?.[0]?.message?.content?.trim();

        if (!ruleText || ruleText.length < 10 || ruleText.length > 500) {
          console.warn(`Invalid rule text for ${clusterKey}: "${ruleText}"`);
          continue;
        }

        // Deduplicate: skip if very similar rule exists
        const isDuplicate = existingTexts.some(existing => {
          const similarity = calculateSimilarity(existing, ruleText.toLowerCase());
          return similarity > 0.7;
        });

        if (isDuplicate) {
          console.log(`⏭️ Skipping duplicate rule for ${clusterKey}`);
          continue;
        }

        // Determine subject scope
        const ruleSubject = category === 'general' ? null : category;
        const gradeMin = grades.length > 0 ? Math.min(...grades) : null;
        const gradeMax = grades.length > 0 ? Math.max(...grades) : null;

        const { error: insertError } = await supabase
          .from('prompt_rules')
          .insert({
            rule_text: ruleText,
            subject: ruleSubject,
            grade_min: gradeMin,
            grade_max: gradeMax,
            source_feedback_ids: feedbackIds,
            source_feedback_count: items.length,
          });

        if (insertError) {
          console.error(`Error inserting rule: ${insertError.message}`);
          continue;
        }

        newRulesCreated++;
        existingTexts.push(ruleText.toLowerCase());
        console.log(`✅ New rule created for ${clusterKey}: "${ruleText}"`);

      } catch (aiErr) {
        console.error(`AI call failed for ${clusterKey}:`, aiErr);
        continue;
      }
    }

    // 5. Mark ALL feedbacks as analyzed (not just clustered ones)
    const allFeedbackIds = feedbacks.map(f => f.id);
    // Update in batches of 50
    for (let i = 0; i < allFeedbackIds.length; i += 50) {
      const batch = allFeedbackIds.slice(i, i + 50);
      await supabase
        .from('question_feedback')
        .update({ analyzed_at: new Date().toISOString() })
        .in('id', batch);
    }

    const response = {
      success: true,
      message: `${newRulesCreated} neue Regel(n) erstellt aus ${significantClusters.length} Cluster(n)`,
      newRules: newRulesCreated,
      analyzedFeedbacks: feedbacks.length,
      clusters: significantClusters.length,
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

// Simple similarity check using Jaccard index on word sets
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}
