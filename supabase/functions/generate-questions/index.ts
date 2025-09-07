import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('OK', { headers: corsHeaders });
    }

    console.log('🎯 Starting question generation v4...');
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key missing');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { grade = 1, quarter = 'Q1', domain = 'Zahlen & Operationen', count = 2 } = body;
    
    console.log(`Generating ${count} questions for Grade ${grade}, ${quarter}, ${domain}`);

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Erstelle ${count} Mathematikaufgaben für ${grade}. Klasse als JSON:
[{"status":"ACTIVE","grade":${grade},"grade_app":${grade},"quarter_app":"${quarter}","domain":"${domain}","subcategory":"Addition","difficulty":"AFB I","question_type":"freetext","student_prompt":"Was ist 1 + 1?","variables":{},"solution":{"value":"2"},"unit":"","distractors":["1","3","4"],"explanation":"1 + 1 = 2","source_skill_id":"math_${grade}_${quarter}","tags":["addition"],"seed":12345}]`
        }],
        max_tokens: 1000,
        temperature: 0.5
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI error: ${openaiResponse.status}`);
    }

    const openaiResult = await openaiResponse.json();
    const content = openaiResult.choices[0].message.content;
    
    console.log('OpenAI response:', content.substring(0, 200));

    // Extract and parse JSON
    const jsonMatch = content.match(/\[.*\]/s);
    if (!jsonMatch) {
      throw new Error('No JSON found');
    }

    const questions = JSON.parse(jsonMatch[0]);
    console.log(`Parsed ${questions.length} questions`);

    // Insert into database
    let successful = 0;
    const results = [];

    for (const q of questions) {
      try {
        const template = {
          status: 'ACTIVE',
          grade: parseInt(grade),
          grade_app: parseInt(grade),
          quarter_app: quarter,
          domain: domain,
          subcategory: q.subcategory || 'Grundrechenarten',
          difficulty: 'AFB I',
          question_type: 'freetext',
          student_prompt: q.student_prompt || `Automatisch generierte Frage für ${grade}. Klasse`,
          variables: {},
          solution: q.solution || { value: '42' },
          unit: q.unit || '',
          distractors: q.distractors || [],
          explanation: q.explanation || 'Automatisch generiert',
          source_skill_id: `auto_${grade}_${quarter}`,
          tags: ['auto-generated', 'math'],
          seed: Math.floor(Math.random() * 1000000)
        };

        console.log(`Inserting: ${template.student_prompt}`);

        const { data, error } = await supabase
          .from('templates')
          .insert(template)
          .select('id')
          .single();

        if (error) {
          console.error('DB Error:', error);
          results.push({ success: false, error: error.message });
        } else {
          successful++;
          results.push({ success: true, id: data.id });
          console.log(`✅ Success! ID: ${data.id}`);
        }
      } catch (e) {
        console.error('Insert error:', e);
        results.push({ success: false, error: e.message });
      }
    }

    console.log(`Generated ${successful} out of ${count} questions`);

    return new Response(JSON.stringify({
      success: true,
      generated: successful,
      requested: count,
      results: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      generated: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});