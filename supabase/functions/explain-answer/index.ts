import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExplanationRequest {
  question: string;
  answer: string;
  grade: number;
  subject?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, answer, grade, subject = 'mathematik' }: ExplanationRequest = await req.json();
    
    console.log(`🎯 Generating explanation for Grade ${grade} ${subject}`);
    console.log(`Question: ${question}`);
    console.log(`Answer: ${answer}`);
    
    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    const prompt = buildExplanationPrompt(question, answer, grade, subject);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: `Erkläre diese Aufgabe kindgerecht: "${question}" mit der richtigen Antwort "${answer}"` }
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const result = await response.json();
    const explanation = result.choices[0].message.content;
    
    if (!explanation) {
      throw new Error('No explanation generated');
    }
    
    console.log(`✅ Generated explanation: ${explanation}`);
    
    return new Response(JSON.stringify({
      success: true,
      explanation: explanation.trim(),
      grade,
      subject
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    
  } catch (error) {
    console.error('Explanation generation error:', error);
    
    // Fallback explanation
    const fallback = generateFallbackExplanation(
      (await req.json()).question || '', 
      (await req.json()).answer || '', 
      (await req.json()).grade || 1
    );
    
    return new Response(JSON.stringify({
      success: true,
      explanation: fallback,
      is_fallback: true
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function buildExplanationPrompt(question: string, answer: string, grade: number, subject: string): string {
  return `Du bist ein erfahrener Grundschullehrer für Klassenstufe ${grade}. Erkläre einem Kind die folgende Aufgabe auf eine liebevolle, ermutigende Art.

**Aufgabe:** ${question}
**Richtige Antwort:** ${answer}

**Erklärungsanforderungen für Klassenstufe ${grade}:**
- Direkte Ansprache: "Um diese Aufgabe zu lösen..."
- Verwende konkrete Zahlen aus der Aufgabe
- Altersgerechte Sprache (${grade}. Klasse)
- 2-3 kurze, motivierende Sätze
- Erkläre WARUM die Lösung richtig ist
- Positiver, ermutigender Ton
- Bei Rechenaufgaben: Zeige den Rechenweg Schritt für Schritt
- Bei Textaufgaben: Erkläre die Logik dahinter

**Beispiele für gute Erklärungen:**
- "Um 15 + 8 zu rechnen, fängst du bei 15 an und zählst 8 weiter: 16, 17, 18, 19, 20, 21, 22, 23. Das Ergebnis ist 23!"
- "Bei dieser Aufgabe musst du überlegen, was gesucht ist. Du hast am Anfang 5 Äpfel und bekommst 3 dazu. Das heißt: 5 + 3 = 8 Äpfel. Super gemacht!"
- "Um von 10 die Zahl 4 zu subtrahieren, stellst du dir vor, du hast 10 Sachen und gibst 4 weg. Dann bleiben 6 übrig: 10 - 4 = 6."

**Wichtige Hinweise:**
- KEINE Fachsprache oder komplizierte Begriffe
- KEINE langen Erklärungen
- IMMER ermutigend und positiv
- Konkrete Zahlen aus der Aufgabe verwenden
- Kurze, verständliche Sätze

Generiere NUR die kindgerechte Erklärung, keine weiteren Kommentare.`;
}

function generateFallbackExplanation(question: string, answer: string, grade: number): string {
  // Simple fallback based on grade level
  if (grade <= 2) {
    return `Super! Die richtige Antwort ist ${answer}. Du kannst dir die Zahlen vorstellen oder an den Fingern abzählen. Das hast du toll gemacht!`;
  } else if (grade <= 4) {
    return `Sehr gut! Die Lösung ist ${answer}. Bei solchen Aufgaben gehst du Schritt für Schritt vor und rechnest sorgfältig. Weiter so!`;
  } else {
    return `Richtig gelöst! Das Ergebnis ${answer} findest du, indem du die Aufgabe strukturiert angehst und die passende Rechenregeln anwendest.`;
  }
}