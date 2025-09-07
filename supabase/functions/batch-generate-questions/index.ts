import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const grades = [1, 2, 3];
    const quarters = ["Q1", "Q2", "Q3", "Q4"];
    const domains = [
      "Zahlen & Operationen",
      "Größen & Messen", 
      "Raum & Form",
      "Daten & Zufall"
    ];
    
    const questionsPerCombination = 5;
    let totalGenerated = 0;
    let totalErrors = 0;
    const results: any[] = [];

    console.log(`🚀 Starting batch generation for ${grades.length} grades × ${quarters.length} quarters × ${domains.length} domains × ${questionsPerCombination} questions`);

    for (const grade of grades) {
      for (const quarter of quarters) {
        for (const domain of domains) {
          try {
            console.log(`📝 Generating questions for Grade ${grade}, ${quarter}, ${domain}`);
            
            // Call the generate-questions function
            const { data, error } = await supabase.functions.invoke('generate-questions', {
              body: {
                grade,
                quarter,
                domain,
                count: questionsPerCombination,
                difficulty: 'AFB I'
              }
            });

            if (error) throw error;

            if (data?.success) {
              totalGenerated += data.generated || 0;
              results.push({
                grade,
                quarter, 
                domain,
                generated: data.generated,
                status: 'success'
              });
              console.log(`✅ Generated ${data.generated} questions for Grade ${grade}, ${quarter}, ${domain}`);
            } else {
              totalErrors++;
              results.push({
                grade,
                quarter,
                domain, 
                error: data?.error || 'Unknown error',
                status: 'error'
              });
              console.log(`❌ Failed for Grade ${grade}, ${quarter}, ${domain}: ${data?.error}`);
            }

            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 1000));

          } catch (error) {
            totalErrors++;
            results.push({
              grade,
              quarter,
              domain,
              error: error.message,
              status: 'error'
            });
            console.error(`❌ Error for Grade ${grade}, ${quarter}, ${domain}:`, error);
          }
        }
      }
    }

    console.log(`🎯 Batch generation completed: ${totalGenerated} questions generated, ${totalErrors} errors`);

    return new Response(JSON.stringify({
      success: true,
      totalGenerated,
      totalErrors,
      totalCombinations: grades.length * quarters.length * domains.length,
      questionsPerCombination,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Batch generation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});