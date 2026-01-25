import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const VALID_GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const VALID_DOMAINS = [
  'Zahlen & Operationen',
  'Raum & Form', 
  'Größen & Messen',
  'Daten & Zufall',
  'Muster & Strukturen',
  'Gleichungen & Funktionen'
] as const;

type ValidGrade = typeof VALID_GRADES[number];

// Validation helpers
function isValidGrade(val: unknown): val is ValidGrade {
  return typeof val === 'number' && VALID_GRADES.includes(val as ValidGrade);
}

function isValidDomain(val: unknown): boolean {
  return typeof val === 'string' && (VALID_DOMAINS.includes(val as typeof VALID_DOMAINS[number]) || val.length <= 100);
}

function isValidCount(val: unknown): boolean {
  return typeof val === 'number' && !isNaN(val) && val >= 1 && val <= 50;
}

// Sanitize error messages to prevent information leakage
function getSafeErrorMessage(error: Error): string {
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('api key') || message.includes('apikey') || message.includes('gemini')) {
    return 'Konfigurationsfehler. Bitte kontaktiere den Support.';
  }
  if (message.includes('database') || message.includes('sql') || message.includes('insert')) {
    return 'Datenbankfehler. Bitte versuche es später erneut.';
  }
  if (message.includes('parse') || message.includes('json')) {
    return 'Fehler bei der Template-Generierung. Bitte versuche es erneut.';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return 'Netzwerkfehler. Bitte prüfe deine Verbindung.';
  }
  if (message.includes('environment') || message.includes('env')) {
    return 'Serverkonfigurationsfehler. Bitte kontaktiere den Support.';
  }
  
  return 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!geminiApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response(JSON.stringify({
        success: false,
        error: 'Serverkonfigurationsfehler. Bitte kontaktiere den Support.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Ungültiges Anfrageformat' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (typeof requestBody !== 'object' || requestBody === null) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Ungültiges Anfrageformat' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = requestBody as Record<string, unknown>;

    // Validate and sanitize inputs with defaults
    const grade: ValidGrade = isValidGrade(body.grade) ? body.grade as ValidGrade : 1;
    const domain: string = isValidDomain(body.domain) ? String(body.domain).slice(0, 100) : "Zahlen & Operationen";
    const count: number = isValidCount(body.count) ? body.count as number : 5;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
      }),
    });

    if (!response.ok) {
      console.error('Gemini API Error:', response.status);
      return new Response(JSON.stringify({
        success: false,
        error: 'Fehler bei der Template-Generierung. Bitte versuche es erneut.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await response.json();
    const content = (aiResponse?.candidates?.[0]?.content?.parts || [])
      .map((p: any) => p.text || '')
      .join('');
    
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
        console.error('Could not extract valid JSON from AI response');
        return new Response(JSON.stringify({
          success: false,
          error: 'Fehler bei der Template-Generierung. Bitte versuche es erneut.'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (!Array.isArray(templates)) {
      console.error('AI response is not an array');
      return new Response(JSON.stringify({
        success: false,
        error: 'Fehler bei der Template-Generierung. Bitte versuche es erneut.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({
        success: false,
        error: 'Datenbankfehler. Templates konnten nicht gespeichert werden.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      error: getSafeErrorMessage(error as Error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});