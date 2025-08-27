import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Complete Math curriculum structure for grades 1-10
const MATH_CURRICULUM = {
  "1": {
    "Q1": {
      "Zahlen & Operationen": ["Zählen bis 10", "Anzahlen vergleichen", "Plus/Minus im ZR 10 ohne Übergang"],
      "Raum & Form": ["Kreis, Dreieck, Quadrat, Rechteck unterscheiden"],
      "Größen & Messen": ["Längen schätzen und vergleichen (unstandardisiert)"],
      "Daten & Zufall": ["Einfache Strichlisten und Bilddiagramme"]
    },
    "Q2": {
      "Zahlen & Operationen": ["Zahlen bis 20 darstellen, ordnen", "Plus/Minus im ZR 20 mit Zehnerübergang (strategisch)"],
      "Raum & Form": ["rechts/links, oben/unten; Muster fortsetzen"],
      "Größen & Messen": ["Uhr (volle/halbe Stunde), Münzen bis 2 €"],
      "Daten & Zufall": ["möglich – sicher – unmöglich"]
    },
    "Q3": {
      "Zahlen & Operationen": ["Zahlen bis 100 erkunden, Zehner/Einer", "Halbschriftliche Verfahren im ZR 100 (ohne Übergang)"],
      "Raum & Form": ["Einfache Achsensymmetrien erkennen"],
      "Größen & Messen": ["Messen mit Lineal; Einheiten cm/m"]
    },
    "Q4": {
      "Zahlen & Operationen": ["Plus/Minus im ZR 100 mit Übergang", "Wiederholtes Addieren/Teilen in gleich große Gruppen"],
      "Größen & Messen": ["Kalender, Wochentage/Monate, einfache Zeitspannen"],
      "Raum & Form": ["Flächen legen, einfache Netze (Würfelbilder)"]
    }
  },
  "2": {
    "Q1": {
      "Zahlen & Operationen": ["Halbschriftlich & schriftnah mit Übergang", "2er/5er/10er Reihen, Tausch-/Verbundaufgaben"],
      "Größen & Messen": ["Einkaufssituationen bis 100 € (ohne Komma)"],
      "Raum & Form": ["Ecken, Kanten, Seiten; Rechteck/Quadrat"]
    },
    "Q2": {
      "Zahlen & Operationen": ["1–10er Reihen (Netz), Umkehraufgaben", "Teilen als Aufteilen/Verteilen"],
      "Größen & Messen": ["cm–m; min–h; €–Cent (ganzzahlig)"],
      "Daten & Zufall": ["Säulen-/Bilddiagramme interpretieren"]
    },
    "Q3": {
      "Zahlen & Operationen": ["Standardverfahren (ZR 1000 vorbereiten)", "Kleines Einmaleins sicher anwenden"],
      "Raum & Form": ["Umfang Rechteck/Quadrat (ganzzahlige Längen)"],
      "Größen & Messen": ["Addieren/Subtrahieren von Zeiten (ohne Datum)"]
    },
    "Q4": {
      "Zahlen & Operationen": ["Stellenwert bis 1000", "Addition/Subtraktion im ZR 1000"],
      "Daten & Zufall": ["einfache Experimente; Häufigkeiten"]
    }
  },
  "3": {
    "Q1": {
      "Zahlen & Operationen": ["Ordnen, Runden, Zahlstrahl", "mit Übergang im ZR 1000", "1×n/ n×1 mit Strategie (ohne Algorithmus)"],
      "Größen & Messen": ["Formelverständnis U=2(a+b), A=a·b (ganzzahlig)"]
    },
    "Q2": {
      "Zahlen & Operationen": ["Teilen mit Rest; Beziehungen × ÷", "Einstelliger Faktor × mehrstellig"],
      "Raum & Form": ["Recht-, Spitz-, Stumpfwinkel erkennen"],
      "Daten & Zufall": ["Mittelwert (einfach), Modus; Säulen-/Liniendiagramm"]
    },
    "Q3": {
      "Zahlen & Operationen": ["Einführung; einfache gleichnamige Vergleiche"],
      "Größen & Messen": ["Zeitspannen über Tagesgrenzen; Kalender"],
      "Raum & Form": ["Achsensymmetrie & Parkettierungen"]
    },
    "Q4": {
      "Zahlen & Operationen": ["Einstelliger Divisor", "Komma bei Geld/Messwerten verstehen"],
      "Daten & Zufall": ["relative Häufigkeit (intuitiv)"]
    }
  },
  "4": {
    "Q1": {
      "Zahlen & Operationen": ["Stellenwert, Runden, Zahlbeziehungen", "mehrstellig × mehrstellig"],
      "Größen & Messen": ["mm–cm–m–km; g–kg; ml–l; € mit Komma"],
      "Raum & Form": ["Vierecke, Dreiecke klassifizieren"]
    },
    "Q2": {
      "Zahlen & Operationen": ["mehrstelliger Divisor (standard)", "Brüche als Dezimalzahlen (endliche)"],
      "Größen & Messen": ["Netze, Oberflächen, Volumen (ganzzahlig)"],
      "Daten & Zufall": ["Mittelwert/Median (einfach), Diagrammwahl"]
    },
    "Q3": {
      "Zahlen & Operationen": ["+ − × ÷ (einfach, sachbezogen)"],
      "Gleichungen & Funktionen": ["Muster/Regeln; Variable als Platzhalter"],
      "Raum & Form": ["Punkte lesen/setzen, einfache Wege"]
    },
    "Q4": {
      "Zahlen & Operationen": ["Erweitern/Kürzen, gleichnamig addieren"],
      "Größen & Messen": ["Vergrößern/Verkleinern"],
      "Daten & Zufall": ["Baumdiagramm (1 Stufe) vorbereiten"]
    }
  },
  "5": {
    "Q1": {
      "Zahlen & Operationen": ["Zahlengerade, Vergleiche, Addition/Subtraktion", "Erweitern/Kürzen, Vergleich; Umwandlung"],
      "Gleichungen & Funktionen": ["Termwert, einfache Umformungen"],
      "Raum & Form": ["Konstruktion, Eigenschaften"]
    },
    "Q2": {
      "Zahlen & Operationen": ["Direkt proportional; Skalen", "Sachaufgaben"],
      "Gleichungen & Funktionen": ["ax+b=c lösen (einfach)"],
      "Daten & Zufall": ["Mittelwert, Median, Spannweite"]
    },
    "Q3": {
      "Zahlen & Operationen": ["Prozentwert/Grundwert/Prozentsatz (einfach)"],
      "Gleichungen & Funktionen": ["Tabellen ↔ Graph"],
      "Raum & Form": ["Umfang/Fläche (einfach)"]
    },
    "Q4": {
      "Zahlen & Operationen": ["gemischte Aufgaben"],
      "Raum & Form": ["Prismen; Volumen/Netze"],
      "Daten & Zufall": ["absolute/relative Häufigkeit"]
    }
  },
  "6": {
    "Q1": {
      "Zahlen & Operationen": ["Grundaufgaben, bequeme Prozentsätze", "Anteile, Mix-/Mischaufgaben (einfach)"],
      "Gleichungen & Funktionen": ["äquivalente Umformungen (einfach)"],
      "Raum & Form": ["Abbildungen"]
    },
    "Q2": {
      "Gleichungen & Funktionen": ["Graphisch & rechnerisch"],
      "Zahlen & Operationen": ["Quadrat/Kubik; Potenzschreibweise"],
      "Raum & Form": ["Sachaufgaben, Maßeinheiten"],
      "Daten & Zufall": ["Kreis-/Säulen-/Liniendiagramm; Median"]
    },
    "Q3": {
      "Gleichungen & Funktionen": ["mit Klammern/Brüchen"],
      "Raum & Form": ["Oberfläche & Volumen"],
      "Zahlen & Operationen": ["Rechnen mit Vorzeichen (einfach)"]
    },
    "Q4": {
      "Gleichungen & Funktionen": ["y=mx+b lesen/zeichnen"],
      "Raum & Form": ["Dreiecks-/Vielfachwinkel"],
      "Daten & Zufall": ["Einfache Pfadregeln vorbereiten"]
    }
  },
  "7": {
    "Q1": {
      "Zahlen & Operationen": ["Zins, Tageszins, Zinseszins (iterativ)"],
      "Gleichungen & Funktionen": ["Ausklammern, Klammerregeln"],
      "Raum & Form": ["Eigenschaften/Konstruktionen"]
    },
    "Q2": {
      "Zahlen & Operationen": ["+ − × ÷ mit Brüchen/Dezimalen"],
      "Gleichungen & Funktionen": ["mit Brüchen/Klammern"],
      "Daten & Zufall": ["absolute/relative Häufigkeit; Baumdiagramm (1–2 Stufen)"]
    },
    "Q3": {
      "Gleichungen & Funktionen": ["direkt/indirekt proportional; Steigung verstehen"],
      "Raum & Form": ["Zylinder/Prismen; Netze/Schrägbild"],
      "Zahlen & Operationen": ["Rabatt/Preiserhöhung"]
    },
    "Q4": {
      "Gleichungen & Funktionen": ["grafisch und rechnerisch (einfach)"],
      "Raum & Form": ["Verhältnisse, Streckung (einfach)"]
    }
  },
  "8": {
    "Q1": {
      "Gleichungen & Funktionen": ["Darstellung/Steigung/Achsabschnitt", "grafisch/Einsetzen/Gleichsetzen"],
      "Zahlen & Operationen": ["Distributivgesetz etc."]
    },
    "Q2": {
      "Raum & Form": ["Streckung, Verhältnisse, Anwendungen", "Berechnungen/Anwendungen"],
      "Daten & Zufall": ["Vierfeldertafel, bedingte Häufigkeiten (einfach)"]
    },
    "Q3": {
      "Gleichungen & Funktionen": ["Modellieren mit linearen Funktionen"],
      "Zahlen & Operationen": ["Tabellenkalkulation für Zinsen"],
      "Raum & Form": ["Geraden, Parallelität/Orthogonalität"]
    },
    "Q4": {
      "Gleichungen & Funktionen": ["x^2, Parabel-Grundlagen (intuitiv)"],
      "Raum & Form": ["Rechtwinklige Dreiecke – Motivation"]
    }
  },
  "9": {
    "Q1": {
      "Raum & Form": ["Strecken berechnen, Orthogonalität"],
      "Gleichungen & Funktionen": ["x^2=a; pq-Formel (einfach)"],
      "Raum & Form": ["Sinus (Basis), Kosinus/Tangens (optional)"]
    },
    "Q2": {
      "Gleichungen & Funktionen": ["Scheitel/Nullstellen, Graphen"],
      "Raum & Form": ["Kreis, Kreissektor, zusammengesetzte Figuren"],
      "Daten & Zufall": ["Baumdiagramme (mehrstufig), erwartete Werte (einfach)"]
    },
    "Q3": {
      "Gleichungen & Funktionen": ["Lineare/quadratische Modelle"],
      "Zahlen & Operationen": ["Wurzelziehen, Potenzgesetze (einfach)"],
      "Raum & Form": ["Längen (Betrag) mit Pythagoras"]
    },
    "Q4": {
      "Gleichungen & Funktionen": ["Lineare/quadratische Mischaufgaben"],
      "Daten & Zufall": ["Boxplot/Median/Quartile (einfach); Interpretation"]
    }
  },
  "10": {
    "Q1": {
      "Gleichungen & Funktionen": ["Scheitel-/Normalform, Transformationen", "Wachstum (einfach), Parameter deuten"],
      "Raum & Form": ["Strecken/Winkel berechnen"]
    },
    "Q2": {
      "Gleichungen & Funktionen": ["Lineare/Quadratische Systeme (einfach)"],
      "Zahlen & Operationen": ["Zinseszins allgemein; Effektivzins (einfach)"],
      "Daten & Zufall": ["Pfadregeln, einfache Formeln"]
    },
    "Q3": {
      "Raum & Form": ["Komplexere Anwendungen"],
      "Zahlen & Operationen": ["Definitionsmenge, Bruchgleichungen (einfach)"],
      "Gleichungen & Funktionen": ["Schnittpunkte/Steigung, Modellwahl"]
    },
    "Q4": {
      "Daten & Zufall": ["Streuungsmaße, Ausreißer, kritische Bewertung"],
      "Gleichungen & Funktionen": ["pq-/Mitternachtsformel, Faktorisieren (Routine)"]
    }
  }
};

