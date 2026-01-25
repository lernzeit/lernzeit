import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuestionRequest {
  grade: number;
  subject: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  questionType?: 'MULTIPLE_CHOICE' | 'FREETEXT' | 'SORT' | 'MATCH' | 'DRAG_DROP' | 'FILL_BLANK';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { grade, subject, difficulty = 'medium', questionType }: QuestionRequest = await req.json();
    
    console.log(`🎯 Generating question: Grade ${grade}, Subject: ${subject}, Difficulty: ${difficulty}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const prompt = buildQuestionPrompt(grade, subject, difficulty, questionType);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: getSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded. Please try again in a moment.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'API credits exhausted. Please contact support.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('🤖 AI Response received');

    // Parse JSON from response
    let question: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      question = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', content);
      throw new Error('Failed to parse AI response');
    }

    // Validate and enhance question structure
    const enhancedQuestion = {
      id: crypto.randomUUID(),
      grade,
      subject,
      difficulty,
      questionText: question.question_text || question.questionText,
      questionType: question.question_type || question.questionType,
      correctAnswer: question.correct_answer || question.correctAnswer,
      options: question.options || null,
      hint: question.hint || null,
      createdAt: new Date().toISOString()
    };

    console.log(`✅ Generated: ${enhancedQuestion.questionType} - ${enhancedQuestion.questionText?.substring(0, 50)}...`);

    return new Response(JSON.stringify({
      success: true,
      question: enhancedQuestion
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Question generation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function getSystemPrompt(): string {
  return `Du bist ein erfahrener Pädagoge, der kindgerechte Lernfragen für Schüler erstellt.

WICHTIGE REGELN:
1. Alle Fragen müssen altersgerecht und motivierend sein
2. Verwende konkrete Beispiele aus dem Alltag der Kinder
3. Fragen sollen positiv und ermutigend formuliert sein
4. Keine zu komplexen oder mehrdeutigen Formulierungen
5. Antworte IMMER mit validem JSON, KEIN Markdown

FRAGETYPEN:
- MULTIPLE_CHOICE: 4 Optionen, genau 1 richtig, plausible Distraktoren
- FREETEXT: Kurze Antwort (Zahl, Wort, kurzer Satz)
- SORT: 4-6 Elemente in richtige Reihenfolge bringen
- MATCH: 4-6 Paare zuordnen
- DRAG_DROP: Elemente in Kategorien/Lücken einordnen
- FILL_BLANK: Lückentext mit Antworten`;
}

function buildQuestionPrompt(grade: number, subject: string, difficulty: string, requestedType?: string): string {
  const subjectGerman = getSubjectGerman(subject);
  const gradeGuidelines = getGradeGuidelines(grade);
  const difficultyGuidelines = getDifficultyGuidelines(difficulty, grade);
  
  // Select question type based on request or random weighted selection
  const questionType = requestedType || selectQuestionType(subject, grade);

  return `Erstelle EINE ${difficultyGuidelines.label} Lernfrage:

**Klassenstufe:** ${grade}
**Fach:** ${subjectGerman}
**Schwierigkeit:** ${difficulty}
**Fragetyp:** ${questionType}

${gradeGuidelines}

${difficultyGuidelines.description}

${getTypeSpecificInstructions(questionType)}

Antworte NUR mit einem JSON-Objekt (kein Markdown, keine Erklärung):`;
}

function getSubjectGerman(subject: string): string {
  const map: Record<string, string> = {
    'math': 'Mathematik',
    'german': 'Deutsch',
    'english': 'Englisch',
    'geography': 'Geographie',
    'history': 'Geschichte',
    'physics': 'Physik',
    'biology': 'Biologie',
    'chemistry': 'Chemie',
    'latin': 'Latein',
    'science': 'Sachkunde'
  };
  return map[subject.toLowerCase()] || subject;
}

function getGradeGuidelines(grade: number): string {
  if (grade <= 2) {
    return `**Anforderungen Klasse 1-2:**
- Zahlenraum bis 100 (Klasse 1: bis 20)
- Sehr kurze, einfache Sätze
- Konkrete Gegenstände (Äpfel, Stifte, Tiere)
- Grundlegende Rechenarten (+, -)
- Einfache Buchstaben und Wörter
- Bilder und Symbole bevorzugen`;
  } else if (grade <= 4) {
    return `**Anforderungen Klasse 3-4:**
- Zahlenraum bis 1.000.000
- Schriftliche Rechenverfahren
- Einmaleins, Division
- Brüche (Grundlagen)
- Satzarten, Grammatik
- Sachaufgaben mit mehreren Schritten`;
  } else if (grade <= 6) {
    return `**Anforderungen Klasse 5-6:**
- Große Zahlen, Dezimalzahlen
- Bruchrechnung, Prozente
- Geometrie
- Aufsätze, Textanalyse
- Fremdsprachen (Grundlagen)
- Naturwissenschaftliche Grundlagen`;
  } else if (grade <= 8) {
    return `**Anforderungen Klasse 7-8:**
- Algebra, Gleichungen
- Funktionen, Graphen
- Grammatik fortgeschritten
- Literaturanalyse
- Physik, Chemie, Biologie vertieft
- Geschichte, Geographie`;
  } else {
    return `**Anforderungen Klasse 9-10:**
- Komplexe mathematische Konzepte
- Trigonometrie, Stochastik
- Textinterpretation, Argumentation
- Wissenschaftliches Arbeiten
- Prüfungsvorbereitung`;
  }
}

function getDifficultyGuidelines(difficulty: string, grade: number): { label: string; description: string } {
  switch (difficulty) {
    case 'easy':
      return {
        label: 'einfache',
        description: `**Einfache Schwierigkeit:**
- Grundlegende Konzepte
- Direkte Anwendung von Regeln
- Eindeutige Lösungen
- Wenige Schritte nötig`
      };
    case 'hard':
      return {
        label: 'anspruchsvolle',
        description: `**Schwere Schwierigkeit:**
- Komplexe Problemlösung
- Mehrere Konzepte kombinieren
- Transfer auf neue Situationen
- Kreatives Denken erforderlich`
      };
    default:
      return {
        label: 'mittelschwere',
        description: `**Mittlere Schwierigkeit:**
- Anwendung gelernter Konzepte
- Übertragung auf ähnliche Situationen
- Mehrere Lösungsschritte
- Logisches Denken`
      };
  }
}

function selectQuestionType(subject: string, grade: number): string {
  const types = ['MULTIPLE_CHOICE', 'FREETEXT', 'SORT', 'MATCH', 'DRAG_DROP', 'FILL_BLANK'];
  
  // Weight based on subject and grade
  const weights: Record<string, number[]> = {
    'math': [25, 35, 15, 10, 10, 5],      // More FREETEXT for calculations
    'german': [20, 15, 10, 15, 15, 25],   // More FILL_BLANK for grammar
    'english': [20, 20, 10, 20, 15, 15],  // Balanced with matching
    'default': [30, 20, 15, 15, 10, 10]   // Default weights
  };
  
  const subjectWeights = weights[subject.toLowerCase()] || weights['default'];
  
  // For younger grades, prefer simpler types
  if (grade <= 2) {
    return Math.random() < 0.6 ? 'MULTIPLE_CHOICE' : 'FREETEXT';
  }
  
  // Weighted random selection
  const totalWeight = subjectWeights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < types.length; i++) {
    random -= subjectWeights[i];
    if (random <= 0) return types[i];
  }
  
  return 'MULTIPLE_CHOICE';
}

function getTypeSpecificInstructions(questionType: string): string {
  switch (questionType) {
    case 'MULTIPLE_CHOICE':
      return `**Format MULTIPLE_CHOICE:**
{
  "question_text": "Frage hier?",
  "question_type": "MULTIPLE_CHOICE",
  "correct_answer": { "value": "Richtige Antwort" },
  "options": ["Richtige Antwort", "Falsch 1", "Falsch 2", "Falsch 3"],
  "hint": "Optionaler Hinweis"
}`;

    case 'FREETEXT':
      return `**Format FREETEXT:**
{
  "question_text": "Frage hier?",
  "question_type": "FREETEXT",
  "correct_answer": { "value": "42", "alternatives": ["42", "zweiundvierzig"] },
  "hint": "Optionaler Hinweis"
}`;

    case 'SORT':
      return `**Format SORT:**
{
  "question_text": "Ordne in die richtige Reihenfolge:",
  "question_type": "SORT",
  "correct_answer": { "order": ["Erstes", "Zweites", "Drittes", "Viertes"] },
  "options": ["Drittes", "Erstes", "Viertes", "Zweites"],
  "hint": "Optionaler Hinweis"
}`;

    case 'MATCH':
      return `**Format MATCH:**
{
  "question_text": "Ordne richtig zu:",
  "question_type": "MATCH",
  "correct_answer": { 
    "pairs": [["Links1", "Rechts1"], ["Links2", "Rechts2"], ["Links3", "Rechts3"]]
  },
  "options": {
    "leftItems": ["Links1", "Links2", "Links3"],
    "rightItems": ["Rechts1", "Rechts2", "Rechts3"]
  },
  "hint": "Optionaler Hinweis"
}`;

    case 'DRAG_DROP':
      return `**Format DRAG_DROP:**
{
  "question_text": "Ziehe in die richtige Kategorie:",
  "question_type": "DRAG_DROP",
  "correct_answer": {
    "placements": {
      "Kategorie1": ["Item1", "Item2"],
      "Kategorie2": ["Item3", "Item4"]
    }
  },
  "options": {
    "items": ["Item1", "Item2", "Item3", "Item4"],
    "categories": ["Kategorie1", "Kategorie2"]
  },
  "hint": "Optionaler Hinweis"
}`;

    case 'FILL_BLANK':
      return `**Format FILL_BLANK:**
{
  "question_text": "Der Hund ___ schnell. Die Katze ___ langsam.",
  "question_type": "FILL_BLANK",
  "correct_answer": { 
    "blanks": ["läuft", "schleicht"]
  },
  "options": ["läuft", "schleicht", "fliegt", "schwimmt"],
  "hint": "Optionaler Hinweis"
}`;

    default:
      return '';
  }
}
