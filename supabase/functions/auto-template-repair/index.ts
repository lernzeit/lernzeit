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

// Improved parser for Euro/Cost problems - detects multiplication vs addition errors
function computeExpectedEuro(prompt: string): { total: number | null; details: string[]; errorType?: string } {
  const p = prompt.replace(/\s+/g, ' ').trim().toLowerCase();
  const details: string[] = [];
  let total = 0;
  let matched = false;
  let errorType = '';

  // Extract all numbers from the prompt
  const numbers = [...p.matchAll(/(\d+(?:[.,]\d+)?)/g)].map(m => parseFloat(m[1].replace(',', '.')));
  
  // Case A: Multiplication patterns - "X Äpfel zu je Y €", "X Stück à Y €", "pro Y €"
  const multiplyPatterns = [
    /(\d+)\s+[^,.]*?(zu\s+je|jeweils|je|pro|à)\s*(\d+(?:[.,]\d+)?)\s*(€|euro)/gi,
    /(\d+)\s+[^,.]*?(kosten|kostet)\s+(\d+(?:[.,]\d+)?)\s*(€|euro)[^,.]*?(je|pro|stück)/gi
  ];
  
  for (const regex of multiplyPatterns) {
    for (const m of p.matchAll(regex)) {
      const qty = Number(m[1]);
      const price = Number(m[3].replace(',', '.'));
      if (!isNaN(qty) && !isNaN(price)) {
        total += qty * price;
        details.push(`${qty}×${price}€ = ${qty * price}€`);
        matched = true;
        
        // Check if current solution used addition instead of multiplication
        const wrongAddition = qty + price;
        if (numbers.includes(wrongAddition)) {
          errorType = `Addition statt Multiplikation: ${qty}+${price}=${wrongAddition}€ ist falsch, richtig: ${qty}×${price}=${qty * price}€`;
        }
      }
    }
  }

  // Case B: Addition patterns - "für insgesamt X €", "zusammen X €"
  const additionPatterns = [
    /(\d+)\s+[^,.]*?für\s*(insgesamt\s*)?(\d+(?:[.,]\d+)?)\s*(€|euro)/gi,
    /(\d+)\s+[^,.]*?(zusammen|gesamt|insgesamt)\s*(\d+(?:[.,]\d+)?)\s*(€|euro)/gi
  ];
  
  for (const regex of additionPatterns) {
    for (const m of p.matchAll(regex)) {
      const price = Number(m[3].replace(',', '.'));
      if (!isNaN(price)) {
        total += price;
        details.push(`Bundle: ${price}€`);
        matched = true;
      }
    }
  }

  // Case C: Shopping scenario - "X Äpfel ... Y €, Z Bananen ... W €" (multiple items)
  if (!matched) {
    const itemPattern = /(\d+)\s+(äpfel|bananen|birnen|stück|stücke)[^,.]*?(\d+)\s*(€|euro)/gi;
    const items = [...p.matchAll(itemPattern)];
    
    if (items.length >= 2) {
      let subtotal = 0;
      for (const item of items) {
        const qty = Number(item[1]);
        const price = Number(item[3]);
        if (!isNaN(qty) && !isNaN(price)) {
          subtotal += qty * price;
          details.push(`${qty}×${price}€ = ${qty * price}€`);
        }
      }
      if (subtotal > 0) {
        total = subtotal;
        matched = true;
      }
    }
  }

  // Case D: Single unit price question - "Ein Apfel kostet X €, wie viel kosten Y Äpfel?"
  if (!matched) {
    const unitPriceMatch = p.match(/(ein|eine)\s+[^,.]*(kostet|kosten)\s*(\d+(?:[.,]\d+)?)\s*(€|euro)/i);
    const questionMatch = p.match(/wie\s+viel.*?kosten\s*(\d+)/i) || p.match(/(\d+)\s*(äpfel|bananen|birnen)/i);
    
    if (unitPriceMatch && questionMatch) {
      const unitPrice = Number(unitPriceMatch[3].replace(',', '.'));
      const qty = Number(questionMatch[1]);
      
      if (!isNaN(unitPrice) && !isNaN(qty)) {
        total = unitPrice * qty;
        details.push(`${qty}×${unitPrice}€ = ${total}€`);
        matched = true;
        
        // Check for addition error
        const wrongAddition = unitPrice + qty;
        if (numbers.includes(wrongAddition)) {
          errorType = `Addition statt Multiplikation: ${unitPrice}+${qty}=${wrongAddition}€ ist falsch, richtig: ${qty}×${unitPrice}=${total}€`;
        }
      }
    }
  }

  return { total: matched ? total : null, details, errorType };
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

        // 1) Mathematics repair for Euro prompts with error detection
        const { total, details, errorType } = computeExpectedEuro(t.student_prompt || '');
        const currentVal = toNumber(t.solution);
        if (total != null && currentVal != null && Math.abs(total - currentVal) > 0.001) {
          updates.solution = { value: total };
          const sumStr = details.length > 0 ? `${details.join(' + ')} = ${total}€` : `${total}€`;
          let explanation = `Automatisch korrigiert: ${sumStr}`;
          
          // Add specific error explanation if detected
          if (errorType) {
            explanation += ` | Fehler erkannt: ${errorType}`;
          }
          
          updates.explanation = explanation;
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