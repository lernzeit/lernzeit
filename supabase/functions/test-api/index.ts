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
    console.log('🧪 TEST API FUNCTION CALLED!');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('🔑 OpenAI Key present:', !!openaiKey);
    console.log('🔑 Supabase URL present:', !!supabaseUrl);
    console.log('🔑 Service Key present:', !!supabaseServiceKey);
    
    if (openaiKey) {
      console.log('🔑 OpenAI Key starts with:', openaiKey.substring(0, 10) + '...');
    }
    
    const body = await req.json().catch(() => ({}));
    console.log('📥 Request body:', body);
    
    const testResult = {
      success: true,
      message: 'Test API function is working!',
      timestamp: new Date().toISOString(),
      environment: {
        openaiKeyPresent: !!openaiKey,
        openaiKeyPreview: openaiKey ? openaiKey.substring(0, 10) + '...' : 'NOT SET',
        supabaseUrlPresent: !!supabaseUrl,
        supabaseServiceKeyPresent: !!supabaseServiceKey
      },
      requestInfo: {
        method: req.method,
        url: req.url,
        body: body
      }
    };

    console.log('✅ Test completed successfully');
    console.log('📋 Result:', testResult);

    return new Response(JSON.stringify(testResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Test API error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      message: 'Test API function failed!'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});