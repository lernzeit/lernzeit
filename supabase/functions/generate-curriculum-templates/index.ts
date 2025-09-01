import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎯 PHASE 3: Massive curriculum-compliant template generation');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Generate templates for Grade 4 Q4 (the problematic case)
    const targetGeneration = [
      { grade: 4, quarter: 'Q4', domain: 'Zahlen & Operationen', count: 20 },
      { grade: 4, quarter: 'Q4', domain: 'Größen & Messen', count: 15 },
      { grade: 4, quarter: 'Q4', domain: 'Raum & Form', count: 15 },
      { grade: 4, quarter: 'Q4', domain: 'Daten & Zufall', count: 10 },
    ];

    const results = [];

    for (const { grade, quarter, domain, count } of targetGeneration) {
      console.log(`📝 Generating ${count} templates for Grade ${grade} ${quarter} ${domain}`);
      
      try {
        const response = await supabase.functions.invoke('template-generator', {
          body: {
            grade,
            domain,
            quarter,
            count,
            difficulty: 'AFB I'
          }
        });

        if (response.error) {
          console.error(`❌ Error generating ${domain} templates:`, response.error);
          results.push({ grade, quarter, domain, success: false, error: response.error.message });
        } else {
          console.log(`✅ Generated ${domain} templates:`, response.data);
          results.push({ grade, quarter, domain, success: true, generated: response.data?.generated || 0 });
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed to generate ${domain} templates:`, error);
        results.push({ grade, quarter, domain, success: false, error: error.message });
      }
    }

    // Summary
    const totalGenerated = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + (r.generated || 0), 0);

    console.log(`🎉 PHASE 3 COMPLETE: Generated ${totalGenerated} curriculum-compliant templates`);

    return new Response(JSON.stringify({
      success: true,
      message: `Generated ${totalGenerated} curriculum-compliant templates for Grade 4 Q4`,
      results,
      totalGenerated
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    
  } catch (error) {
    console.error('Curriculum template generation error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      phase: 'PHASE 3: Curriculum Template Generation'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});