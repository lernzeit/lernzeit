import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🔥 SIMPLE TEST STARTING');
  console.log('Current time:', new Date().toISOString());
  
  return new Response(JSON.stringify({
    message: "Simple test works!",
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});