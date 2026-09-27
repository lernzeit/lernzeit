/**
 * Modellvergleich fuer den Vorrat-Generator.
 *
 * Frage des Betreibers (27.09.2026): Welches Modell schreibt die besten
 * Fragen zu vertretbaren Kosten? Die Fragen sind der Produktkern, und der
 * Vorrat wird von allen Kindern geteilt — die Kosten haengen an der Zahl der
 * Fragen, nicht der Nutzer. Ranglisten messen nicht „deutsche, lehrplantreue
 * Aufgaben fuer Klasse 1–10", also wird mit dem echten Prompt verglichen.
 *
 * Ablauf (jeweils POST mit Service-Role-Bearer):
 *
 *   {"aktion":"modelle","suche":["gemini","claude"]}
 *       Listet passende Modell-IDs samt Preis bei OpenRouter.
 *
 *   {"aktion":"erzeugen","lauf":"v1","modelle":[{"id":"…","denken":"medium"}]}
 *       Erzeugt fuer jede der 30 Vorgaben (SLOTS) je Modell eine Frage, mit
 *       exakt dem Prompt aus _shared/prefill-prompt.ts. Macht dort weiter, wo
 *       der letzte Aufruf aufgehoert hat; bricht vor dem Zeitlimit sauber ab.
 *       Also so oft aufrufen, bis "offen": 0.
 *
 *   {"aktion":"pruefen","lauf":"v1"}
 *       Bewertet alle gueltigen Fragen mit der Qualitaetspruefung der
 *       Produktion (erst Rechen-Check, dann das Pruefmodell).
 *
 * Alle Modelle laufen ueber OpenRouter, auch Gemini: So stammen die Kosten
 * aus derselben Quelle (usage.cost) und die Bedingungen sind gleich.
 * Die Fragen landen in `modell_vergleich`, nicht im Fragen-Cache.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { callAI } from '../_shared/ai-client.ts';
import {
  buildQuestionPrompt,
  buildSystemPrompt,
  loadRulesBlock,
  parseAndValidate,
} from '../_shared/prefill-prompt.ts';
import type { QuestionCategory } from '../_shared/question-prompt.ts';
import {
  buildSystemPrompt as pruefSystemPrompt,
  buildUserPrompt as pruefUserPrompt,
  deterministicVerdict,
  parseVerdict,
  type CachedQuestion,
} from '../_shared/quality-verdict.ts';
import { makeDeadline } from '../_shared/job-budget.ts';

const OPENROUTER = 'https://openrouter.ai/api/v1';
const PARALLEL = 6;
const ERZEUGEN_TIMEOUT_MS = 100_000;

interface Slot {
  grade: number;
  subject: string;
  type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: QuestionCategory;
}

/**
 * 30 feste Vorgaben: jede Klasse dreimal, alle Faecher, alle Fragetypen,
 * alle Schwierigkeiten, Theoriefragen in Mathe, Physik und Chemie.
 * Nicht aendern, solange ein Lauf laeuft — die Nummer ist der Schluessel.
 */
