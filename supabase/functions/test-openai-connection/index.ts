import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    console.log('Testing API connections...');
    console.log('OpenAI Key exists:', !!openAIApiKey);
    console.log('Gemini Key exists:', !!geminiApiKey);

    // Test OpenAI
    let openAIResult = null;
    if (openAIApiKey) {
      try {
        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Test' }],
            max_completion_tokens: 10
          }),
        });

        if (openAIResponse.ok) {
          const data = await openAIResponse.json();
          openAIResult = { success: true, model: data.model };
        } else {
          const error = await openAIResponse.text();
          openAIResult = { success: false, error, status: openAIResponse.status };
        }
      } catch (error) {
        openAIResult = { success: false, error: error.message };
      }
    }

    // Test Gemini
    let geminiResult = null;
    if (geminiApiKey) {
      try {
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Test' }] }]
          }),
        });

        if (geminiResponse.ok) {
          geminiResult = { success: true };
        } else {
          const error = await geminiResponse.text();
          geminiResult = { success: false, error, status: geminiResponse.status };
        }
      } catch (error) {
        geminiResult = { success: false, error: error.message };
      }
    }

    console.log('OpenAI Result:', openAIResult);
    console.log('Gemini Result:', geminiResult);

    return new Response(JSON.stringify({
      openAI: openAIResult,
      gemini: geminiResult,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Connection test error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});