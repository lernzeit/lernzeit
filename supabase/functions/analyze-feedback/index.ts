/**
 * Feedback-Analyse → Prompt-Regeln (neu 01.11.2026).
 *
 * - Antwortet sofort mit der Lauf-id und arbeitet im Hintergrund (EdgeRuntime.waitUntil).
 *   Der Stand steht in `feedback_analyse_laeufe`; das Admin-Panel fragt ihn ab und
 *   zeigt ihn auch nach Neuladen oder App-Wechsel.
 * - EIN KI-Aufruf je Lauf: bestehende Regeln + neues Feedback rein, bereinigtes
 *   Regelwerk raus (doppelte zusammengefasst, überflüssige weg, Obergrenzen).
 * - Feedback gilt erst als ausgewertet, wenn das Regelwerk gespeichert ist; bei einem
 *   Fehler bleibt alles unverändert.
 * - Von Hand bearbeitete Regeln (`manuell`) bleiben unangetastet.
 * - Aufruf: Admin (JWT) oder Service-Rolle (wöchentlicher Cron, nur ab 10 Meldungen).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-client.ts";
import {
  baueAnalysePrompt,
  type BestehendeRegel,
  type Feedback,
  gruppiere,
  MIN_FEEDBACK_FUER_LAUF,
  pruefeRegelwerk,
  REGEL_ARTEN,
  REGELWERK_TOOL,
} from "../_shared/regel-analyse.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const MAX_FEEDBACK_JE_LAUF = 400;
/** Ein laufender Lauf, der älter ist, gilt als abgebrochen. */
const LAUF_HAENGT_NACH_MS = 10 * 60 * 1000;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, serviceRoleKey);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Nicht authentifiziert' }, 401);
  const token = authHeader.replace('Bearer ', '');
  const istDienst = token === serviceRoleKey;
  if (!istDienst) {
    const anon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return json({ error: 'Nicht authentifiziert' }, 401);
    const { data: isAdmin } = await sb.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) return json({ error: 'Nur Admins' }, 403);
  }

  let ausloeser = istDienst ? 'cron' : 'admin';
  try {
    const body = await req.json();
    if (body && typeof body.ausloeser === 'string') ausloeser = body.ausloeser.slice(0, 20);
  } catch { /* leerer Body */ }

  // Läuft schon einer? Dann denselben zurückgeben statt doppelt zu starten.
  const { data: laufend } = await sb.from('feedback_analyse_laeufe')
    .select('id, gestartet_am').eq('status', 'laeuft')
    .order('gestartet_am', { ascending: false }).limit(1).maybeSingle();
  if (laufend) {
    if (Date.now() - new Date(laufend.gestartet_am).getTime() < LAUF_HAENGT_NACH_MS) {
      return json({ success: true, laufId: laufend.id, schonGestartet: true });
    }
    await sb.from('feedback_analyse_laeufe')
      .update({ status: 'fehler', beendet_am: new Date().toISOString(), meldung: 'Abgebrochen (Zeitüberschreitung)' })
      .eq('id', laufend.id);
  }

  const { data: lauf, error: laufErr } = await sb.from('feedback_analyse_laeufe')
    .insert({ ausloeser }).select('id').single();
  if (laufErr || !lauf) return json({ error: 'Lauf konnte nicht angelegt werden' }, 500);

  const arbeit = analysiere(sb, lauf.id, ausloeser === 'cron').catch(async (e) => {
    console.error('analyze-feedback:', e);
    await sb.from('feedback_analyse_laeufe').update({
      status: 'fehler', beendet_am: new Date().toISOString(), meldung: String(e?.message ?? e).slice(0, 300),
    }).eq('id', lauf.id);
  });
  const rt = (globalThis as unknown as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (rt) rt.waitUntil(arbeit); else await arbeit;

  return json({ success: true, laufId: lauf.id }, 202);
});