export const SLOTS: Slot[] = [
  { grade: 1, subject: 'math', type: 'FREETEXT', difficulty: 'easy', category: 'calculation' },
  { grade: 1, subject: 'german', type: 'MULTIPLE_CHOICE', difficulty: 'easy', category: 'calculation' },
  { grade: 1, subject: 'science', type: 'MATCH', difficulty: 'medium', category: 'calculation' },
  { grade: 2, subject: 'math', type: 'SORT', difficulty: 'medium', category: 'calculation' },
  { grade: 2, subject: 'german', type: 'FILL_BLANK', difficulty: 'medium', category: 'calculation' },
  { grade: 2, subject: 'science', type: 'MULTIPLE_CHOICE', difficulty: 'easy', category: 'calculation' },
  { grade: 3, subject: 'math', type: 'FILL_BLANK', difficulty: 'medium', category: 'calculation' },
  { grade: 3, subject: 'german', type: 'FREETEXT', difficulty: 'medium', category: 'calculation' },
  { grade: 3, subject: 'math', type: 'MULTIPLE_CHOICE', difficulty: 'hard', category: 'theory' },
  { grade: 4, subject: 'math', type: 'FREETEXT', difficulty: 'hard', category: 'calculation' },
  { grade: 4, subject: 'german', type: 'SORT', difficulty: 'medium', category: 'calculation' },
  { grade: 4, subject: 'science', type: 'FILL_BLANK', difficulty: 'medium', category: 'calculation' },
  { grade: 5, subject: 'english', type: 'FILL_BLANK', difficulty: 'easy', category: 'calculation' },
  { grade: 5, subject: 'math', type: 'MULTIPLE_CHOICE', difficulty: 'medium', category: 'theory' },
  { grade: 5, subject: 'geography', type: 'MATCH', difficulty: 'medium', category: 'calculation' },
  { grade: 6, subject: 'math', type: 'FREETEXT', difficulty: 'medium', category: 'calculation' },
  { grade: 6, subject: 'history', type: 'SORT', difficulty: 'medium', category: 'calculation' },
  { grade: 6, subject: 'biology', type: 'MULTIPLE_CHOICE', difficulty: 'medium', category: 'calculation' },
  { grade: 7, subject: 'english', type: 'MULTIPLE_CHOICE', difficulty: 'medium', category: 'calculation' },
  { grade: 7, subject: 'physics', type: 'FREETEXT', difficulty: 'medium', category: 'calculation' },
  { grade: 7, subject: 'latin', type: 'FILL_BLANK', difficulty: 'medium', category: 'calculation' },
  { grade: 8, subject: 'math', type: 'FILL_BLANK', difficulty: 'hard', category: 'calculation' },
  { grade: 8, subject: 'chemistry', type: 'MATCH', difficulty: 'medium', category: 'theory' },
  { grade: 8, subject: 'german', type: 'MULTIPLE_CHOICE', difficulty: 'hard', category: 'calculation' },
  { grade: 9, subject: 'physics', type: 'MULTIPLE_CHOICE', difficulty: 'hard', category: 'theory' },
  { grade: 9, subject: 'history', type: 'FREETEXT', difficulty: 'medium', category: 'calculation' },
  { grade: 9, subject: 'biology', type: 'FILL_BLANK', difficulty: 'medium', category: 'calculation' },
  { grade: 10, subject: 'math', type: 'MULTIPLE_CHOICE', difficulty: 'hard', category: 'theory' },
  { grade: 10, subject: 'chemistry', type: 'FREETEXT', difficulty: 'hard', category: 'calculation' },
  { grade: 10, subject: 'english', type: 'MATCH', difficulty: 'hard', category: 'calculation' },
];

