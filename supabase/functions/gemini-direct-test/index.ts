import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 Direct Gemini API Test');
    
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;
    
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }
    
    console.log('✅ API Key found, testing direct Gemini call...');
    
    const testPrompt = `Create 1 simple math template for Grade 4:
{
  "grade": 4,
  "question_type": "multiple-choice", 
  "student_prompt": "Was ist 15 + 27?",
  "variables": {"options": ["42", "32", "52", "41"], "correct_idx": 0},
  "solution": {"value": "42"},
  "explanation": "Rechne 15 + 27 = 42"
}

Return ONLY the JSON template.`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + geminiApiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: testPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1024,
        }
      })
    });

    console.log('📡 Gemini API Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API Error:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Gemini API Success:', JSON.stringify(data, null, 2));
    
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return new Response(JSON.stringify({
      success: true,
      message: "Direct Gemini API test successful",
      status: response.status,
      generatedText,
      fullResponse: data,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Direct Gemini test error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});