interface GeneratedTemplate {
  grade: number;
  quarter_app: string;
  domain: string;
  subcategory: string;
  difficulty: string;
  question_type: string;
  student_prompt: string;
  variables: Record<string, any>;
  solution: string;
  unit?: string;
  distractors: string[];
  explanation_teacher: string;
  tags: string[];
}

async function generateWithGemini(prompt: string): Promise<any> {
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error('No content generated by Gemini');
  }

  console.log('🔍 Raw Gemini response:', content.substring(0, 200) + '...');
  
  try {
    // Extract JSON from markdown code blocks if present
    let jsonContent = content;
    
    // Check if the response contains markdown code blocks
    const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      jsonContent = jsonBlockMatch[1].trim();
      console.log('📋 Extracted JSON from markdown block');
    }
    
    // Remove any potential leading/trailing whitespace or unwanted characters
    jsonContent = jsonContent.trim();
    
    return JSON.parse(jsonContent);
  } catch (error) {
    console.error('❌ Failed to parse Gemini response as JSON:', error);
    console.error('📄 Full response content:', content);
    
    // Try to find and extract JSON array manually
    const arrayMatch = content.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (arrayMatch) {
      try {
        console.log('🔧 Attempting manual JSON array extraction...');
        return JSON.parse(arrayMatch[0]);
      } catch (manualError) {
        console.error('❌ Manual extraction also failed:', manualError);
      }
    }
    
    throw error;
  }
}

