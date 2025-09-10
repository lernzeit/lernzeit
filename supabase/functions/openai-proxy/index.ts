import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { model, messages, max_completion_tokens, temperature } = await req.json();

    console.log('OpenAI Proxy Request:', { 
      model, 
      messageCount: messages?.length,
      maxTokens: max_completion_tokens 
    });

    // Build request body based on model
    const requestBody: any = {
      model: model || 'gpt-5-2025-08-07',
      messages: messages || []
    };

    // Use appropriate token parameter based on model
    if (model && model.startsWith('gpt-5') || model && model.startsWith('gpt-4.1') || model && model.startsWith('o3') || model && model.startsWith('o4')) {
      // Newer models use max_completion_tokens
      if (max_completion_tokens) {
        requestBody.max_completion_tokens = max_completion_tokens;
      }
      // Don't include temperature for newer models as it's not supported
    } else {
      // Legacy models use max_tokens
      if (max_completion_tokens) {
        requestBody.max_tokens = max_completion_tokens;
      }
      if (temperature !== undefined) {
        requestBody.temperature = temperature;
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Log successful response
    console.log('OpenAI API Success:', {
      model: data.model,
      usage: data.usage,
      choices: data.choices?.length
    });

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('OpenAI Proxy Error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Unknown error',
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});