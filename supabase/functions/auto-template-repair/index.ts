import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TemplateRow = {
  id: string;
  student_prompt: string;
  domain: string | null;
  subcategory: string | null;
  question_type: string | null;
  solution: any;
  distractors: any;
  explanation: string | null;
};

function toNumber(val: any): number | null {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = Number(val.replace(/[^0-9.,-]/g, '').replace(',', '.'));
    return isNaN(n) ? null : n;
  }
  if (typeof val === 'object' && 'value' in val) return toNumber((val as any).value);
  return null;
}

// Insert commas/spaces between concatenated capitalized words: "BananenÄpfelBirnen" -> "Bananen, Äpfel, Birnen"
function fixMissingSeparators(text: string): string {
  if (!text) return text;
  if (text.includes(',') || text.includes('·') || /\s/.test(text)) return text; // probably already separated
  // add comma+space before every capital letter, except at start
  const withCommas = text.replace(/([a-zäöüß])([A-ZÄÖÜ])/g, '$1, $2');
  // If still no commas were added (e.g., all lowercase), fallback to nothing
  return withCommas;
}

// Heuristic parser for Euro/Cost problems
function computeExpectedEuro(prompt: string): { total: number | null; details: string[] } {
  const p = prompt.replace(/\s+/g, ' ').trim();
  const details: string[] = [];
  let total = 0;
  let matched = false;

  // Case A: pairs like "3 Äpfel, die jeweils 2 € kosten" or "3 Äpfel zu je 2 €" or "pro 2 €"
  const regexEach = /(\d+)\s+[^,.]*?(jeweils|je|pro)\s*(\d+)\s*(€|euro)/gi;
  for (const m of p.matchAll(regexEach)) {
    const qty = Number(m[1]);
    const price = Number(m[3]);
    if (!isNaN(qty) && !isNaN(price)) {
      total += qty * price;
      details.push(`${qty}×${price}€ = ${qty * price}€`);
      matched = true;
    }
  }

  // Case B: bundles like "3 Äpfel für 2 €" (means together 2€)
  const regexBundle = /(\d+)\s+[^,.]*?für\s*(\d+)\s*(€|euro)/gi;
  for (const m of p.matchAll(regexBundle)) {
    const price = Number(m[2]);
    if (!isNaN(price)) {
      total += price;
      details.push(`Bundle: ${price}€`);
      matched = true;
    }
  }

  // Case C: unit price then quantity later: "Ein Apfel kostet 2 Euro, wie viel kosten 5 Äpfel?"
  // Take the first standalone price and multiply by the last quantity
  if (!matched) {
    const priceMatch = p.match(/(\d+)\s*(€|euro)/i);
    const qtyMatch = p.match(/kosten\s*(\d+)\s*[^,.]*?\?$/i) || p.match(/wie\s+viel\s+kosten\s*(\d+)/i);
    const qtyAlt = p.match(/(\d+)\s*Äpfel|Bananen|Birnen|Stücke|Stück/gi);
    const price = priceMatch ? Number(priceMatch[1]) : null;
    let qty: number | null = null;
    if (qtyMatch) {
      qty = Number((qtyMatch[1] || '').replace(/[^0-9]/g, ''));
    } else if (qtyAlt && qtyAlt.length > 0) {
      const last = qtyAlt[qtyAlt.length - 1].match(/(\d+)/);
      qty = last ? Number(last[1]) : null;
    }
    if (price != null && qty != null && !isNaN(price) && !isNaN(qty)) {
      total = price * qty;
      details.push(`${qty}×${price}€ = ${total}€`);
      matched = true;
    }
  }

  return { total: matched ? total : null, details };
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { limit = 1000 } = (await req.json().catch(() => ({}))) as { limit?: number };

    // Fetch candidate templates
    const { data: templates, error } = await supabaseClient
      .from('templates')
      .select('id, student_prompt, domain, subcategory, question_type, solution, distractors, explanation')
      .eq('status', 'ACTIVE')
      .or('student_prompt.ilike.%€%,student_prompt.ilike.%Euro%')
      .limit(limit);

    if (error) throw error;

    let mathFixed = 0;
    let sepFixed = 0;
    const updatedIds: string[] = [];

    if (templates && templates.length > 0) {
      for (const t of templates as TemplateRow[]) {
        const updates: Partial<TemplateRow> & { solution?: any; distractors?: any } = {};

        // 1) Mathematics repair for Euro prompts
        const { total, details } = computeExpectedEuro(t.student_prompt || '');
        const currentVal = toNumber(t.solution);
        if (total != null && currentVal != null && Math.abs(total - currentVal) > 0.001) {
          updates.solution = { value: total };
          const sumStr = details.length > 0 ? `${details.join(' + ')} = ${total}€` : `${total}€`;
          updates.explanation = `Automatisch korrigiert: ${sumStr}`;
          mathFixed++;
        }

        // 2) MC separators fix in distractors/solution when they are strings
        const fixStr = (s: any) => (typeof s === 'string' ? fixMissingSeparators(s) : s);

        if (Array.isArray(t.distractors)) {
          const newDistractors = t.distractors.map((d: any) => fixStr(d));
          // count changes
          const changed = JSON.stringify(newDistractors) !== JSON.stringify(t.distractors);
          if (changed) {
            updates.distractors = newDistractors;
            sepFixed++;
          }
        }
        // sometimes the correct option is also a string list
        if (typeof t.solution === 'string') {
          const fixed = fixStr(t.solution);
          if (fixed !== t.solution) {
            updates.solution = { value: fixed };
            sepFixed++;
          }
        }

        if (Object.keys(updates).length > 0) {
          const { error: upErr } = await supabaseClient
            .from('templates')
            .update({
              ...('solution' in updates ? { solution: updates.solution } : {}),
              ...('distractors' in updates ? { distractors: updates.distractors } : {}),
              ...('explanation' in updates ? { explanation: updates.explanation } : {}),
              last_validated: new Date().toISOString(),
              validation_status: 'auto_fixed'
            })
            .eq('id', t.id);

          if (!upErr) updatedIds.push(t.id);
          else console.warn('Update failed for', t.id, upErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: templates?.length || 0,
        mathFixed,
        sepFixed,
        updatedIds,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (err: any) {
    console.error('❌ auto-template-repair error', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});