import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration - Focus on Mathematics based on curriculum
const MATH_DOMAINS = [
  'Zahlen & Operationen',
  'Größen & Messen', 
  'Raum & Form',
  'Gleichungen & Funktionen',
  'Daten & Zufall'
];
const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const TEMPLATES_PER_DOMAIN_GRADE_QUARTER = 12; // 60 total per grade/domain (12 x 5 quarters including seasonal variation)
const MAX_TEMPLATES_TO_KEEP = 80;

interface TemplateGenerationRequest {
  category: string;
  grade: number;
  count: number;
  excludeQuestions?: string[];
  sessionId?: string;
  requestId?: string;
  gradeRequirement?: string;
  qualityThreshold?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const requestId = `cron_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`🔄 [${requestId}] Starting template generation cron job`);
    
    const startTime = Date.now();

    // Call math-curriculum-seeder to handle systematic curriculum-based generation
    console.log(`📚 [${requestId}] Invoking math-curriculum-seeder`);
    const response = await supabase.functions.invoke('math-curriculum-seeder', {
      body: {
        trigger: 'cron_job',
        requestId: requestId
      }
    });

    if (response.error) {
      console.error(`❌ [${requestId}] Error from math-curriculum-seeder:`, response.error);
      throw new Error(`Math curriculum seeder failed: ${response.error.message}`);
    }

    const duration = Date.now() - startTime;
    const seederResult = response.data?.data || {};

    console.log(`🏁 [${requestId}] Cron job completed:`, {
      generated: seederResult.total_inserted || 0,
      processed: seederResult.processed_combinations || 0,
      errors: seederResult.errors?.length || 0,
      duration: `${duration}ms`
    });

    return new Response(JSON.stringify({
      success: true,
      requestId,
      result: seederResult,
      duration,
      message: `Math curriculum seeder completed - Generated ${seederResult.total_inserted || 0} templates`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`💥 [${requestId}] Cron job failed:`, error);
    
    return new Response(JSON.stringify({
      success: false,
      requestId,
      error: error.message,
      message: 'Template generation cron job failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});