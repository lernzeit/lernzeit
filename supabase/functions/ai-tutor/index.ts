import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TutorRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  question: string;
  correctAnswer: string;
  userAnswer?: string;
  grade: number;
  subject: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication: verify the user's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    try {
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) throw new Error('Invalid token');
      const payload = JSON.parse(atob(payloadBase64));
      if (!payload.sub) throw new Error('No user ID');
      console.log('Tutor: authenticated user', payload.sub);
    } catch {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, question, correctAnswer, userAnswer, grade, subject }: TutorRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = buildSystemPrompt(grade, subject, question, correctAnswer, userAnswer);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error('AI gateway error:', response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Tutor error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildSystemPrompt(grade: number, subject: string, question: string, correctAnswer: string, userAnswer?: string): string {
  const ageMap: Record<number, string> = {
    1: '6-7', 2: '7-8', 3: '8-9', 4: '9-10', 5: '10-11',
    6: '11-12', 7: '12-13', 8: '13-14', 9: '14-15', 10: '15-16'
  };
  const age = ageMap[grade] || `${5 + grade}-${6 + grade}`;

  const subjectMap: Record<string, string> = {
    math: 'Mathematik', german: 'Deutsch', english: 'Englisch',
    geography: 'Geographie', history: 'Geschichte', physics: 'Physik',
    biology: 'Biologie', chemistry: 'Chemie', latin: 'Latein', science: 'Sachkunde'
  };
  const subjectDE = subjectMap[subject?.toLowerCase()] || subject || 'Mathematik';

  return `Du bist ein liebevoller, geduldiger KI-Tutor für ein Kind (${age} Jahre alt, ${grade}. Klasse) in Deutschland.
Du erklärst ${subjectDE}-Aufgaben kindgerecht und ermutigend.

KONTEXT DER AKTUELLEN AUFGABE:
- Aufgabe: "${question}"
- Richtige Antwort: "${correctAnswer}"
${userAnswer ? `- Antwort des Kindes: "${userAnswer}"` : ''}

REGELN:
1. Sprich das Kind mit "Du" an, sei warmherzig und ermutigend
2. Verwende einfache, altersgerechte Sprache für ${grade}. Klasse
3. Erkläre Schritt für Schritt mit konkreten Beispielen
4. Verwende IMMER deutsche Schreibweisen (Euro statt Dollar, Komma als Dezimaltrennzeichen)
5. Halte Antworten kurz: 2-4 Sätze für Klasse 1-2, bis 5 Sätze für ältere
6. Verwende passende Emojis sparsam (1-2 pro Nachricht)
7. Wenn das Kind nachfragt, gehe geduldig auf die Frage ein
8. Gib KEINE kompletten Lösungen vor, sondern führe das Kind zur Lösung
9. Bei Folgefragen: Baue auf dem bisherigen Gespräch auf
10. Beginne deine ERSTE Nachricht direkt mit einer freundlichen Erklärung der Aufgabe

WICHTIG: Du bist NUR für schulische Themen zuständig. Lenke höflich zurück, wenn das Kind über andere Themen sprechen möchte.`;
}
