/**
 * Fortlaufende Qualitätsprüfung des Fragen-Caches.
 *
 * Bisher prüfte nichts den Bestand — eine einmal falsch generierte Frage blieb
 * dauerhaft drin und wurde immer wieder ausgeliefert. Dieser Job arbeitet den
 * Cache in kleinen Schüben durch und nimmt fehlerhafte Fragen aus der
 * Auslieferung.
 *
 * Kostenrahmen (die Vorgabe war: läuft regelmäßig, kostet möglichst nichts):
 *
 *   1. Tagesbudget über `ai_model_metrics`, siehe _shared/job-budget.ts
 *   2. Stufe 1 prüft deterministisch per validateMath() — kostet NICHTS
 *   3. Stufe 2 (LLM) nur für den Rest, auf einem kostenlosen Modell ohne
 *      bezahlten Fallback: lieber Lauf abbrechen als Geld ausgeben
 *
 * Reihenfolge: ungeprüfte Fragen zuerst, danach die am längsten nicht
 * geprüften. Der Index `idx_aqc_quality_queue` (NULLS FIRST) bildet das ab.
 *
 * Durchgefallene Fragen werden deaktiviert, nicht gelöscht — bei einem freien
 * Prüfmodell muss ein Fehlurteil korrigierbar bleiben.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callAI } from '../_shared/ai-client.ts';
import { checkBudget, makeDeadline, pace } from '../_shared/job-budget.ts';
import {
  buildSystemPrompt,
  buildUserPrompt,
  deterministicVerdict,
  parseVerdict,
  type CachedQuestion,
  type Verdict,
} from '../_shared/quality-verdict.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const USE_CASE = 'quality_check';

/** Bewusst niedrig: ~130 Aufrufe/Tag gesamt bei 1000 verfuegbaren. */
const DEFAULT_MAX_PER_DAY = 80;
const DEFAULT_MAX_CHECKS = 20;

/** Hintergrundjob — kostenlose Modelle brauchen regelmaessig mehr als 12s. */
const LLM_TIMEOUT_MS = 60_000;


/**
 * Stufe 2 — LLM-Urteil. Gibt null zurück, wenn keine Bewertung möglich war.
 *
 * `diagnostics` sammelt den Grund des Scheiterns. Ohne das ist von aussen nicht
 * unterscheidbar, ob das Modell nicht existiert, das Kontingent erschoepft ist
 * oder schlicht leerer Text zurueckkam — genau diese Unterscheidung hat beim
 * ersten Testlauf gefehlt.
 */
