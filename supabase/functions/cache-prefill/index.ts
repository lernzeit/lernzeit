import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-client.ts";
import { loadCategoryMix, pickCategory } from "../_shared/question-prompt.ts";
import {
  buildQuestionPrompt,
  buildSystemPrompt,
  getDifficulty,
  getQuestionType,
  loadRulesBlock,
  parseAndValidate,
  SUBJECT_DOMAINS,
} from "../_shared/prefill-prompt.ts";
import { checkBudget, makeDeadline, pace } from "../_shared/job-budget.ts";

/** Tagesbudget der Vorproduktion. Bewusst niedrig — siehe _shared/job-budget.ts. */
const PREFILL_MAX_PER_DAY = 90;
/** Hintergrundjob: kostenlose Modelle brauchen regelmaessig mehr als 12s. */
const PREFILL_TIMEOUT_MS = 60_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Rate limit: Gemini 2.5 Pro Free Tier = 5 RPM, 50 RPD ──
const DELAY_BETWEEN_REQUESTS_MS = 13_000; // ~4.6/min → under 5 RPM limit
const MAX_QUESTIONS_PER_RUN = 15;         // conserves daily quota (leaves buffer)
const MIN_CACHE_THRESHOLD = 20;           // generate until each combo has this many

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Batch generation via the shared callAI pipeline ─────────────────────────

/**
 * `diagnostics` sammelt den Grund eines Fehlschlags. Ohne das erscheint jeder
 * Fehler nur als `empty_response` — egal ob das Modell nicht existiert, das
 * Kontingent erschoepft ist oder wirklich leerer Text kam.
 */
async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  _apiKey: string,
  diagnostics: string[] = [],
): Promise<string | null> {
  const note = (msg: string) => {
    console.warn(`[prefill] ${msg}`);
    if (diagnostics.length < 5) diagnostics.push(msg);
  };

  // Das tatsaechliche Modell kommt aus ai_model_config (use_case
  // question_generator_batch) und ist dort auf ein kostenloses OpenRouter-Modell
  // gestellt. Der Wert hier ist nur der Fallback, falls keine Konfiguration
  // geladen werden kann. Der Funktionsname ist historisch.
  const { response, provider, model } = await callAI({
    model: 'google/gemini-3.8-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.75,
    timeoutMs: PREFILL_TIMEOUT_MS,
  }, undefined, 'question_generator_batch');

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    note(`HTTP ${response.status} von ${model} (${provider}): ${errText.substring(0, 300)}`);
    if (response.status === 429) throw new Error('RATE_LIMIT');
    if (response.status === 403 || response.status === 401) throw new Error('AUTH_ERROR');
    return null;
  }

  const result = await response.json();
  const text = result?.choices?.[0]?.message?.content ?? null;
  if (!text) {
    note(`Leere Antwort von ${model}: ${JSON.stringify(result).substring(0, 300)}`);
  }
  return text;
}

