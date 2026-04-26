/**
 * Loads per-use-case model configuration from `ai_model_config`,
 * with a 60s in-memory cache per Edge Function instance.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import type { ProviderId } from './model-catalog.ts';

export interface ModelConfig {
  use_case: string;
  primary_model: string;
  fallback_models: Array<{ provider: ProviderId; model: string }>;
  provider_order: ProviderId[];
  temperature: number | null;
  is_active: boolean;
}

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map<string, { config: ModelConfig | null; expiresAt: number }>();

function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function loadModelConfig(useCase: string): Promise<ModelConfig | null> {
  const cached = cache.get(useCase);
  if (cached && cached.expiresAt > Date.now()) return cached.config;

  const client = getServiceClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('ai_model_config')
      .select('use_case, primary_model, fallback_models, provider_order, temperature, is_active')
      .eq('use_case', useCase)
      .maybeSingle();

    if (error || !data) {
      cache.set(useCase, { config: null, expiresAt: Date.now() + CACHE_TTL_MS });
      return null;
    }

    const config: ModelConfig = {
      use_case: data.use_case,
      primary_model: data.primary_model,
      fallback_models: Array.isArray(data.fallback_models) ? data.fallback_models : [],
      provider_order: Array.isArray(data.provider_order) && data.provider_order.length > 0
        ? data.provider_order as ProviderId[]
        : ['gemini_direct', 'openrouter', 'lovable'],
      temperature: data.temperature,
      is_active: data.is_active,
    };
    cache.set(useCase, { config, expiresAt: Date.now() + CACHE_TTL_MS });
    return config;
  } catch (err) {
    console.warn(`loadModelConfig(${useCase}) failed:`, err);
    return null;
  }
}

export interface MetricEntry {
  use_case: string;
  provider: ProviderId;
  model: string;
  status_code: number | null;
  success: boolean;
  latency_ms: number;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  estimated_cost_usd?: number | null;
  error_type?: string | null;
}

/** Fire-and-forget metric write — never throws, never blocks. */
export function logMetric(entry: MetricEntry): void {
  const client = getServiceClient();
  if (!client) return;
  client
    .from('ai_model_metrics')
    .insert(entry)
    .then(({ error }) => {
      if (error) console.warn('logMetric insert failed:', error.message);
    })
    .catch((err) => console.warn('logMetric exception:', err));
}