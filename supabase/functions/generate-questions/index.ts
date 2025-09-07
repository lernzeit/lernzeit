import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 Starting question generation...');
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not found');
      throw new Error('OpenAI API key not configured');
    }
    console.log('✅ OpenAI API key found');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    console.log('✅ Supabase client created');

    const { grade, quarter, domain, count = 5, difficulty = 'AFB I' } = await req.json();
    console.log(`📝 Generating ${count} questions for Grade ${grade} ${quarter} ${domain} (${difficulty})`);

    // Simplified curriculum content
    const systemPrompt = `Du bist Experte für deutsche Schulaufgaben (${grade}. Klasse, ${quarter}, ${domain}).

Erstelle Mathematikaufgaben für Grundschüler mit folgenden Eigenschaften:
- Altersgerecht für ${grade}. Klasse
- Domain: ${domain}
- Schwierigkeitsgrad: ${difficulty}
- Nur textbasierte Aufgaben (keine Bilder/Zeichnungen)
- Mit korrekten Lösungen und kindgerechten Erklärungen`;

    const userPrompt = `Erstelle genau ${count} verschiedene Mathematikaufgaben als JSON-Array. 
    
Beispiel-Format:
[
  {
    "grade": ${grade},
    "grade_app": ${grade},
    "quarter_app": "${quarter}",
    "domain": "${domain}",
    "subcategory": "Grundrechenarten",
    "difficulty": "${difficulty}",
    "question_type": "freetext",
    "student_prompt": "Berechne: 3 + 4 = ?",
    "variables": {},
    "solution": {"value": "7"},
    "unit": "",
    "distractors": ["5", "6", "8"],
    "explanation": "3 + 4: Zähle 3 und dann 4 dazu. Das ergibt 7.",
    "source_skill_id": "math_${grade}_${quarter}",
    "tags": ["addition"],
    "seed": 123456
  }
]

Gib NUR das JSON-Array zurück, keine anderen Texte!`;

    console.log('🤖 Calling OpenAI API...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    console.log('📡 OpenAI API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API Error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    console.log('✅ OpenAI API responded successfully');
    const result = await response.json();
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      console.error('❌ Unexpected OpenAI response structure:', result);
      throw new Error('Invalid OpenAI response structure');
    }
    
    const generatedContent = result.choices[0].message.content;
    console.log('📄 Generated content preview:', generatedContent.substring(0, 200) + '...');
    
    // Parse JSON from response
    const jsonMatch = generatedContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('❌ No valid JSON found in response. Content:', generatedContent);
      throw new Error('No valid JSON array found in response');
    }

    let questions;
    try {
      questions = JSON.parse(jsonMatch[0]);
      console.log(`✅ Parsed ${questions.length} questions`);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      console.error('❌ JSON content:', jsonMatch[0]);
      throw new Error(`JSON parse failed: ${parseError.message}`);
    }
    
    // Insert questions into templates table
    let successful = 0;
    const insertResults = [];
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      try {
        console.log(`📥 Inserting question ${i+1}/${questions.length}:`, question.student_prompt?.substring(0, 50) + '...');
        
        const { data, error } = await supabase
          .from('templates')
          .insert([question])
          .select('id')
          .single();

        if (error) {
          console.error(`❌ Insert error for question ${i+1}:`, error);
          throw error;
        }
        
        successful++;
        insertResults.push({ success: true, id: data.id });
        console.log(`✅ Inserted question ${successful}/${questions.length} with ID: ${data.id}`);
      } catch (error) {
        console.error(`❌ Insert error for question ${i+1}:`, error.message);
        insertResults.push({ success: false, error: error.message });
      }
    }

    console.log(`🎉 Successfully generated and saved ${successful}/${count} questions`);

    return new Response(JSON.stringify({
      success: successful > 0,
      generated: successful,
      requested: count,
      questions: questions.length,
      insertResults: insertResults,
      message: `Generated ${successful} out of ${questions.length} questions successfully`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Question generation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      generated: 0,
      message: `Generation failed: ${error.message}`
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});