// ── Main Handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Security: require either the prefill secret header OR the service-role bearer.
  // Fail-closed when neither is configured.
  const prefillSecret = req.headers.get('x-prefill-secret');
  const expectedSecret = Deno.env.get('CACHE_PREFILL_SECRET');
  const bearer = req.headers.get('Authorization')?.replace('Bearer ', '');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorized =
    (expectedSecret && prefillSecret === expectedSecret) ||
    (serviceKey && bearer === serviceKey);
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Optional body params: override defaults for manual runs
  let targetGrades: number[] | null = null;
  let targetSubjects: string[] | null = null;
  let maxQuestions = MAX_QUESTIONS_PER_RUN;
  try {
    const body = await req.json().catch(() => ({}));
    targetGrades = body.grades ?? null;
    targetSubjects = body.subjects ?? null;
    maxQuestions = body.maxQuestions ?? MAX_QUESTIONS_PER_RUN;
  } catch { /* ignore */ }

  // ── Step 1: Get current cache stats ──────────────────────────────────────
  const { data: statsRows, error: statsErr } = await adminClient.rpc('get_cache_stats');
  if (statsErr) {
    console.error('get_cache_stats error:', statsErr);
    return new Response(JSON.stringify({ error: 'Failed to load cache stats' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Build lookup: { "grade-subject" → count }
  const cacheMap = new Map<string, number>();
  for (const row of (statsRows ?? [])) {
    cacheMap.set(`${row.grade}-${row.subject}`, Number(row.total_questions));
  }

  // ── Step 2: Build priority target list ───────────────────────────────────
  // All grade×subject combinations covered by SUBJECT_DOMAINS, with school-logic constraints
  interface PrefillTarget { grade: number; subject: string; currentCount: number }
  const targets: PrefillTarget[] = [];

  const ALL_GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const ALL_SUBJECTS = Object.keys(SUBJECT_DOMAINS);

  const gradesToCheck = targetGrades ?? ALL_GRADES;
  const subjectsToCheck = targetSubjects ?? ALL_SUBJECTS;

  for (const grade of gradesToCheck) {
    for (const subject of subjectsToCheck) {
      const domainInfo = SUBJECT_DOMAINS[subject];
      if (!domainInfo) continue;

      // School-logic grade constraints
      if (grade < domainInfo.minGrade || grade > domainInfo.maxGrade) continue;

      const current = cacheMap.get(`${grade}-${subject}`) ?? 0;
      if (current < MIN_CACHE_THRESHOLD) {
        targets.push({ grade, subject, currentCount: current });
      }
    }
  }

  // Sort by most underrepresented first
  targets.sort((a, b) => a.currentCount - b.currentCount);

  if (targets.length === 0) {
    console.log('✅ Cache is well-stocked — nothing to generate');
    return new Response(JSON.stringify({ success: true, message: 'Cache already sufficient', generated: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`🎯 ${targets.length} combos below threshold. Generating up to ${maxQuestions} questions...`);

  // ── Step 2b: Load existing questions per target for deduplication ────────
  function normalizeMathExpr(text: string): string {
    return text.replace(/(\d+)\s*([+×*])\s*(\d+)/g, (_match, a, op, b) => {
      const sorted = [a, b].sort();
      return `${sorted[0]}${op}${sorted[1]}`;
    }).toLowerCase().trim();
  }

  function isDuplicate(newText: string, existingTexts: string[], subject: string): boolean {
    const normalizedNew = subject === 'math' ? normalizeMathExpr(newText) : newText.toLowerCase().trim();
    return existingTexts.some(existing => {
      const normalizedExisting = subject === 'math' ? normalizeMathExpr(existing) : existing.toLowerCase().trim();
      return normalizedNew === normalizedExisting;
    });
  }

  const existingQuestionsMap = new Map<string, string[]>();
  for (const target of targets) {
    const key = `${target.grade}-${target.subject}`;
    if (!existingQuestionsMap.has(key)) {
      const { data } = await adminClient
        .from('ai_question_cache')
        .select('question_text')
        .eq('grade', target.grade)
        .eq('subject', target.subject)
        .limit(200);
      existingQuestionsMap.set(key, (data ?? []).map(r => r.question_text));
    }
  }

  // ── Step 2c: Load active prompt rules ─────────────────────────────────────
  const { block: rulesBlock, count: ruleCount } = await loadRulesBlock(adminClient);
  if (ruleCount > 0) console.log(`📏 Injecting ${ruleCount} prompt rules into cache-prefill`);

  // ── Step 3: Generate questions with rate-limit-safe delays ───────────────
  // Der Theorie-Anteil wird einmal geladen und pro Frage gezogen, damit der
  // vorproduzierte Pool dasselbe Verhältnis hat wie der Live-Pfad. Ohne das
  // würde der Cache-First-Zugriff für Theoriefragen dauerhaft ins Leere laufen.
  const categoryMix = await loadCategoryMix();

  // ── Kostensperre vor dem ersten Aufruf ──
  // Bei erschoepftem Tagesbudget beendet sich der Lauf sofort. Weil der
  // Zeitpunkt dieses Jobs unerheblich ist, holt der naechste Lauf es nach.
  const budget = await checkBudget('question_generator_batch', PREFILL_MAX_PER_DAY);
  if (!budget.canProceed) {
    console.log(`[prefill] Tagesbudget ausgeschoepft (${budget.usedToday}/${PREFILL_MAX_PER_DAY}) — Lauf uebersprungen`);
    return new Response(
      JSON.stringify({
        success: true,
        skipped: true,
        reason: 'daily_budget_exhausted',
        generated: 0,
        budget,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const withinDeadline = makeDeadline();
  let lastCallAt = 0;
  let budgetLeft = budget.remaining;

  let generated = 0;
  let failed = 0;
  const results: { grade: number; subject: string; type: string; status: string }[] = [];
  // Gruende fuer Fehlschlaege, damit ein leerer Lauf diagnostizierbar ist.
  const diagnostics: string[] = [];

  for (let i = 0; i < Math.min(maxQuestions, targets.length * 3); i++) {
    if (generated >= maxQuestions) break;
    if (budgetLeft <= 0) {
      console.log('[prefill] Tagesbudget waehrend des Laufs erreicht');
      break;
    }
    if (!withinDeadline()) {
      console.log('[prefill] Zeitbudget erreicht, sauberer Abbruch vor dem Idle-Limit');
      break;
    }

    const target = targets[i % targets.length];
    const { grade, subject } = target;

    const slotIndex = generated;
    const category = pickCategory(subject, grade, categoryMix);
    const questionType = getQuestionType(subject, slotIndex, category);
    const difficulty = getDifficulty(slotIndex);

    const cacheKey = `${grade}-${subject}`;
    const existingTexts = existingQuestionsMap.get(cacheKey) ?? [];
    const excludeSample = existingTexts.slice(-8);

    console.log(`[${generated + 1}/${maxQuestions}] G${grade} ${subject} | ${questionType} | ${difficulty} | ${category} | Existing: ${existingTexts.length}`);

    try {
      const systemPrompt = buildSystemPrompt(category, subject) + rulesBlock;
      let userPrompt = buildQuestionPrompt(grade, subject, difficulty, questionType, category);
      if (excludeSample.length > 0) {
        userPrompt += `\n\nWICHTIG – Diese Fragen existieren bereits. Erstelle eine VÖLLIG ANDERE Frage:\n${excludeSample.map(t => `- "${t.substring(0, 60)}"`).join('\n')}`;
      }

      // 20 Anfragen/Minute bei kostenlosen Modellen -> 3s Mindestabstand.
      lastCallAt = await pace(lastCallAt);
      budgetLeft--;
      const rawJson = await callGemini(systemPrompt, userPrompt, GEMINI_API_KEY, diagnostics);

      if (!rawJson) {
        console.warn('Empty response from Gemini');
        failed++;
        results.push({ grade, subject, type: questionType, status: 'empty_response' });
        continue;
      }

      const validated = parseAndValidate(rawJson, grade, subject, difficulty);
      if (!validated) {
        console.warn('Validation failed for generated question');
        failed++;
        results.push({ grade, subject, type: questionType, status: 'validation_failed' });
        continue;
      }

      // ── Deduplication check ──
      const newText = validated.question_text as string;
      if (isDuplicate(newText, existingTexts, subject)) {
        console.warn(`⚠️ Duplicate detected, skipping: "${newText.substring(0, 60)}..."`);
        failed++;
        results.push({ grade, subject, type: questionType, status: 'duplicate_skipped' });
        continue;
      }

      // ── Save to cache ──
      const { error: insertErr } = await adminClient.from('ai_question_cache').insert({ ...validated, category });
      if (insertErr) {
        console.error('Cache insert error:', insertErr.message);
        failed++;
        results.push({ grade, subject, type: questionType, status: 'insert_failed' });
      } else {
        generated++;
        existingTexts.push(newText);
        results.push({ grade, subject, type: questionType, status: 'ok' });
        console.log(`✅ Saved: G${grade} ${subject} ${questionType} (${difficulty})`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'RATE_LIMIT') {
        console.warn('🚦 Rate limit hit — stopping early');
        break;
      }
      console.error('Generation error:', msg);
      failed++;
    }

    // Rate-limit-safe delay (Gemini 2.5 Pro: 5 RPM free tier)
    if (generated + failed < maxQuestions) {
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }
  }

  const summary = {
    success: true,
    generated,
    failed,
    targetsFound: targets.length,
    results,
    diagnostics,
    timestamp: new Date().toISOString(),
  };

  console.log(`\n📊 Run complete: ${generated} generated, ${failed} failed`);

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
