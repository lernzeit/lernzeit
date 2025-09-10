import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting diagnostic test...');
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('🔍 Environment check:');
    console.log('OpenAI Key exists:', !!openaiApiKey);
    console.log('OpenAI Key prefix:', openaiApiKey ? openaiApiKey.substring(0, 10) : 'MISSING');
    console.log('Supabase URL exists:', !!supabaseUrl);
    console.log('Supabase Service Key exists:', !!supabaseServiceKey);

    if (!openaiApiKey) {
      console.error('❌ OpenAI API key missing');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key missing',
        openaiKeyExists: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test simple OpenAI call
    console.log('🤖 Testing OpenAI API...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Sage nur das Wort "TEST"' }
        ],
        max_completion_tokens: 10
      }),
    });
    
    const responseData = await response.json();
    console.log('OpenAI Response Status:', response.status);
    console.log('OpenAI Response:', JSON.stringify(responseData));
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Diagnostic completed',
      openaiStatus: response.status,
      openaiResponse: responseData,
      environmentCheck: {
        openaiKeyExists: !!openaiApiKey,
        supabaseUrlExists: !!supabaseUrl,
        supabaseServiceKeyExists: !!supabaseServiceKey
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    return new Response(JSON.stringify({ 
      error: 'Diagnostic failed', 
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});