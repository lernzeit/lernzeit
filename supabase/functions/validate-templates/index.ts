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
    console.log('🔍 Starting template validation for visual content...');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Visual keywords to check for
    const visualKeywords = [
      'zeichn', 'zeich', 'mal ', 'konstruier', 'entwirf', 'bild', 
      'ordne', 'verbind', 'diagramm', 'grafik', 'skizz', 'netz',
      'draw', 'paint', 'figur', 'körper', 'winkel', 'gerade'
    ];
    
    // Check for remaining visual templates
    const { data: visualTemplates } = await supabase
      .from('templates')
      .select('id, grade, domain, subcategory, student_prompt')
      .eq('status', 'ACTIVE')
      .or(visualKeywords.map(keyword => `student_prompt.ilike.%${keyword}%`).join(','));
    
    console.log(`Found ${visualTemplates?.length || 0} potentially visual templates`);
    
    // Remove any remaining visual templates
    let removedCount = 0;
    if (visualTemplates && visualTemplates.length > 0) {
      const idsToRemove = visualTemplates.map(t => t.id);
      
      const { error } = await supabase
        .from('templates')
        .delete()
        .in('id', idsToRemove);
      
      if (!error) {
        removedCount = visualTemplates.length;
        console.log(`✅ Removed ${removedCount} visual templates`);
      } else {
        console.error('❌ Error removing visual templates:', error);
      }
    }
    
    // Get final counts
    const { data: finalCount } = await supabase
      .from('templates')
      .select('id', { count: 'exact' })
      .eq('status', 'ACTIVE');
    
    // Validate no visual content remains
    const { data: remainingVisual } = await supabase
      .from('templates')
      .select('id')
      .eq('status', 'ACTIVE')
      .or(visualKeywords.map(keyword => `student_prompt.ilike.%${keyword}%`).join(','));
    
    const validationResult = {
      success: (remainingVisual?.length || 0) === 0,
      total_active_templates: finalCount?.length || 0,
      visual_templates_removed: removedCount,
      remaining_visual_templates: remainingVisual?.length || 0,
      validation_keywords: visualKeywords,
      message: (remainingVisual?.length || 0) === 0 
        ? 'All visual templates successfully removed'
        : `Still ${remainingVisual?.length} visual templates remaining`
    };
    
    console.log('🎯 Validation complete:', validationResult);
    
    return new Response(JSON.stringify(validationResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Template validation error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});