function buildCurriculumPrompt(grade: number, quarter: string, domain: string, topics: string[], count: number = 12): string {
  const difficulties = ['AFB I', 'AFB II', 'AFB III'];
  const questionTypes = ['multiple-choice', 'text-input', 'matching'];
  
  return `Erstelle ${count} verschiedene deutsche Mathematikaufgaben für Klasse ${grade}, Quartal ${quarter}, Domäne "${domain}":

**Lehrplan-Themen:**
${topics.map(topic => `- ${topic}`).join('\n')}

**Anforderungen:**
- Schwierigkeitsverteilung: AFB I (50%), AFB II (35%), AFB III (15%)
- Itemtyp-Mix: Multiple Choice (45%), Text-Input (35%), Matching (20%)
- Deutsche Sprache, altersgerecht für Klasse ${grade}
- Realistische Kontexte: Alltag, Schule, Sport, Einkaufen
- Vielfältige Zahlenwerte (auch "krumme" Zahlen)

**WICHTIGE FORMATIERUNGSANWEISUNGEN:**
- Antworte NUR mit reinem JSON - keine Markdown-Blöcke, keine Erklärungen
- Verwende ausschließlich doppelte Anführungszeichen (") für JSON-Strings
- Achte auf korrekte JSON-Syntax: keine abschließenden Kommas
- Verwende Unicode-Escaping für Sonderzeichen bei Bedarf
- Gib das JSON als Array zurück

**JSON-Schema (EXAKT so formatieren):**
[
  {
    "grade": ${grade},
    "quarter_app": "${quarter}",
    "domain": "${domain}",
    "subcategory": "string",
    "difficulty": "AFB I",
    "question_type": "multiple-choice",
    "student_prompt": "Aufgabentext hier (max ${grade <= 4 ? 200 : 300} Zeichen)",
    "variables": {},
    "solution": "Lösung als String",
    "unit": "Einheit (optional)",
    "distractors": ["Falsche Antwort 1", "Falsche Antwort 2", "Falsche Antwort 3"],
    "explanation_teacher": "Erklärung für Lehrkraft",
    "tags": ["tag1", "tag2"]
  }
]

**ANTWORTFORMAT:**
Beginne direkt mit [ und ende mit ] - keine zusätzlichen Zeichen, Erklärungen oder Markdown-Formatierung.

Erstelle ${count} unterschiedliche, hochwertige Aufgaben basierend auf den Lehrplan-Themen!`;
}

