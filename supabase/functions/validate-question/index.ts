import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationRequest {
  question: string;
  correctAnswer: string;
  userAnswer?: string;
  explanation?: string;
  grade: number;
  subject: string;
  templateId?: string;
}

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  calculatedAnswer: string | null;
  discrepancies: string[];
  suggestedCorrection: string | null;
  explanation: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ValidationRequest = await req.json();
    const { question, correctAnswer, userAnswer, explanation, grade, subject, templateId } = body;

    console.log(`🔍 Validating question for Grade ${grade} ${subject}`);
    console.log(`Question: ${question.substring(0, 100)}...`);
    console.log(`Stated correct answer: ${correctAnswer}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const validationPrompt = buildValidationPrompt(question, correctAnswer, userAnswer, explanation, grade, subject);

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
          { role: 'user', content: validationPrompt }
        ],
        temperature: 0.1, // Very low for precise mathematical checking
        tools: [
          {
            type: "function",
            function: {
              name: "validate_question",
              description: "Validate a math question and its answer",
              parameters: {
                type: "object",
                properties: {
                  is_valid: {
                    type: "boolean",
                    description: "Whether the stated correct answer is mathematically correct"
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence level from 0.0 to 1.0"
                  },
                  calculated_answer: {
                    type: "string",
                    description: "The mathematically correct answer calculated by the AI"
                  },
                  discrepancies: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of issues found"
                  },
                  suggested_correction: {
                    type: "string",
                    description: "The correct answer if different from stated"
                  },
                  explanation: {
                    type: "string",
                    description: "Brief explanation of the calculation"
                  }
                },
                required: ["is_valid", "confidence", "calculated_answer", "discrepancies", "explanation"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "validate_question" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Payment required' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const result = await response.json();
    
    // Parse tool call response
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'validate_question') {
      throw new Error('Invalid tool response');
    }

    const validationData = JSON.parse(toolCall.function.arguments);
    
    const validationResult: ValidationResult = {
      isValid: validationData.is_valid,
      confidence: validationData.confidence,
      calculatedAnswer: validationData.calculated_answer,
      discrepancies: validationData.discrepancies || [],
      suggestedCorrection: validationData.suggested_correction || null,
      explanation: validationData.explanation
    };

    console.log(`✅ Validation complete: ${validationResult.isValid ? 'VALID' : 'INVALID'} (${(validationResult.confidence * 100).toFixed(0)}%)`);
    
    if (!validationResult.isValid) {
      console.log(`⚠️ Discrepancies: ${validationResult.discrepancies.join(', ')}`);
      console.log(`💡 Calculated answer: ${validationResult.calculatedAnswer}`);
    }

    return new Response(JSON.stringify({
      success: true,
      validation: validationResult,
      templateId,
      grade,
      subject
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Validation error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function getSystemPrompt(): string {
  return `Du bist ein mathematischer Prüfer, der Aufgaben und Antworten auf Korrektheit validiert.

DEINE AUFGABE:
1. Lies die Aufgabe sorgfältig
2. Berechne die korrekte Antwort SELBST
3. Vergleiche mit der angegebenen "richtigen" Antwort
4. Melde Diskrepanzen

KRITISCHE PRÜFUNGEN:
- Bei Geldaufgaben: "X zu je Y €" = X × Y (NICHT X + Y!)
- Bei Flächenaufgaben: Alle Maße berücksichtigen, Abzüge nicht vergessen
- Bei Prozent: Grundwert korrekt identifizieren
- Bei Einheiten: Konsistente Umrechnung

ANTWORTFORMAT:
- is_valid: true NUR wenn die angegebene Antwort mathematisch korrekt ist
- confidence: Wie sicher du dir bist (0.0-1.0)
- calculated_answer: Die Antwort, die DU berechnet hast
- discrepancies: Liste aller gefundenen Fehler
- suggested_correction: Die richtige Antwort, falls die angegebene falsch ist

Sei SEHR genau bei mathematischen Berechnungen!`;
}

function buildValidationPrompt(
  question: string,
  correctAnswer: string,
  userAnswer: string | undefined,
  explanation: string | undefined,
  grade: number,
  subject: string
): string {
  let prompt = `VALIDIERE DIESE AUFGABE:

**Klassenstufe:** ${grade}
**Fach:** ${subject}

**Aufgabentext:**
${question}

**Angegebene "richtige" Antwort:** ${correctAnswer}`;

  if (userAnswer) {
    prompt += `\n**Nutzerantwort:** ${userAnswer}`;
  }

  if (explanation) {
    prompt += `\n\n**Mitgelieferte Erklärung:**
${explanation}`;
  }

  prompt += `

AUFGABEN:
1. Berechne die korrekte Antwort selbst Schritt für Schritt
2. Vergleiche dein Ergebnis mit der angegebenen "richtigen" Antwort
3. Prüfe, ob die Erklärung zur Antwort passt
4. Melde alle Unstimmigkeiten

Nutze das validate_question Tool für deine Antwort.`;

  return prompt;
}
