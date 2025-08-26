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

  const requestId = `cron_${Date.now()}_${Math.random()}`;
  
  try {
    console.log(`🔄 [${requestId}] Starting template generation cron job`);
    
    const results = {
      generated: 0,
      errors: 0,
      subjects: [] as string[],
      duration: 0
    };
    
    const startTime = Date.now();

    // Process Math domains systematically based on curriculum
    for (const domain of MATH_DOMAINS) {
      console.log(`📐 [${requestId}] Processing Math domain: ${domain}`);
      
      for (const grade of GRADES) {
        try {
          // Check current template count for this domain/grade in templates table
          const { data: existingTemplates, error: countError } = await supabase
            .from('templates')
            .select('id, quarter_app')
            .eq('domain', domain)
            .eq('grade', grade)
            .eq('status', 'ACTIVE');

          if (countError) {
            console.error(`❌ [${requestId}] Error counting templates for ${domain} Grade ${grade}:`, countError);
            results.errors++;
            continue;
          }

          const existingCount = existingTemplates?.length || 0;
          const targetCount = TEMPLATES_PER_DOMAIN_GRADE_QUARTER * QUARTERS.length; // 60 total per domain/grade
          
          // Skip if we already have enough templates
          if (existingCount >= targetCount) {
            console.log(`✅ [${requestId}] ${domain} Grade ${grade}: ${existingCount} templates already exist, skipping`);
            continue;
          }

          const neededTemplates = Math.min(TEMPLATES_PER_DOMAIN_GRADE_QUARTER, targetCount - existingCount);
          console.log(`🎯 [${requestId}] ${domain} Grade ${grade}: Need ${neededTemplates} templates (${existingCount} existing)`);

          // Use seed_templates function which is designed for systematic generation
          const response = await supabase.functions.invoke('seed_templates', {
            body: {
              grade: grade,
              domain: domain,
              n: neededTemplates
            }
          });

          if (response.error) {
            console.error(`❌ [${requestId}] Error generating templates for ${domain} Grade ${grade}:`, response.error);
            results.errors++;
            continue;
          }

          const generatedCount = response.data?.data?.total_inserted || 0;
          console.log(`✅ [${requestId}] Generated ${generatedCount} templates for ${domain} Grade ${grade}`);
          
          results.generated += generatedCount;
          results.subjects.push(`${domain}-${grade}`);

          // Add diversity factor - don't generate too many similar templates in one batch
          if (generatedCount > 0) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // Longer delay for diversity
          }
          
          // Clean up old templates if we have too many
          if (existingCount + generatedCount > MAX_TEMPLATES_TO_KEEP) {
            const { error: deleteError } = await supabase
              .from('templates')
              .delete()
              .eq('domain', domain)
              .eq('grade', grade)
              .order('created_at', { ascending: true })
              .limit((existingCount + generatedCount) - MAX_TEMPLATES_TO_KEEP);

            if (deleteError) {
              console.error(`⚠️ [${requestId}] Error cleaning up old templates for ${domain} Grade ${grade}:`, deleteError);
            } else {
              console.log(`🧹 [${requestId}] Cleaned up old templates for ${domain} Grade ${grade}`);
            }
          }

          // Add small delay between requests to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          console.error(`❌ [${requestId}] Error processing ${domain} Grade ${grade}:`, error);
          results.errors++;
        }
      }
    }

    results.duration = Date.now() - startTime;

    console.log(`🏁 [${requestId}] Cron job completed:`, {
      generated: results.generated,
      errors: results.errors,
      subjects: results.subjects.length,
      duration: `${results.duration}ms`
    });

    return new Response(JSON.stringify({
      success: true,
      requestId,
      results,
      message: `Generated ${results.generated} templates across ${results.subjects.length} subject-grade combinations`
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