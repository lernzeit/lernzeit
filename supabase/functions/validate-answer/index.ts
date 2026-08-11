/**
 * Prüft eine Schülerantwort, die die lokale Prüfung im Spiel abgelehnt hat.
 *
 * Bis 08/2026 verglich diese Funktion die Eingabe ausschliesslich mit der
 * hinterlegten Antwort und setzte diese als Wahrheit voraus. Gegen eine falsche
 * Musterlösung war sie damit blind: Bei "Addiere 450 und 230. Subtrahiere von
 * diesem Ergebnis das Dreifache der Differenz …" stand 158 im Cache, richtig
 * sind 20 — das Kind rechnete richtig und bekam "Nicht ganz".
 *
 * Aufgefangen hätte das nur `ai-explain`, und die läuft erst, wenn das Kind auf
 * "Erklärung" tippt. Wer direkt auf "Weiter" geht, bleibt mit dem falschen
 * Ergebnis zurück.
 *
 * Deshalb wird hier jetzt unabhängig geprüft, in zwei Stufen:
 *
 *   1. nachrechnen (kostenlos, verlässlich, deckt aber nicht alles ab)
 *   2. Modellurteil für den Rest
 *
 * Jedes Urteil wird in `answer_verdicts` protokolliert. Ohne das war nicht
 * feststellbar, warum eine Antwort abgelehnt wurde.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-client.ts";
import {
  buildCheckPrompt,
  deterministicAnswerCheck,
  parseCheck,
  type AnswerCheck,
} from "../_shared/answer-check.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Protokolliert das Urteil. Fehler hierbei dürfen die Bewertung nie
 * beeinflussen — ein fehlgeschlagenes Protokoll ist ärgerlich, eine deswegen
 * abgelehnte richtige Antwort wäre schlimmer.
 */
async function recordVerdict(row: Record<string, unknown>): Promise<void> {
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return;
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.1');
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await sb.from('answer_verdicts').insert(row);
    if (error) console.warn('[validate-answer] Urteil nicht protokolliert:', error.message);
  } catch (err) {
    console.warn('[validate-answer] Urteil nicht protokolliert:', err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ accepted: false, reason: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.1');
      const sb = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
      const { data, error: authErr } = await sb.auth.getUser(authHeader.replace('Bearer ', ''));
      if (authErr || !data?.user) {
        return new Response(JSON.stringify({ accepted: false, reason: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const { question, correctAnswer, userAnswer, grade, subject } = await req.json();

    if (!question || !correctAnswer || !userAnswer ||
        String(question).length > 2000 || String(correctAnswer).length > 1000 || String(userAnswer).length > 1000) {
      return new Response(JSON.stringify({ accepted: false, reason: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const questionText = String(question);
    const stated = String(correctAnswer);
    const given = String(userAnswer);

    const respond = (check: AnswerCheck, model: string | null) => {
      console.log(
        `✅ validate-answer: "${given}" vs "${stated}" → ${check.verdict}` +
        ` (${check.accepted ? 'ACCEPTED' : 'REJECTED'}, via ${check.source})`,
      );
      // Protokoll im Hintergrund — die Antwort soll nicht darauf warten.
      const bg = recordVerdict({
        source: 'validate_answer',
        decided_by: check.source,
        verdict: check.verdict,
        accepted: check.accepted,
        model,
        grade: typeof grade === 'number' ? grade : null,
        subject: subject ? String(subject) : null,
        question_text: questionText,
        stated_answer: stated,
        user_answer: given,
        verified_correct_answer: check.verifiedCorrectAnswer,
        reason: check.reason,
      });
      (globalThis as unknown as { EdgeRuntime?: { waitUntil: (p: PromiseLike<unknown>) => void } })
        .EdgeRuntime?.waitUntil(bg);

      return new Response(JSON.stringify({
        accepted: check.accepted,
        reason: check.reason,
        verdict: check.verdict,
        // Nur gesetzt, wenn die hinterlegte Antwort widerlegt wurde. Das Spiel
        // darf dann nicht mehr die hinterlegte Antwort als "richtige
        // Schreibweise" anzeigen.
        statedAnswerWrong: check.verdict === 'user_correct',
        verifiedCorrectAnswer: check.verifiedCorrectAnswer,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    };

    // ── Stufe 1: nachrechnen ────────────────────────────────────────────────
    // Kostet nichts und ist dort, wo es greift, verlässlicher als jedes Modell.
    const deterministic = deterministicAnswerCheck(questionText, stated, given);
    if (deterministic) {
      return respond(deterministic, 'math-validator');
    }

    // ── Stufe 2: Modellurteil ───────────────────────────────────────────────
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const { response, model } = await callAI({
        model: 'google/gemini-3.1-flash-lite',
        messages: [{ role: 'user', content: buildCheckPrompt(questionText, stated, given, grade, subject) }],
        temperature: 0.1,
      }, controller.signal, 'validate_answer');

      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`AI error: ${response.status}`);
        return new Response(JSON.stringify({ accepted: false, reason: 'AI unavailable' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content || '';
      const check = parseCheck(content);

      if (!check) {
        // Nicht lesbares Urteil zählt nicht als Freispruch, wird aber
        // protokolliert — sonst bleibt unsichtbar, wie oft das passiert.
        const bg = recordVerdict({
          source: 'validate_answer',
          decided_by: 'unparsed',
          verdict: 'unclear',
          accepted: false,
          model,
          grade: typeof grade === 'number' ? grade : null,
          subject: subject ? String(subject) : null,
          question_text: questionText,
          stated_answer: stated,
          user_answer: given,
          verified_correct_answer: null,
          reason: content.substring(0, 300),
        });
        (globalThis as unknown as { EdgeRuntime?: { waitUntil: (p: PromiseLike<unknown>) => void } })
          .EdgeRuntime?.waitUntil(bg);

        return new Response(JSON.stringify({ accepted: false, reason: 'Parse error', verdict: 'unclear' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return respond(check, model);

    } catch (fetchErr) {
      clearTimeout(timeout);
      if ((fetchErr as Error).name === 'AbortError') {
        console.warn('validate-answer timed out');
      }
      return new Response(JSON.stringify({ accepted: false, reason: 'Timeout' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('validate-answer error:', error);
    return new Response(JSON.stringify({ accepted: false, reason: 'Server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
