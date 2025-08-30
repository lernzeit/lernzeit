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
    console.log('🚀 PHASE 2: Starting mass template generation for missing grades 5-10');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const domains = [
      'Zahlen & Operationen',
      'Raum & Form', 
      'Größen & Messen',
      'Daten & Zufall'
    ];
    
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const grades = [5, 6, 7, 8, 9, 10]; // Missing grades
    const difficulties = ['AFB I', 'AFB II', 'AFB III'];
    
    let totalGenerated = 0;
    const results = [];
    
    // Generate templates for each combination
    for (const grade of grades) {
      for (const domain of domains) {
        for (const quarter of quarters) {
          for (const difficulty of difficulties) {
            
            // Check existing count
            const { data: existing } = await supabase
              .from('templates')
              .select('id')
              .eq('grade', grade)
              .eq('domain', domain)
              .eq('quarter_app', quarter)
              .eq('difficulty', difficulty)
              .eq('status', 'ACTIVE');
            
            const existingCount = existing?.length || 0;
            const target = 17; // ~17 per combination = 2000 total per grade
            const needed = Math.max(0, target - existingCount);
            
            if (needed === 0) continue;
            
            console.log(`📊 Generating ${needed} templates: Grade ${grade}, ${domain}, ${quarter}, ${difficulty}`);
            
            try {
              // Call template generator
              const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/template-generator`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
                },
                body: JSON.stringify({
                  grade,
                  domain,
                  quarter,
                  difficulty,
                  count: needed
                })
              });
              
              if (response.ok) {
                const result = await response.json();
                totalGenerated += result.generated || 0;
                results.push({
                  grade,
                  domain, 
                  quarter,
                  difficulty,
                  generated: result.generated || 0,
                  existing: existingCount
                });
              }
              
              // Small delay to avoid rate limits
              await new Promise(resolve => setTimeout(resolve, 100));
              
            } catch (error) {
              console.error(`Error generating templates for ${grade}/${domain}/${quarter}/${difficulty}:`, error);
            }
          }
        }
      }
    }
    
    // Summary
    const summary = {
      total_generated: totalGenerated,
      combinations_processed: results.length,
      grades_covered: grades,
      domains_covered: domains.length,
      target_per_grade: 2000,
      results: results.slice(0, 10) // First 10 results for preview
    };
    
    console.log(`✅ PHASE 2 COMPLETE: Generated ${totalGenerated} new templates across ${results.length} combinations`);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Generated ${totalGenerated} templates for grades 5-10`,
      ...summary
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    
  } catch (error) {
    console.error('Mass generation error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});