async function analysiere(sb: SupabaseClient, laufId: string, nurWennGenug: boolean) {
  const ende = (felder: Record<string, unknown>) =>
    sb.from('feedback_analyse_laeufe').update({ beendet_am: new Date().toISOString(), ...felder }).eq('id', laufId);

  const { data: fbDaten, error: fbErr } = await sb.from('question_feedback')
    .select('id, feedback_type, category, grade, question_content, question_type, feedback_details')
    .is('analyzed_at', null)
    .order('created_at', { ascending: true })
    .limit(MAX_FEEDBACK_JE_LAUF);
  if (fbErr) throw fbErr;
  const feedback = (fbDaten ?? []) as Feedback[];
  const auswertbar = feedback.filter((f) => REGEL_ARTEN.includes(f.feedback_type));

  const { data: regelDaten, error: rErr } = await sb.from('prompt_rules')
    .select('id, rule_text, subject, grade_min, grade_max, source_feedback_count, manuell')
    .eq('is_active', true);
  if (rErr) throw rErr;
  const bisher = (regelDaten ?? []) as BestehendeRegel[];

  if (nurWennGenug && auswertbar.length < MIN_FEEDBACK_FUER_LAUF) {
    await ende({ status: 'uebersprungen', feedback_anzahl: feedback.length, regeln_vorher: bisher.length, regeln_nachher: bisher.length,
      meldung: `Nur ${auswertbar.length} auswertbare Meldungen (ab ${MIN_FEEDBACK_FUER_LAUF})` });
    return;
  }

  // Ohne auswertbares Feedback nur dann die KI fragen, wenn es etwas aufzuräumen gibt.
  const gruppen = gruppiere(feedback);
  if (gruppen.length === 0 && bisher.filter((r) => !r.manuell).length === 0) {
    await markiereAusgewertet(sb, feedback.map((f) => f.id));
    await ende({ status: 'fertig', feedback_anzahl: feedback.length, regeln_vorher: bisher.length, regeln_nachher: bisher.length,
      meldung: 'Kein auswertbares Feedback' });
    return;
  }

  const { response } = await callAI({
    model: 'google/gemini-3.8-flash',
    messages: [{ role: 'user', content: baueAnalysePrompt(bisher, gruppen) }],
    temperature: 0.2,
    tools: [REGELWERK_TOOL],
    tool_choice: { type: 'function', function: { name: 'regelwerk_speichern' } },
    timeoutMs: 120_000,
  }, undefined, 'analyze_feedback');
  if (!response.ok) throw new Error(`KI-Fehler ${response.status}`);
  const result = await response.json();
  const args = result.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  let roh: unknown;
  try { roh = typeof args === 'string' ? JSON.parse(args) : args; } catch { roh = null; }
  if (!roh || !Array.isArray((roh as { regeln?: unknown }).regeln)) throw new Error('KI-Antwort ohne Regelwerk');

  const ziel = pruefeRegelwerk(roh, bisher);
  const auto = bisher.filter((r) => !r.manuell);
  const behalten = new Set(ziel.map((z) => z.id).filter(Boolean) as string[]);
  const jetzt = new Date().toISOString();
  const idsJeFach = new Map<string, string[]>();
  for (const g of gruppen) {
    const k = g.fach ?? '-';
    idsJeFach.set(k, [...(idsJeFach.get(k) ?? []), ...g.ids]);
  }
  let neu = 0, geaendert = 0, deaktiviert = 0;

  for (const z of ziel) {
    const belege = z.fach ? (idsJeFach.get(z.fach) ?? []) : [];
    if (z.id) {
      const alt = auto.find((r) => r.id === z.id)!;
      const anders = alt.rule_text !== z.text || alt.subject !== z.fach || alt.grade_min !== z.klasse_von || alt.grade_max !== z.klasse_bis;
      if (anders || belege.length) {
        const { error } = await sb.from('prompt_rules').update({
          rule_text: z.text, subject: z.fach, grade_min: z.klasse_von, grade_max: z.klasse_bis,
          source_feedback_count: (alt.source_feedback_count ?? 0) + belege.length,
        }).eq('id', z.id);
        if (error) throw error;
        if (anders) geaendert++;
      }
    } else {
      const { error } = await sb.from('prompt_rules').insert({
        rule_text: z.text, subject: z.fach, grade_min: z.klasse_von, grade_max: z.klasse_bis,
        source_feedback_ids: belege.slice(0, 200), source_feedback_count: Math.max(belege.length, 1),
      });
      if (error) throw error;
      neu++;
    }
  }
  for (const r of auto) {
    if (behalten.has(r.id)) continue;
    const { error } = await sb.from('prompt_rules').update({
      is_active: false, deactivated_at: jetzt, deaktiviert_grund: 'Bei der Feedback-Analyse zusammengefasst oder als überflüssig entfernt',
    }).eq('id', r.id);
    if (error) throw error;
    deaktiviert++;
  }

  await markiereAusgewertet(sb, feedback.map((f) => f.id));
  const nachher = bisher.length - deaktiviert + neu;
  await ende({ status: 'fertig', feedback_anzahl: feedback.length, regeln_vorher: bisher.length, regeln_nachher: nachher,
    neu, geaendert, deaktiviert,
    meldung: `${auswertbar.length} auswertbare von ${feedback.length} Meldungen` });
  console.log(`📋 Feedback-Analyse fertig: ${feedback.length} Meldungen, ${bisher.length} → ${nachher} Regeln (+${neu}, ~${geaendert}, -${deaktiviert})`);
}

async function markiereAusgewertet(sb: SupabaseClient, ids: string[]) {
  const jetzt = new Date().toISOString();
  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await sb.from('question_feedback').update({ analyzed_at: jetzt }).in('id', ids.slice(i, i + 100));
    if (error) throw error;
  }
}
