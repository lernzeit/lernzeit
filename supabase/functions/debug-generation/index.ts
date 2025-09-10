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

    const diagnostics = {
      timestamp: new Date().toISOString(),
      openaiKeyExists: !!openaiApiKey,
      openaiKeyPrefix: openaiApiKey ? openaiApiKey.substring(0, 10) : 'MISSING',
      supabaseUrlExists: !!supabaseUrl,
      supabaseServiceKeyExists: !!supabaseServiceKey,
    };

    console.log('🔍 Environment check:', diagnostics);

    // Test 1: Simple OpenAI API call
    let openaiTest = null;
    if (openaiApiKey) {
      try {
        console.log('🤖 Testing OpenAI API...');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'user', content: 'Sage nur das Wort "TEST"' }
            ],
            max_tokens: 10
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          openaiTest = {
            success: true,
            content: data.choices[0]?.message?.content
          };
          console.log('✅ OpenAI API test successful');
        } else {
          const errorText = await response.text();
          openaiTest = {
            success: false,
            status: response.status,
            error: errorText
          };
          console.log('❌ OpenAI API test failed:', response.status, errorText);
        }
      } catch (err) {
        openaiTest = {
          success: false,
          error: err.message
        };
        console.log('❌ OpenAI API test exception:', err.message);
      }
    }

    // Test 2: Database connection
    let dbTest = null;
    if (supabaseUrl && supabaseServiceKey) {
      try {
        console.log('🗄️ Testing database connection...');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { count, error } = await supabase
          .from('templates')
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          dbTest = {
            success: false,
            error: error.message
          };
          console.log('❌ Database test failed:', error.message);
        } else {
          dbTest = {
            success: true,
            templateCount: count
          };
          console.log('✅ Database test successful, templates:', count);
        }
      } catch (err) {
        dbTest = {
          success: false,
          error: err.message
        };
        console.log('❌ Database test exception:', err.message);
      }
    }

    const results = {
      diagnostics,
      openaiTest,
      dbTest,
      overall: openaiTest?.success && dbTest?.success
    };

    console.log('🎯 Diagnostic completed:', results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    return new Response(JSON.stringify({ 
      error: 'Diagnostic failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});