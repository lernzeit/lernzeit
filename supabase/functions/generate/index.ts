import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Question type definitions
type QuestionVariant = 'MULTIPLE_CHOICE' | 'SORT' | 'MATCH' | 'FREETEXT';

interface NewBaseQuestion {
  id: string;
  grade: number;
  subject: string;
  variant: QuestionVariant;
  body: string;
  explanation: string;
  verifier_score: number;
  created_at: string;
}

interface MCData { options: string[]; correct_idx: number }
interface SortData { items: string[]; correct_order: number[] }
interface MatchData { left: string[]; right: string[]; pairs: number[] }
interface FreeData { expected: string; grading: 'exact' | 'levenshtein' }

type Question =
  | (NewBaseQuestion & { variant: 'MULTIPLE_CHOICE'; data: MCData })
  | (NewBaseQuestion & { variant: 'SORT'; data: SortData })
  | (NewBaseQuestion & { variant: 'MATCH'; data: MatchData })
  | (NewBaseQuestion & { variant: 'FREETEXT'; data: FreeData });

// Validation function
function validateQuestion(question: Question): boolean {
  try {
    // Basic required fields validation
    if (!question.id || !question.body || !question.subject || !question.variant) {
      return false;
    }

    // Grade validation
    if (typeof question.grade !== 'number' || question.grade < 1 || question.grade > 12) {
      return false;
    }

    // Verifier score validation
    if (typeof question.verifier_score !== 'number' || question.verifier_score < 0 || question.verifier_score > 1) {
      return false;
    }

    // Body content validation
    if (question.body.length < 10 || question.body.length > 1000) {
      return false;
    }

    // Variant-specific data validation
    switch (question.variant) {
      case 'MULTIPLE_CHOICE':
        const mcData = question.data as MCData;
        return Array.isArray(mcData.options) && 
               mcData.options.length >= 2 && 
               typeof mcData.correct_idx === 'number' &&
               mcData.correct_idx >= 0 && 
               mcData.correct_idx < mcData.options.length;
               
      case 'SORT':
        const sortData = question.data as SortData;
        return Array.isArray(sortData.items) && 
               Array.isArray(sortData.correct_order) &&
               sortData.items.length === sortData.correct_order.length &&
               sortData.items.length >= 2;
               
      case 'MATCH':
        const matchData = question.data as MatchData;
        return Array.isArray(matchData.left) && 
               Array.isArray(matchData.right) &&
               Array.isArray(matchData.pairs) &&
               matchData.left.length === matchData.right.length &&
               matchData.pairs.length === matchData.left.length;
               
      case 'FREETEXT':
        const freeData = question.data as FreeData;
        return typeof freeData.expected === 'string' &&
               freeData.expected.length > 0 &&
               (freeData.grading === 'exact' || freeData.grading === 'levenshtein');
               
      default:
        return false;
    }
  } catch (error) {
    console.error('Validation error:', error);
    return false;
  }
}

// Insert question with retry logic
async function insertQuestionWithRetry(supabase: any, question: Question, maxRetries = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase
        .from('questions')
        .insert([{
          id: question.id,
          grade: question.grade,
          subject: question.subject,
          variant: question.variant,
          body: question.body,
          explanation: question.explanation || '',
          verifier_score: question.verifier_score,
          data: question.data,
          created_at: question.created_at || new Date().toISOString()
        }])
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return data.id;
    } catch (error) {
      console.error(`Insert attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        console.error(`Failed to insert question after ${maxRetries} attempts:`, error);
        return null;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse incoming JSON
    const questionData = await req.json();
    
    // Validate the question structure
    if (!validateQuestion(questionData)) {
      console.error('Question validation failed:', questionData);
      return new Response(
        JSON.stringify({ error: 'Invalid question format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Insert question with retry logic
    const insertedId = await insertQuestionWithRetry(supabase, questionData);
    
    if (!insertedId) {
      return new Response(
        JSON.stringify({ error: 'Failed to insert question after retries' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Return success response with question ID
    return new Response(
      JSON.stringify({ id: insertedId }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});