import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log(`🔍 Test API called: ${req.method} ${req.url}`);
    
    // Get environment variables
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('🔑 OpenAI API Key:', openaiApiKey ? `${openaiApiKey.substring(0, 10)}...` : 'NOT SET');
    
    // Parse request body
    let requestBody = {};
    try {
      requestBody = await req.json();
    } catch {
      // Ignore JSON parse errors for test endpoint
    }

    const testResult = {
      success: true,
      message: 'Test API is working correctly',
      timestamp: new Date().toISOString(),
      environment: {
        openaiApiKey: !!openaiApiKey,
        supabaseUrl: !!supabaseUrl,
        supabaseServiceKey: !!supabaseServiceKey,
      },
      request: {
        method: req.method,
        url: req.url,
        body: requestBody,
      }
    };

    console.log('✅ Test completed successfully');

    return new Response(JSON.stringify(testResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Test API error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Test API failed', 
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});