import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuestionRequest {
  grade: number;
  quarter: string;
  domain: string;
  count?: number;
  difficulty?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { grade, quarter, domain, count = 5, difficulty = 'AFB I' }: QuestionRequest = await req.json();
    
    console.log(`🎯 Generating ${count} questions for Grade ${grade} ${quarter} ${domain} (${difficulty})`);

    // Get curriculum content from custom instructions based on grade/quarter/domain
    const curriculumMap = getCurriculumContent(grade, quarter, domain);
    
    if (!curriculumMap) {
      throw new Error(`No curriculum content found for Grade ${grade} ${quarter} ${domain}`);
    }

    const systemPrompt = `Du bist Experte für deutsche Schulaufgaben (${grade}. Klasse, ${quarter}, ${domain}).

CURRICULUM KONTEXT:
${curriculumMap}

SCHWIERIGKEITSGRAD: ${difficulty}
${difficulty === 'AFB I' ? '- Reproduktion: Direkte Anwendung gelernter Verfahren' : 
  difficulty === 'AFB II' ? '- Reorganisation: Zusammenhänge herstellen, übertragen' : 
  '- Reflexion: Begründen, bewerten, verallgemeinern'}

AUFGABEN-TYPEN (rotierend verwenden):
1. MULTIPLE_CHOICE: 4 Optionen, 1 richtig
2. FREETEXT: Offene Rechenantwort 
3. SORT: Items ordnen
4. MATCH: Zuordnungsaufgabe

ANTI-VISUAL REGEL: 
❌ KEINE Aufgaben mit: "zeichne", "male", "konstruiere", "welches Bild"
✅ NUR textbasierte/numerische Aufgaben

QUALITÄTSKRITERIEN:
- Altersgerecht für ${grade}. Klasse
- Lehrplan-konform
- Erklärung: 80-200 Zeichen, ermutigend, Schritt-für-Schritt
- Deutsche Sprache, keine Anglizismen`;

    const userPrompt = `Erstelle genau ${count} verschiedene Mathematikaufgaben als JSON-Array:

[
  {
    "grade": ${grade},
    "grade_app": ${grade},
    "quarter_app": "${quarter}",
    "domain": "${domain}",
    "subcategory": "[Spezifische Unterkategorie]",
    "difficulty": "${difficulty}",
    "question_type": "[multiple-choice|freetext|sort|match]",
    "student_prompt": "[Klare Aufgabenstellung ohne visuelle Elemente]",
    "variables": {},
    "solution": {"value": "[Exakte Antwort]"},
    "unit": "[Einheit falls nötig, sonst leer]",
    "distractors": ["[Falsche Antwort 1]", "[Falsche Antwort 2]", "[Falsche Antwort 3]"],
    "explanation": "[Schritt-für-Schritt Erklärung für Kinder, 80-200 Zeichen]",
    "source_skill_id": "curriculum_${grade}_${quarter}_${domain}",
    "tags": ["${domain.toLowerCase()}", "${quarter.toLowerCase()}"],
    "seed": [Zufallszahl 6-stellig]
  }
]

WICHTIG: Gib NUR das JSON-Array zurück, keine zusätzlichen Kommentare!`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const generatedContent = result.choices[0].message.content;
    
    // Parse JSON from response
    const jsonMatch = generatedContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in response');
    }

    const questions = JSON.parse(jsonMatch[0]);
    
    // Insert questions into templates table
    const insertPromises = questions.map(async (question: any) => {
      try {
        const { data, error } = await supabase
          .from('templates')
          .insert([question])
          .select('id')
          .single();

        if (error) throw error;
        return { success: true, id: data.id };
      } catch (error) {
        console.error('Insert error:', error);
        return { success: false, error: error.message };
      }
    });

    const insertResults = await Promise.all(insertPromises);
    const successful = insertResults.filter(r => r.success).length;

    console.log(`✅ Successfully generated and saved ${successful}/${count} questions`);

    return new Response(JSON.stringify({
      success: true,
      generated: successful,
      requested: count,
      questions: questions.length,
      insertResults: insertResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Question generation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Curriculum content mapping based on custom instructions
function getCurriculumContent(grade: number, quarter: string, domain: string): string | null {
  const curriculum: Record<string, Record<string, Record<string, string>>> = {
    "1": {
      "Q1": {
        "Zahlen & Operationen": "Zählen bis 10, Anzahlen vergleichen. Fingerübungen, Emoji-Zählung",
        "Größen & Messen": "Längen schätzen/vergleichen (unstandardisiert), erste Zeitbegriffe",
        "Raum & Form": "Kreis, Dreieck, Quadrat, Rechteck unterscheiden",
        "Daten & Zufall": "Einfache Strichlisten und Bilddiagramme"
      },
      "Q2": {
        "Zahlen & Operationen": "Zahlen bis 20 darstellen, ordnen",
        "Größen & Messen": "Uhr (volle/halbe Stunde), Münzen bis 2 €", 
        "Raum & Form": "rechts/links, oben/unten; Muster fortsetzen",
        "Daten & Zufall": "möglich – sicher – unmöglich"
      },
      "Q3": {
        "Zahlen & Operationen": "Zahlen bis 100 erkunden, Zehner/Einheiten",
        "Größen & Messen": "Messen mit Lineal; Einheiten cm/m",
        "Raum & Form": "Einfache Achsensymmetrien erkennen"
      },
      "Q4": {
        "Zahlen & Operationen": "Plus/Minus im ZR 100 mit Übergang, Grundideen für Multiplikation/Division",
        "Größen & Messen": "Kalender, Wochentage/Monate, einfache Zeitspannen",
        "Raum & Form": "Flächen legen, einfache Netze (Würfelbilder)"
      }
    }
    // ... weitere Grade würden hier folgen basierend auf custom instructions
  };

  return curriculum[grade.toString()]?.[quarter]?.[domain] || null;
}