async function insertMathTemplates(templates: GeneratedTemplate[]): Promise<void> {
  const dbTemplates = templates.map(template => ({
    grade: template.grade,
    grade_app: template.grade,
    quarter_app: template.quarter_app,
    domain: template.domain,
    subcategory: template.subcategory,
    difficulty: template.difficulty,
    question_type: template.question_type,
    student_prompt: template.student_prompt,
    variables: template.variables || {},
    solution: template.solution,
    unit: template.unit,
    distractors: template.distractors || [],
    explanation_teacher: template.explanation_teacher,
    source_skill_id: `curriculum_${template.grade}_${template.quarter_app}_${template.domain.replace(/\s+/g, '_')}`,
    tags: template.tags || [],
    seed: Math.floor(Math.random() * 1000000),
    status: 'ACTIVE'
  }));

  const { error } = await supabase
    .from('templates')
    .insert(dbTemplates);

  if (error) {
    console.error('Error inserting templates:', error);
    throw error;
  }

  console.log(`✅ Inserted ${dbTemplates.length} math templates`);
}

async function seedMathCurriculum(): Promise<any> {
  console.log('🏫 Starting systematic math curriculum seeding');
  
  const results = {
    total_generated: 0,
    total_inserted: 0,
    processed_combinations: 0,
    errors: [] as string[]
  };

  // Process each grade, quarter, and domain combination
  for (const [grade, quarters] of Object.entries(MATH_CURRICULUM)) {
    const gradeNum = parseInt(grade);
    
    for (const [quarter, domains] of Object.entries(quarters)) {
      for (const [domain, topics] of Object.entries(domains)) {
        try {
          console.log(`\n📚 Processing: Grade ${gradeNum}, ${quarter}, ${domain}`);
          
          // Check existing count
          const { data: existing } = await supabase
            .from('templates')
            .select('id')
            .eq('grade', gradeNum)
            .eq('quarter_app', quarter)
            .eq('domain', domain)
            .eq('status', 'ACTIVE');

          const existingCount = existing?.length || 0;
          
          if (existingCount >= 12) {
            console.log(`✅ Skipping - already has ${existingCount} templates`);
            continue;
          }

          const neededCount = 12 - existingCount;
          
          // Generate templates based on curriculum
          const prompt = buildCurriculumPrompt(gradeNum, quarter, domain, topics, neededCount);
          const generated = await generateWithGemini(prompt);
          const templates = Array.isArray(generated) ? generated : [generated];
          
          if (templates.length > 0) {
            await insertMathTemplates(templates);
            results.total_inserted += templates.length;
          }
          
          results.total_generated += templates.length;
          results.processed_combinations++;
          
          // Delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`❌ Error processing ${grade}-${quarter}-${domain}:`, error);
          results.errors.push(`${grade}-${quarter}-${domain}: ${error.message}`);
        }
      }
    }
  }

  console.log(`\n🎉 Math curriculum seeding complete!`);
  console.log(`📊 Processed: ${results.processed_combinations} combinations`);
  console.log(`📊 Generated: ${results.total_generated}, Inserted: ${results.total_inserted}`);
  
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Math curriculum seeder started');
    
    const result = await seedMathCurriculum();

    return new Response(JSON.stringify({
      success: true,
      message: 'Math curriculum seeding completed',
      data: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in math curriculum seeder:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});