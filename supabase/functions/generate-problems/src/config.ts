// Environment Configuration
export const config = {
  geminiApiKey: Deno.env.get('GEMINI_API_KEY'),
  supabaseUrl: Deno.env.get('SUPABASE_URL'),
  supabaseAnonKey: Deno.env.get('SUPABASE_ANON_KEY'),
  logLevel: Deno.env.get('LOG_LEVEL') || 'info'
};

// Validate required environment variables
export function validateConfig() {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  if (!config.supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }
  if (!config.supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY environment variable is required');
  }
}

// CORS Headers
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generation Constants
export const GENERATION_CONSTANTS = {
  MAX_PROBLEMS_PER_REQUEST: 10,
  MIN_QUALITY_SCORE: 0.6, // Slightly lower for faster generation
  DEFAULT_TEMPERATURE: 0.8,
  MAX_TEMPERATURE: 1.0,
  MIN_TEMPERATURE: 0.7,
  DEFAULT_TOP_P: 0.9,
  DEFAULT_TOP_K: 40, // Reduced for faster responses
  MAX_OUTPUT_TOKENS: 2500, // Reduced from 4000 for faster generation
  MAX_RETRIES: 2, // Reduced from 3 for faster failure handling
  UNIQUENESS_THRESHOLD: 0.7,
  RESPONSE_TIMEOUT_MS: 15000 // 15 second timeout
};

// Database Constants
export const DB_CONSTANTS = {
  TEMPLATES_TABLE: 'templates',
  SESSIONS_TABLE: 'generation_sessions',
  METRICS_TABLE: 'template_metrics'
};

// Gemini API Configuration
export const GEMINI_CONFIG = {
  BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
  MODEL: 'gemini-1.5-flash-latest',
  FUNCTION_NAME: 'generate_educational_problems'
};