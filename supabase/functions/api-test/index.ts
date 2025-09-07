import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 API Test Phase 1.1: Einzeltemplate-Test');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phase = "1.1", count = 1 } = await req.json();
    
    // Phase 1.1: Single template test (Grade 4, Q4, "Zahlen & Operationen", AFB I)
    if (phase === "1.1") {
      console.log('📝 Testing: Grade 4, Q4, Zahlen & Operationen, AFB I, 1 Template');
      
      const response = await supabase.functions.invoke('template-generator', {
        body: {
          grade: 4,
          quarter: "Q4", 
          domain: "Zahlen & Operationen",
          difficulty: "AFB I",
          templatesCount: 1,
          curriculumContent: "Rechenstrategien reflektieren, kombinierte Aufgaben mit Klammern, Punkt- und Strichrechnung",
          enhancedQuality: true,
          questionTypeRotation: true,
          antiVisualConstraints: true
        }
      });

      console.log('✅ Phase 1.1 Response:', response);
      
      if (response.error) {
        return new Response(JSON.stringify({
          phase: "1.1",
          success: false,
          error: response.error,
          message: "Einzeltemplate-Test failed"
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        phase: "1.1", 
        success: true,
        message: "Einzeltemplate-Test successful",
        data: response.data,
        templatesGenerated: response.data?.templatesGenerated || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Phase 1.2: Scale test (5 templates)
    if (phase === "1.2") {
      console.log(`📝 Testing: Grade 4, Q4, Zahlen & Operationen, AFB I, ${count} Templates`);
      
      const response = await supabase.functions.invoke('template-generator', {
        body: {
          grade: 4,
          quarter: "Q4",
          domain: "Zahlen & Operationen", 
          difficulty: "AFB I",
          templatesCount: count,
          curriculumContent: "Rechenstrategien reflektieren, kombinierte Aufgaben mit Klammern, Punkt- und Strichrechnung",
          enhancedQuality: true,
          questionTypeRotation: true,
          antiVisualConstraints: true
        }
      });

      console.log(`✅ Phase 1.2 Response (${count} templates):`, response);
      
      return new Response(JSON.stringify({
        phase: "1.2",
        count,
        success: !response.error,
        error: response.error || null,
        message: response.error ? `Scale test with ${count} templates failed` : `Scale test with ${count} templates successful`,
        data: response.data,
        templatesGenerated: response.data?.templatesGenerated || 0
      }), {
        status: response.error ? 500 : 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Phase 2: Multiple combinations test
    if (phase === "2") {
      console.log('📝 Phase 2: Testing multiple combinations');
      
      const testCombinations = [
        { grade: 4, quarter: "Q4", domain: "Zahlen & Operationen" },
        { grade: 4, quarter: "Q4", domain: "Größen & Messen" },
        { grade: 3, quarter: "Q4", domain: "Zahlen & Operationen" }
      ];

      const results = [];
      
      for (const combo of testCombinations) {
        const curriculumContent = getCurriculumContent(combo.grade, combo.quarter, combo.domain);
        
        const response = await supabase.functions.invoke('template-generator', {
          body: {
            ...combo,
            difficulty: "AFB I",
            templatesCount: 5,
            curriculumContent,
            enhancedQuality: true,
            questionTypeRotation: true,
            antiVisualConstraints: true
          }
        });

        results.push({
          combination: `${combo.grade}-${combo.quarter}-${combo.domain}`,
          success: !response.error,
          templatesGenerated: response.data?.templatesGenerated || 0,
          error: response.error?.message || null
        });

        console.log(`✅ Generated for ${combo.grade}-${combo.quarter}-${combo.domain}: ${response.data?.templatesGenerated || 0} templates`);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return new Response(JSON.stringify({
        phase: "2",
        success: true,
        message: "Multiple combinations test completed",
        results,
        totalTemplates: results.reduce((sum, r) => sum + r.templatesGenerated, 0)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      error: "Invalid phase. Use phase 1.1, 1.2, or 2"
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ API Test error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function getCurriculumContent(grade: number, quarter: string, domain: string): string {
  const curriculum: any = {
    3: {
      "Q4": {
        "Zahlen & Operationen": "Dezimalzahlen (Geld), Stellenwertsystem"
      }
    },
    4: {
      "Q4": {
        "Zahlen & Operationen": "Rechenstrategien reflektieren, kombinierte Aufgaben mit Klammern, Punkt- und Strichrechnung",
        "Größen & Messen": "Umrechnungen in Sachaufgaben, Maßstäbe (Textbasiert)"
      }
    }
  };
  
  return curriculum[grade]?.[quarter]?.[domain] || "Standard curriculum content";
}