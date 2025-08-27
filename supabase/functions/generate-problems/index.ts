
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, validateConfig } from "./src/config.ts";
import { logger } from "./src/utils/logger.ts";
import { TemplateGenerator } from "./src/jobs/template-generator.ts";
import { EdgeParametrizedTemplateService } from "./src/services/parametrized-template-service.ts";
import { validateProblemRequest } from "./src/utils/validator.ts";
import type { ProblemRequest } from "./src/types.ts";

// Validate configuration on startup
validateConfig();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Generate unique request ID for tracking
  const requestId = `req_${Date.now()}_${Math.random()}`;
  
  try {
    // Parse and validate request
    const requestData = await req.json();
    const validationResult = validateProblemRequest(requestData);
    
    if (!validationResult.success) {
      logger.error('Invalid request format', { 
        requestId, 
        errors: validationResult.error.errors 
      });
      
      return new Response(JSON.stringify({ 
        error: 'Invalid request format',
        details: validationResult.error.errors,
        problems: []
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const problemRequest: ProblemRequest = validationResult.data;
    
    // 1. Try parametrized templates first
    const parametrizedService = new EdgeParametrizedTemplateService(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    
    const parametrizedQuestions = await parametrizedService.generateParametrizedQuestions(
      problemRequest.grade,
      problemRequest.subject || 'mathematik',
      problemRequest.count || 1
    );

    if (parametrizedQuestions.length > 0) {
      return new Response(JSON.stringify({
        success: true,
        data: parametrizedQuestions,
        source: 'parametrized-templates'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Fallback to original template generator
    const templateGenerator = new TemplateGenerator(requestId);
    const result = await templateGenerator.generateProblems(problemRequest);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('Request failed', { 
      requestId, 
      error: error.message,
      stack: error.stack 
    });
    
    return new Response(JSON.stringify({ 
      error: error.message,
      problems: [] // Fallback empty array
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
    