interface ModellWahl {
  id: string;
  /** Denkstufe fuer OpenRouter; "aus" schaltet das Denken ab, wo moeglich. */
  denken?: 'aus' | 'low' | 'medium' | 'high';
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function openRouterKey(): string {
  const key = Deno.env.get('OPENROUTER_API_KEY');
  if (!key) throw new Error('OPENROUTER_API_KEY fehlt');
  return key;
}

async function modelle(suche: string[]): Promise<unknown> {
  const res = await fetch(`${OPENROUTER}/models`, { headers: { Authorization: `Bearer ${openRouterKey()}` } });
  const data = await res.json();
  const muster = suche.map((s) => s.toLowerCase());
  return (data?.data ?? [])
    .filter((m: { id: string }) => muster.some((s) => m.id.toLowerCase().includes(s)))
    .map((m: { id: string; pricing?: Record<string, string>; context_length?: number }) => ({
      id: m.id,
      eingabe_je_mio: m.pricing?.prompt ? Number(m.pricing.prompt) * 1e6 : null,
      ausgabe_je_mio: m.pricing?.completion ? Number(m.pricing.completion) * 1e6 : null,
    }));
}

/**
 * Bereits vorhandene Fragen der Kombination — wie im Vorrat-Generator als
 * „erstelle etwas anderes" angehaengt. Feste Auswahl (aelteste acht), damit
 * jedes Modell denselben Prompt bekommt.
 */
async function ausschluss(client: ReturnType<typeof createClient>, grade: number, subject: string): Promise<string[]> {
  const { data } = await client
    .from('ai_question_cache')
    .select('question_text')
    .eq('grade', grade)
    .eq('subject', subject)
    .order('created_at', { ascending: true })
    .limit(8);
  return (data ?? []).map((r: { question_text: string }) => r.question_text);
}

async function erzeugeEine(
  modell: ModellWahl,
  systemPrompt: string,
  userPrompt: string,
): Promise<Record<string, unknown>> {
  const body: Record<string, unknown> = {
    model: modell.id,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 8000,
    usage: { include: true },
    provider: { data_collection: 'deny' },
  };
  // Gemini 3 laeuft in der Produktion mit Standardtemperatur (ai-client.ts),
  // Claude-Modelle mit Denken lehnen eigene Temperaturen ab. Nur die uebrigen
  // bekommen die 0.75 des Vorrat-Generators.
  if (!/^google\/gemini-3|^anthropic\//.test(modell.id)) body.temperature = 0.75;
  if (modell.denken === 'aus') body.reasoning = { enabled: false };
  else if (modell.denken) body.reasoning = { effort: modell.denken };

  const start = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ERZEUGEN_TIMEOUT_MS);
  try {
    const res = await fetch(`${OPENROUTER}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${openRouterKey()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    // Erst nach dem vollstaendigen Text messen: OpenRouter schickt die Header
    // sofort und haelt die Verbindung offen, bis das Modell fertig ist.
    const text = await res.text();
    const dauer = Date.now() - start;
    if (!res.ok) return { fehler: `HTTP ${res.status}: ${text.substring(0, 400)}`, dauer_ms: dauer };
    const data = JSON.parse(text);
    const u = data?.usage ?? {};
    return {
      roh: data?.choices?.[0]?.message?.content ?? null,
      prompt_tokens: u.prompt_tokens ?? null,
      completion_tokens: u.completion_tokens ?? null,
      reasoning_tokens: u.completion_tokens_details?.reasoning_tokens ?? null,
      kosten_usd: typeof u.cost === 'number' ? u.cost : null,
      anbieter: data?.provider ?? null,
      dauer_ms: dauer,
    };
  } catch (err) {
    return { fehler: err instanceof Error ? err.message : String(err), dauer_ms: Date.now() - start };
  } finally {
    clearTimeout(timer);
  }
}

async function erzeugen(client: ReturnType<typeof createClient>, lauf: string, modelle: ModellWahl[]) {
  const withinDeadline = makeDeadline(110_000);
  const { data: vorhanden } = await client.from('modell_vergleich').select('slot, modell').eq('lauf', lauf);
  const erledigt = new Set((vorhanden ?? []).map((r: { slot: number; modell: string }) => `${r.slot}|${r.modell}`));

  const offen: { slot: number; modell: ModellWahl }[] = [];
  SLOTS.forEach((_, slot) => modelle.forEach((m) => {
    if (!erledigt.has(`${slot}|${m.id}`)) offen.push({ slot, modell: m });
  }));

  const { block: rulesBlock } = await loadRulesBlock(client);
  const ausschlussCache = new Map<string, string[]>();
  let fertig = 0;

  const arbeite = async () => {
    while (offen.length > 0 && withinDeadline()) {
      const auftrag = offen.shift()!;
      const s = SLOTS[auftrag.slot];
      const key = `${s.grade}-${s.subject}`;
      if (!ausschlussCache.has(key)) ausschlussCache.set(key, await ausschluss(client, s.grade, s.subject));
      const vorhandeneFragen = ausschlussCache.get(key)!;

      // Exakt wie cache-prefill: System-Prompt + Regeln, Nutzer-Prompt + Ausschlussliste.
      const systemPrompt = buildSystemPrompt(s.category, s.subject) + rulesBlock;
      let userPrompt = buildQuestionPrompt(s.grade, s.subject, s.difficulty, s.type, s.category);
      if (vorhandeneFragen.length > 0) {
        userPrompt += `\n\nWICHTIG – Diese Fragen existieren bereits. Erstelle eine VÖLLIG ANDERE Frage:\n${vorhandeneFragen.map((t) => `- "${t.substring(0, 60)}"`).join('\n')}`;
      }

      const ergebnis = await erzeugeEine(auftrag.modell, systemPrompt, userPrompt);
      const frage = typeof ergebnis.roh === 'string'
        ? parseAndValidate(ergebnis.roh, s.grade, s.subject, s.difficulty)
        : null;

      await client.from('modell_vergleich').upsert({
        lauf,
        slot: auftrag.slot,
        modell: auftrag.modell.id,
        grade: s.grade,
        subject: s.subject,
        question_type: s.type,
        difficulty: s.difficulty,
        category: s.category,
        user_prompt: userPrompt,
        ...ergebnis,
        frage,
        gueltig: frage !== null,
        fehler: ergebnis.fehler ?? (frage === null && ergebnis.roh ? 'Formatpruefung des Vorrat-Generators nicht bestanden' : null),
      }, { onConflict: 'lauf,slot,modell' });
      fertig++;
    }
  };

  await Promise.all(Array.from({ length: PARALLEL }, arbeite));
  return { fertig, offen: offen.length };
}

async function pruefen(client: ReturnType<typeof createClient>, lauf: string) {
  const withinDeadline = makeDeadline(110_000);
  const { data: zeilen } = await client
    .from('modell_vergleich')
    .select('id, frage, category')
    .eq('lauf', lauf)
    .eq('gueltig', true)
    .is('pruef_ok', null);

  const offen = [...(zeilen ?? [])];
  let geprueft = 0;

  const arbeite = async () => {
    while (offen.length > 0 && withinDeadline()) {
      const z = offen.shift()!;
      const f = z.frage as Record<string, unknown>;
      // Wie in der Produktion (cache-quality-check) wird question_text geprueft.
      const q: CachedQuestion = {
        id: z.id,
        grade: f.grade as number,
        subject: f.subject as string,
        question_text: f.question_text as string,
        question_type: f.question_type as string,
        category: z.category,
        correct_answer: f.correct_answer,
        options: f.options,
        task: f.task,
      };
      let urteil = deterministicVerdict(q);
      if (!urteil) {
        try {
          // Eigener use_case: Kosten erscheinen getrennt in ai_model_metrics,
          // das Tagesbudget der echten Qualitaetspruefung bleibt unberuehrt.
          const { response, model } = await callAI({
            model: 'google/gemini-3.1-flash-lite',
            messages: [
              { role: 'system', content: pruefSystemPrompt() },
              { role: 'user', content: pruefUserPrompt(q) },
            ],
            temperature: 0.1,
            timeoutMs: 60_000,
          }, undefined, 'modell_vergleich');
          if (response.ok) {
            const text = (await response.json())?.choices?.[0]?.message?.content ?? '';
            urteil = parseVerdict(text, model);
          }
        } catch (err) {
          console.warn('[modell-vergleich] Pruefung fehlgeschlagen:', err);
        }
      }
      if (!urteil) continue;
      await client.from('modell_vergleich').update({
        pruef_ok: urteil.ok,
        pruef_grund: urteil.ok ? null : urteil.issues,
        pruef_modell: urteil.model,
      }).eq('id', z.id);
      geprueft++;
    }
  };

  await Promise.all(Array.from({ length: PARALLEL }, arbeite));
  return { geprueft, offen: offen.length };
}

Deno.serve(async (req) => {
  const bearer = req.headers.get('Authorization')?.replace('Bearer ', '');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey || bearer !== serviceKey) return json({ error: 'Unauthorized' }, 401);

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const client = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey, { auth: { persistSession: false } });

  try {
    switch (body.aktion) {
      case 'modelle':
        return json(await modelle((body.suche as string[]) ?? []));
      case 'erzeugen': {
        const lauf = String(body.lauf ?? '');
        const gewaehlt = (body.modelle as ModellWahl[]) ?? [];
        if (!lauf || gewaehlt.length === 0) return json({ error: 'lauf und modelle angeben' }, 400);
        return json(await erzeugen(client, lauf, gewaehlt));
      }
      case 'pruefen': {
        const lauf = String(body.lauf ?? '');
        if (!lauf) return json({ error: 'lauf angeben' }, 400);
        return json(await pruefen(client, lauf));
      }
      default:
        return json({ error: 'aktion: modelle | erzeugen | pruefen' }, 400);
    }
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
