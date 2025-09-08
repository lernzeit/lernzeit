import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

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
    console.log('🔥 Batch generation started');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Supabase credentials missing');
      return new Response(JSON.stringify({ error: 'Supabase credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const grades = [1, 2, 3, 4, 5];
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const domains = [
      'Zahlen & Operationen',
      'Raum & Form',
      'Größen & Messen',
      'Daten & Zufall'
    ];

    let totalGenerated = 0;
    let totalErrors = 0;
    const results = [];

    console.log(`🎲 Processing ${grades.length * quarters.length * domains.length} combinations...`);

    for (const grade of grades) {
      for (const quarter of quarters) {
        for (const domain of domains) {
          try {
            console.log(`📚 Processing: Grade ${grade}, ${quarter}, ${domain}`);
            
            const { data, error } = await supabase.functions.invoke('generate-questions', {
              body: {
                grade,
                quarter,
                domain,
                count: 2, // Smaller batches to avoid timeouts
                difficulty: 'AFB I'
              }
            });

            if (error) {
              console.error(`❌ Error for ${grade}-${quarter}-${domain}:`, error);
              totalErrors++;
              results.push({
                grade,
                quarter,
                domain,
                success: false,
                error: error.message
              });
            } else {
              console.log(`✅ Success for ${grade}-${quarter}-${domain}:`, data?.inserted || 0);
              totalGenerated += data?.inserted || 0;
              results.push({
                grade,
                quarter,
                domain,
                success: true,
                generated: data?.inserted || 0
              });
            }

            // Small delay between requests to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (batchError) {
            console.error(`❌ Batch error for ${grade}-${quarter}-${domain}:`, batchError);
            totalErrors++;
            results.push({
              grade,
              quarter,
              domain,
              success: false,
              error: batchError.message
            });
          }
        }
      }
    }

    const successRate = Math.round((results.filter(r => r.success).length / results.length) * 100);

    console.log(`🎉 Batch generation complete: ${totalGenerated} questions, ${totalErrors} errors, ${successRate}% success rate`);

    return new Response(JSON.stringify({
      success: true,
      totalGenerated,
      totalErrors,
      successRate: `${successRate}%`,
      totalCombinations: results.length,
      results: results.slice(0, 10), // First 10 results for brevity
      message: `Batch generation completed. Generated ${totalGenerated} questions with ${successRate}% success rate.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Batch generation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Batch generation failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});