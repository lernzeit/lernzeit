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
    console.log('🤖 Auto-Generator: Starting scheduled question generation...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if we need more templates
    const { data: templateCount, error: countError } = await supabase
      .from('templates')
      .select('count', { count: 'exact' })
      .limit(0);

    if (countError) {
      console.error('❌ Error counting templates:', countError);
      throw countError;
    }

    const currentCount = templateCount || 0;
    console.log(`📊 Current template count: ${currentCount}`);

    // Target: 1000+ templates, generate if below 500
    const needsGeneration = currentCount < 500;
    
    if (!needsGeneration) {
      console.log('✅ Sufficient templates available, skipping generation');
      return new Response(JSON.stringify({
        success: true,
        message: `Sufficient templates (${currentCount}), no generation needed`,
        currentCount,
        generated: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate for random combination
    const grades = [1, 2, 3, 4, 5];
    const quarters = ["Q1", "Q2", "Q3", "Q4"];
    const domains = [
      "Zahlen & Operationen",
      "Größen & Messen", 
      "Raum & Form",
      "Daten & Zufall"
    ];

    const randomGrade = grades[Math.floor(Math.random() * grades.length)];
    const randomQuarter = quarters[Math.floor(Math.random() * quarters.length)];
    const randomDomain = domains[Math.floor(Math.random() * domains.length)];

    console.log(`🎲 Generating for Grade ${randomGrade}, ${randomQuarter}, ${randomDomain}`);

    const { data: generateResult, error: generateError } = await supabase.functions.invoke('generate-questions', {
      body: {
        grade: randomGrade,
        quarter: randomQuarter,
        domain: randomDomain,
        count: 10,
        difficulty: 'AFB I'
      }
    });

    if (generateError) {
      console.error('❌ Generation error:', generateError);
      throw generateError;
    }

    console.log('✅ Auto-generation completed:', generateResult);

    return new Response(JSON.stringify({
      success: true,
      currentCount,
      generated: generateResult?.generated || 0,
      combination: { grade: randomGrade, quarter: randomQuarter, domain: randomDomain },
      generateResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Auto-generator error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});