async function llmVerdict(q: CachedQuestion, diagnostics: string[]): Promise<Verdict | null> {
  const note = (msg: string) => {
    console.warn(`[quality] ${msg}`);
    if (diagnostics.length < 5) diagnostics.push(msg);
  };

  let response: Response;
  let model: string;
  try {
    const result = await callAI({
      model: 'deepseek/deepseek-chat-v3-0324:free',
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(q) },
      ],
      temperature: 0.1,
      timeoutMs: LLM_TIMEOUT_MS,
    }, undefined, USE_CASE);
    response = result.response;
    model = result.model;
  } catch (err) {
    note(`Aufruf fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    note(`HTTP ${response.status} von ${model}: ${body.substring(0, 300)}`);
    // 429 bedeutet Kontingent erschoepft — der Aufrufer beendet den Lauf.
    if (response.status === 429) throw new Error('RATE_LIMIT');
    return null;
  }

  const payload = await response.json().catch(() => null);
  const text: string | null = payload?.choices?.[0]?.message?.content ?? null;
  if (!text) {
    // Leerer Text bei HTTP 200 ist der verwirrendste Fall: Modell erreichbar,
    // liefert aber nichts. Rohantwort mitgeben, damit die Ursache sichtbar wird.
    note(`Leere Antwort von ${model}: ${JSON.stringify(payload).substring(0, 300)}`);
    return null;
  }

  const verdict = parseVerdict(text, model);
  if (!verdict) note(`Antwort nicht als JSON lesbar (${model}): ${text.substring(0, 200)}`);
  return verdict;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Nur per Cron erreichbar — Muster aus cache-cleanup/index.ts
  const bearer = req.headers.get('Authorization')?.replace('Bearer ', '');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey || bearer !== serviceKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const maxChecks = Math.min(Number(body.maxChecks) || DEFAULT_MAX_CHECKS, 60);
  const maxPerDay = Number(body.maxPerDay) || DEFAULT_MAX_PER_DAY;

  const stats = {
    examined: 0,
    passed: 0,
    failed: 0,
    deterministic: 0,
    llm_calls: 0,
    skipped_no_verdict: 0,
    stopped_reason: 'completed' as string,
  };

  // Gruende fuer nicht zustande gekommene Urteile, damit ein Fehlschlag von
  // aussen diagnostizierbar ist statt nur als Zahl zu erscheinen.
  const diagnostics: string[] = [];

  // ── Kostensperre vor allem anderen ──
  const budget = await checkBudget(USE_CASE, maxPerDay);
  if (!budget.canProceed) {
    console.log(`[quality] Tagesbudget ausgeschoepft (${budget.usedToday}/${maxPerDay}) — Lauf uebersprungen`);
    return new Response(
      JSON.stringify({ success: true, skipped: true, reason: 'daily_budget_exhausted', budget }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
  const withinDeadline = makeDeadline();

  // Ungeprueft zuerst, danach am laengsten nicht geprueft.
  const { data: queue, error: queueErr } = await supabase
    .from('ai_question_cache')
    .select('id, grade, subject, question_text, question_type, category, correct_answer, options')
    .order('quality_checked_at', { ascending: true, nullsFirst: true })
    .limit(maxChecks);

  if (queueErr) {
    return new Response(JSON.stringify({ success: false, error: queueErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let lastCallAt = 0;
  let llmBudgetLeft = budget.remaining;

  for (const row of (queue ?? []) as CachedQuestion[]) {
    if (!withinDeadline()) {
      stats.stopped_reason = 'time_budget';
      break;
    }

    stats.examined++;
    let verdict = deterministicVerdict(row);

    if (verdict) {
      stats.deterministic++;
    } else {
      if (llmBudgetLeft <= 0) {
        stats.stopped_reason = 'daily_budget_exhausted';
        break;
      }
      lastCallAt = await pace(lastCallAt);
      try {
        verdict = await llmVerdict(row, diagnostics);
      } catch (err) {
        if (err instanceof Error && err.message === 'RATE_LIMIT') {
          stats.stopped_reason = 'rate_limited';
          break;
        }
        throw err;
      }
      stats.llm_calls++;
      llmBudgetLeft--;
    }

    // Kein verwertbares Urteil: Zeitstempel NICHT setzen, damit die Frage beim
    // naechsten Lauf erneut drankommt statt faelschlich als geprueft zu gelten.
    if (!verdict) {
      stats.skipped_no_verdict++;
      continue;
    }

    const update: Record<string, unknown> = {
      quality_checked_at: new Date().toISOString(),
      quality_status: verdict.ok ? 'ok' : 'failed',
      quality_issues: verdict.ok ? null : verdict.issues,
      quality_model: verdict.model,
    };
    // Bestandene Fragen werden reaktiviert — so wirkt eine geloeste Beanstandung
    // (etwa nach einem Modellwechsel) automatisch.
    update.is_active = verdict.ok;

    const { error: updErr } = await supabase
      .from('ai_question_cache')
      .update(update)
      .eq('id', row.id);

    if (updErr) {
      console.warn(`[quality] Update fehlgeschlagen fuer ${row.id}:`, updErr.message);
      continue;
    }

    if (verdict.ok) {
      stats.passed++;
    } else {
      stats.failed++;
      console.log(`[quality] deaktiviert ${row.id}: ${verdict.issues}`);
    }
  }

  console.log('[quality] Lauf beendet:', JSON.stringify(stats));

  return new Response(
    JSON.stringify({ success: true, ...stats, diagnostics, budget_before: budget }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
