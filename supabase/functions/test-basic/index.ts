import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  console.log('🔥 BASIC TEST FUNCTION RUNNING');
  
  return new Response(JSON.stringify({
    message: 'Basic test function works',
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});