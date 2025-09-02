import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TemplateRequest {
  grade: number;
  domain: string;
  quarter: string;
  count?: number;
  difficulty?: 'AFB I' | 'AFB II' | 'AFB III';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { grade, domain, quarter, count = 50, difficulty = 'AFB I' }: TemplateRequest = await req.json();
    
    console.log(`🎯 PHASE 2: Generating ${count} templates for Grade ${grade}, Domain: ${domain}, Quarter: ${quarter}`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check current template count for this grade/domain
    const { data: existing } = await supabase
      .from('templates')
      .select('id')
      .eq('grade', grade)
      .eq('domain', domain)
      .eq('status', 'ACTIVE');
    
    const existingCount = existing?.length || 0;
    const needed = Math.max(0, 200 - existingCount); // Target: 200 templates per grade/domain
    
    if (needed === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: `Grade ${grade} ${domain} already has sufficient templates (${existingCount})`,
        generated: 0
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    console.log(`📊 Need ${needed} more templates for Grade ${grade} ${domain} (currently: ${existingCount})`);
    
    // Generate templates using Gemini API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    
    const prompt = await buildMathPrompt(grade, domain, quarter, difficulty, Math.min(needed, count));
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
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
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('No content generated from Gemini API');
    }
    
    // Parse generated templates
    let templates;
    try {
      // Extract JSON from potential markdown blocks
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      const jsonText = jsonMatch ? jsonMatch[0] : generatedText;
      templates = JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse generated templates:', e);
      throw new Error('Failed to parse generated templates');
    }
    
    if (!Array.isArray(templates)) {
      throw new Error('Generated content is not an array');
    }
    
    // Insert templates into database
    const insertedTemplates = [];
    for (const template of templates.slice(0, needed)) {
      // Generate AI explanation if none provided
      let finalExplanation = template.explanation || '';
      if (!finalExplanation && template.student_prompt && template.solution?.value) {
        try {
          const explanationResponse = await supabase.functions.invoke('explain-answer', {
            body: {
              question: template.student_prompt,
              answer: template.solution.value,
              grade: grade,
              subject: 'mathematik'
            }
          });
          
          if (explanationResponse.data?.explanation) {
            finalExplanation = explanationResponse.data.explanation;
            console.log(`✅ Generated AI explanation for template: ${finalExplanation.substring(0, 50)}...`);
          }
        } catch (explainError) {
          console.log('Could not generate AI explanation:', explainError);
          finalExplanation = `Das Ergebnis ist ${template.solution.value}. Rechne Schritt für Schritt und kontrolliere dein Ergebnis!`;
        }
      }

      const templateData = {
        grade: template.grade || grade,
        domain: template.domain || domain,
        subcategory: template.subcategory || 'Allgemein',
        difficulty: template.difficulty || difficulty,
        question_type: template.question_type || 'multiple-choice',
        student_prompt: template.student_prompt,
        solution: template.solution || { value: template.answer || 1 },
        distractors: template.distractors || [],
        variables: template.variables || {},
        explanation: finalExplanation,
        tags: template.tags || [],
        quarter_app: template.quarter_app || quarter,
        grade_app: template.grade_app || grade,
        status: 'ACTIVE',
        unit: template.unit || '',
        source_skill_id: `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      const { data, error } = await supabase
        .from('templates')
        .insert(templateData)
        .select()
        .single();
      
      if (error) {
        console.error('Insert error:', error);
      } else {
        insertedTemplates.push(data);
      }
    }
    
    console.log(`✅ Generated ${insertedTemplates.length} new templates for Grade ${grade} ${domain}`);
    
    return new Response(JSON.stringify({
      success: true,
      generated: insertedTemplates.length,
      total_now: existingCount + insertedTemplates.length,
      grade,
      domain,
      quarter
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    
  } catch (error) {
    console.error('Template generation error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function buildMathPrompt(grade: number, domain: string, quarter: string, difficulty: string, count: number): Promise<string> {
  const curriculumInfo = await getCurriculumInfo(grade, domain, quarter);
  
  return `Du bist ein Experte für deutsche Mathematik-Lehrpläne und mathematische Korrektheit. Erstelle ${count} MATHEMATISCH KORREKTE Aufgaben im JSON-Format.

**KRITISCHE VORGABE: MATHEMATISCHE KORREKTHEIT**
- JEDE Lösung MUSS mathematisch exakt sein
- Deutsche Dezimalzahlen: Komma statt Punkt (3,75 nicht 3.75)
- Brüche in korrekter Form: "7/6" oder "1 1/6"
- Bei Textaufgaben: Lösung MUSS zur Fragestellung passen
- "Subtrahiere A von B" bedeutet B - A (NICHT A + B!)

**Vorgaben:**
- Klassenstufe: ${grade}
- Domain: ${domain}
- Quartal: ${quarter}
- Schwierigkeitsgrad: ${difficulty}

**Curriculum-Kontext:**
${curriculumInfo}

**JSON-Format (Array von Objekten):**
[
  {
    "grade": ${grade},
    "domain": "${domain}",
    "subcategory": "Spezifische Unterkategorie",
    "difficulty": "${difficulty}",
    "question_type": "multiple-choice|text-input",
    "student_prompt": "Mathematisch präzise Fragestellung",
    "solution": {"value": "EXAKT KORREKTE ANTWORT"},
    "distractors": ["Mathematisch plausible falsche Antwort 1", "Falsche Antwort 2", "Falsche Antwort 3"],
    "variables": {},
    "explanation": "Um diese Aufgabe zu lösen, [präziser Rechenweg]. Das Ergebnis ist [korrekte Antwort], weil [mathematische Begründung].",
    "tags": ["mathematik", "rechnen"],
    "quarter_app": "${quarter}",
    "grade_app": ${grade},
    "unit": ""
  }
]

**BEISPIELE KORREKTER LÖSUNGEN:**
- "Berechne: 2,75 + 3,8" → solution: {"value": "6,55"}
- "Subtrahiere 1,25 von 5" → solution: {"value": "3,75"} (5 - 1,25 = 3,75!)
- "Berechne: 5 + (-3)" → solution: {"value": "2"}
- "Berechne: 1/2 + 2/3" → solution: {"value": "7/6"}

**EXPLANATION Anforderungen:**
- Schritt-für-Schritt Rechenweg mit konkreten Zahlen
- "Um diese Aufgabe zu lösen, rechnest du: [Zahlen einsetzen]"
- Altersgerecht für Klassenstufe ${grade}
- 2-3 kurze Sätze
- Ermutigender Ton
- KONKRETE Zahlen aus der Aufgabe verwenden

**DISTRACTORS (falsche Antworten):**
- Mathematisch plausible Fehler (z.B. falsche Vorzeichen, Rechenfehler)  
- NICHT völlig willkürliche Zahlen
- Bei Klasse ${grade} angemessene Größenordnung

**QUALITÄTS-VALIDIERUNG:**
1. Rechne jede Lösung mental nach
2. Prüfe deutsche Dezimalschreibweise (Komma!)
3. Textaufgaben: Passt die Antwort zur Frage?
4. Distractors: Sind es realistische Fehler?

**VERBOTEN:**
- Visuelle Aufgaben jeder Art
- "Zeichne", "Male", "Konstruiere"
- Diagramme, Grafiken, Bilder
- "Ordne zu", "Verbinde"

Generiere NUR das mathematisch korrekte JSON-Array ohne weitere Erklärungen.`;
}

async function getCurriculumInfo(grade: number, domain: string, quarter: string): Promise<string> {
  try {
    // Fetch real curriculum data from the JSON file
    const curriculumResponse = await fetch('https://fsmgynpdfxkaiiuguqyr.supabase.co/storage/v1/object/public/curriculum/math_curriculum_1-10.json');
    if (!curriculumResponse.ok) {
      // Fallback to embedded curriculum data
      return getRealCurriculumData(grade, domain, quarter);
    }
    
    const curriculumData = await curriculumResponse.json();
    const gradeData = curriculumData[grade.toString()];
    
    if (!gradeData || !gradeData[quarter] || !gradeData[quarter][domain]) {
      return getRealCurriculumData(grade, domain, quarter);
    }
    
    const topics = gradeData[quarter][domain];
    return Array.isArray(topics) ? topics.join(', ') : topics;
    
  } catch (error) {
    console.log('Using fallback curriculum data:', error);
    return getRealCurriculumData(grade, domain, quarter);
  }
}

function getRealCurriculumData(grade: number, domain: string, quarter: string): string {
  // Real curriculum data based on the math_curriculum_1-10.json structure
  const realCurriculum: Record<number, Record<string, Record<string, string[]>>> = {
    1: {
      Q1: {
        "Zahlen & Operationen": ["Zahlen bis 10: zählen, ordnen", "Zerlegen im Zehnerraum"],
        "Größen & Messen": ["Längen vergleichen", "Uhr: volle Stunden"],
        "Raum & Form": ["Einfache Formen erkennen", "Muster fortsetzen"],
        "Daten & Zufall": ["Strichlisten und einfache Häufigkeiten"]
      },
      Q4: {
        "Zahlen & Operationen": ["Zahlen bis 100 kennenlernen", "Erste Multiplikationsvorstellungen"],
        "Größen & Messen": ["Längen mit Lineal (cm) messen"],
        "Raum & Form": ["Räumliche Orientierung", "Symmetrische Muster"],
        "Daten & Zufall": ["Säulendiagramme einfach"]
      }
    },
    2: {
      Q4: {
        "Zahlen & Operationen": ["Einmaleins automatisieren", "Rechentricks"],
        "Größen & Messen": ["Längen umrechnen cm↔m"],
        "Raum & Form": ["Würfelnetze"],
        "Daten & Zufall": ["Zufallsexperimente"]
      }
    },
    3: {
      Q4: {
        "Zahlen & Operationen": ["Dezimalzahlen (Geld)", "Zahlendarstellung erweitern"],
        "Größen & Messen": ["Zeitpläne lesen", "Temperaturen ablesen"],
        "Raum & Form": ["Spiegelungen/Drehungen", "Gitterkoordinaten nutzen"],
        "Daten & Zufall": ["Wahrscheinlichkeit als Häufigkeit"]
      }
    },
    4: {
      Q4: {
        "Zahlen & Operationen": ["Dezimalzahlen (Geld): Komma verstehen", "Bruchverständnis vertiefen: Erweitern/Kürzen"],
        "Größen & Messen": ["Skalen/Maßstab: Vergrößern/Verkleinern", "Zeit addieren/subtrahieren"],
        "Raum & Form": ["Figuren legen/Netze: Flächen legen, Würfelbilder", "Koordinatensystem: 1. Quadrant einfach"],
        "Daten & Zufall": ["Zufall/Experimente: Baumdiagramm 1-stufig vorbereiten", "Wahrscheinlichkeit als Häufigkeit"]
      }
    },
    5: {
      Q1: {
        "Zahlen & Operationen": ["Negative Zahlen: Zahlengerade, Vergleiche", "Addition/Subtraktion negativer Zahlen"],
        "Größen & Messen": ["Dezimalzahlen: Stellenwerte, Vergleichen", "Umrechnung: mm-cm-m-km"],
        "Raum & Form": ["Dreiecke: Arten, Konstruktion", "Vierecke: Eigenschaften"],
        "Gleichungen & Funktionen": ["Terme: Variablen, Termwerte", "Einfache Umformungen"],
        "Daten & Zufall": ["Mittelwert, Median berechnen", "Spannweite bestimmen"]
      }
    }
  };
  
  const quarterData = realCurriculum[grade]?.[quarter as keyof typeof realCurriculum[number]];
  const topics = quarterData?.[domain];
  
  if (topics && Array.isArray(topics)) {
    return topics.join(', ');
  }
  
  // Final fallback for missing data
  return `${domain} Klassenstufe ${grade} ${quarter}`;
}