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
    
    const prompt = buildMathPrompt(grade, domain, quarter, difficulty, Math.min(needed, count));
    
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
        explanation_teacher: template.explanation_teacher || '',
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

function buildMathPrompt(grade: number, domain: string, quarter: string, difficulty: string, count: number): string {
  const curriculumInfo = getCurriculumInfo(grade, domain, quarter);
  
  return `Du bist ein Experte für deutsche Mathematik-Lehrpläne. Erstelle ${count} hochwertige Mathematikaufgaben im JSON-Format.

**Vorgaben:**
- Klassenstufe: ${grade}
- Domain: ${domain}
- Quartal: ${quarter}
- Schwierigkeitsgrad: ${difficulty}

**Curriculum-Kontext:**
${curriculumInfo}

**Aufgabentypen (variieren):**
- multiple-choice: 4 Antwortoptionen
- text-input: Freitext-Eingabe
- matching: Zuordnungsaufgaben

**JSON-Format (Array von Objekten):**
[
  {
    "grade": ${grade},
    "domain": "${domain}",
    "subcategory": "Spezifische Unterkategorie",
    "difficulty": "${difficulty}",
    "question_type": "multiple-choice|text-input|matching",
    "student_prompt": "Klare, altersgerechte Fragestellung",
    "solution": {"value": "Korrekte Antwort"},
    "distractors": ["Falsche Option 1", "Falsche Option 2", "Falsche Option 3"],
    "variables": {},
    "explanation_teacher": "Kurze Erklärung für Lehrer",
    "tags": ["tag1", "tag2"],
    "quarter_app": "${quarter}",
    "grade_app": ${grade},
    "unit": "Einheit falls numerisch"
  }
]

**Qualitätsanforderungen:**
- Altersgerecht und verständlich
- Lehrplankonform
- Realitätsbezug wo möglich
- Verschiedene Schwierigkeitsnuancen
- Keine visuellen Elemente (Zeichnungen, Bilder)
- Deutsche Sprache, korrekte Fachbegriffe

Generiere NUR das JSON-Array, keine zusätzlichen Erklärungen.`;
}

function getCurriculumInfo(grade: number, domain: string, quarter: string): string {
  const curriculum: Record<string, Record<string, string>> = {
    "Zahlen & Operationen": {
      "1": "Zahlen bis 20, Addition/Subtraktion ohne Übergang, Zahlvorstellung",
      "2": "Zahlen bis 100, Einmaleins (2er, 5er, 10er), schriftliche Addition",
      "3": "Zahlen bis 1000, Einmaleins vollständig, schriftliche Subtraktion",
      "4": "Zahlen bis 1 Million, schriftliche Multiplikation/Division",
      "5": "Brüche, Dezimalzahlen, negative Zahlen",
      "6": "Bruchrechnung, Prozentrechnung Grundlagen",
      "7": "Prozent- und Zinsrechnung, rationale Zahlen",
      "8": "Terme und Gleichungen, Funktionen",
      "9": "Quadratische Funktionen, Potenzen",
      "10": "Exponentialfunktionen, Logarithmen"
    },
    "Raum & Form": {
      "1": "Grundformen erkennen, Symmetrie einfach",
      "2": "Flächen und Körper, Umfang berechnen",
      "3": "Geometrische Figuren, Flächeninhalt",
      "4": "Koordinatensystem, geometrische Konstruktionen",
      "5": "Dreiecke und Vierecke, Volumenberechnung",
      "6": "Kreis, Prisma und Zylinder",
      "7": "Strahlensätze, Ähnlichkeit",
      "8": "Pythagoras, Trigonometrie Grundlagen",
      "9": "Trigonometrie erweitert, Kreisgeometrie",
      "10": "Analytische Geometrie, Vektoren"
    },
    "Größen & Messen": {
      "1": "Längen, Zeit (Stunden), Geld bis 2€",
      "2": "Einheiten cm/m, min/h, Euro/Cent",
      "3": "Gewicht, Volumen, Zeitspannen",
      "4": "Maßeinheiten umrechnen, Maßstab",
      "5": "Flächeneinheiten, Volumeneinheiten",
      "6": "Zeit, Geschwindigkeit, Dichte",
      "7": "Verhältnisse und Proportionen",
      "8": "Wachstum und Abnahme",
      "9": "Exponentielles Wachstum",
      "10": "Logarithmische Skalen"
    },
    "Daten & Zufall": {
      "1": "Strichlisten, einfache Diagramme",
      "2": "Säulendiagramme, Häufigkeiten",
      "3": "Mittelwert, Wahrscheinlichkeit begrifflich",
      "4": "Zufall und Wahrscheinlichkeit",
      "5": "Statistische Erhebungen, relative Häufigkeit",
      "6": "Kreisdiagramme, Median",
      "7": "Baumdiagramme, Pfadregeln",
      "8": "Vierfeldertafel, bedingte Wahrscheinlichkeit",
      "9": "Normalverteilung, Konfidenzintervalle",
      "10": "Hypothesentests, Regression"
    }
  };
  
  return curriculum[domain]?.[grade.toString()] || `Allgemeine Mathematik Klassenstufe ${grade}`;
}