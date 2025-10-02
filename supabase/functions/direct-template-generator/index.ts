import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { grade = 1, domain = "Zahlen & Operationen", count = 5 } = await req.json();

    console.log(`Generating ${count} templates for Grade ${grade}, Domain: ${domain}`);

    const prompt = `# CONTEXT
Du bist KI-Template-Generator für deutsche Grundschule. Erstelle ${count} verschiedene Mathe-Aufgaben.

# TASK
Erstelle genau ${count} Templates im JSON-Array Format:
[
  {
    "grade": ${grade},
    "domain": "${domain}",
    "subcategory": "...",
    "question_type": "MULTIPLE_CHOICE|FREETEXT|SORT|MATCHING",
    "student_prompt": "Klare, kindgerechte Aufgabe für Klasse ${grade}",
    "solution": {"value": "korrekte_antwort"},
    "explanation": "Kurze, liebevolle Erklärung für Kinder",
    "difficulty": "easy|medium|hard",
    "quarter_app": "Q1|Q2|Q3|Q4",
    "variables": {},
    "distractors": ["falsche_option1", "falsche_option2", "falsche_option3"],
    "quality_score": 0.95
  }
]

# GUIDELINES
- Alle Aufgaben für Klasse ${grade} geeignet
- Kinderfreundliche Sprache
- Präzise Lösungen
- Abwechslungsreiche Aufgabentypen
- Liefere NUR das JSON-Array, kein zusätzlicher Text`;

    console.log('Calling Gemini API...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.candidates[0].content.parts[0].text;
    
    console.log('Gemini Response received:', content.substring(0, 200) + '...');

    let templates;
    try {
      templates = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        templates = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not extract valid JSON from AI response');
      }
    }

    if (!Array.isArray(templates)) {
      throw new Error('AI response is not an array');
    }

    console.log(`Parsed ${templates.length} templates from AI response`);

    // Insert templates into database
    const insertData = templates.map(template => ({
      grade: template.grade,
      grade_app: template.grade,
      domain: template.domain,
      subcategory: template.subcategory || "Grundlagen",
      question_type: template.question_type,
      student_prompt: template.student_prompt,
      solution: template.solution,
      explanation: template.explanation,
      difficulty: template.difficulty,
      quarter_app: template.quarter_app || "Q1",
      variables: template.variables || {},
      distractors: template.distractors,
      quality_score: template.quality_score || 0.9,
      status: 'ACTIVE',
      tags: [domain],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    console.log('Inserting templates into database...');
    const { data, error } = await supabase
      .from('templates')
      .insert(insertData)
      .select('id, student_prompt');

    if (error) {
      console.error('Database insert error:', error);
      throw error;
    }

    console.log(`Successfully inserted ${data?.length || 0} templates`);

    return new Response(JSON.stringify({
      success: true,
      generated_count: templates.length,
      inserted_count: data?.length || 0,
      templates: data?.slice(0, 3) || [] // Show first 3 as preview
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Generation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});