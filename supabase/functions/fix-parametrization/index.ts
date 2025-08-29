import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Phase 4: Implementing parametrization for generated templates');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Need service role for updates
    );
    
    // Get active math templates that need parametrization
    const { data: templates, error: fetchError } = await supabase
      .from('generated_templates')
      .select('*')
      .eq('category', 'math')
      .eq('is_active', true)
      .limit(50);
    
    if (fetchError) {
      throw new Error(`Failed to fetch templates: ${fetchError.message}`);
    }
    
    console.log(`📚 Found ${templates.length} active math templates to parametrize`);
    
    let parametrized = 0;
    let failed = 0;
    
    for (const template of templates) {
      try {
        // Analyze template content for parametrization potential
        const content = template.content || '';
        const hasNumbers = /\d+/.test(content);
        
        if (!hasNumbers) {
          console.log(`⏭️ Skipping template ${template.id} - no numbers found`);
          continue;
        }
        
        // Create parameter definitions based on content analysis
        const parameters = this.analyzeTemplateForParameters(content, template.grade);
        
        if (parameters.length > 0) {
          // Update template with parameter definitions
          const { error: updateError } = await supabase
            .from('generated_templates')
            .update({
              // Add parameter_definitions as a new column or use content modification
              content: this.parametrizeContent(content, parameters),
              updated_at: new Date().toISOString()
            })
            .eq('id', template.id);
          
          if (updateError) {
            console.error(`❌ Failed to parametrize template ${template.id}:`, updateError);
            failed++;
          } else {
            console.log(`✅ Parametrized template ${template.id}`);
            parametrized++;
          }
        }
      } catch (error) {
        console.error(`❌ Error processing template ${template.id}:`, error);
        failed++;
      }
    }
    
    // Update curriculum rules for grade-appropriate parameters
    await this.updateCurriculumRules(supabase);
    
    return new Response(JSON.stringify({
      status: 'parametrization_complete',
      templates_processed: templates.length,
      templates_parametrized: parametrized,
      templates_failed: failed,
      success_rate: templates.length > 0 ? (parametrized / templates.length * 100).toFixed(1) + '%' : '0%'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Parametrization failed:', error);
    return new Response(JSON.stringify({
      error: error.message,
      status: 'failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper functions (would normally be in separate files)
function analyzeTemplateForParameters(content: string, grade: number): Array<{name: string, type: string, min: number, max: number}> {
  const parameters = [];
  
  // Extract numbers and create parameters
  const numbers = content.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    // Define grade-appropriate ranges
    const ranges = {
      1: { min: 1, max: 10 },
      2: { min: 1, max: 20 },
      3: { min: 1, max: 100 },
      4: { min: 1, max: 1000 },
      5: { min: 1, max: 10000 }
    };
    
    const range = ranges[Math.min(grade, 5)] || { min: 1, max: 100 };
    
    // Create parameter for each number position
    for (let i = 0; i < Math.min(numbers.length, 3); i++) {
      parameters.push({
        name: `value${i + 1}`,
        type: 'number',
        min: range.min,
        max: range.max
      });
    }
  }
  
  return parameters;
}

function parametrizeContent(content: string, parameters: Array<any>): string {
  let parametrized = content;
  const numbers = content.match(/\d+/g);
  
  if (numbers && parameters.length > 0) {
    // Replace first few numbers with parameters
    for (let i = 0; i < Math.min(numbers.length, parameters.length); i++) {
      const number = numbers[i];
      const paramName = parameters[i].name;
      parametrized = parametrized.replace(number, `{${paramName}}`);
    }
  }
  
  return parametrized;
}

async function updateCurriculumRules(supabase: any): Promise<void> {
  // Insert curriculum parameter rules for different grades and domains
  const rules = [
    { grade: 1, domain: 'Zahlen & Operationen', quarter: 'Q1', zahlenraum_min: 1, zahlenraum_max: 10 },
    { grade: 1, domain: 'Zahlen & Operationen', quarter: 'Q2', zahlenraum_min: 1, zahlenraum_max: 20 },
    { grade: 2, domain: 'Zahlen & Operationen', quarter: 'Q1', zahlenraum_min: 1, zahlenraum_max: 100 },
    { grade: 3, domain: 'Zahlen & Operationen', quarter: 'Q1', zahlenraum_min: 1, zahlenraum_max: 1000 },
    { grade: 4, domain: 'Zahlen & Operationen', quarter: 'Q1', zahlenraum_min: 1, zahlenraum_max: 10000 }
  ];
  
  for (const rule of rules) {
    await supabase
      .from('curriculum_parameter_rules')
      .upsert(rule, { onConflict: 'grade,domain,quarter' });
  }
}