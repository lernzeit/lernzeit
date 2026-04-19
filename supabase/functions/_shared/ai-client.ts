/**
 * Shared AI client with automatic fallback chain:
 *   1. Gemini API (primary – fastest, direct)
 *   2. OpenRouter (secondary – paid models only)
 *   3. Lovable AI Gateway (tertiary)
 *
 * Each provider is skipped if its API key is missing or if it was recently exhausted (402).
 */

const GEMINI_GATEWAY = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const OPENROUTER_GATEWAY = 'https://openrouter.ai/api/v1/chat/completions';
const LOVABLE_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// Map Lovable model names → OpenRouter PAID model names (no :free suffix)
const OPENROUTER_MODEL_MAP: Record<string, string> = {
  'google/gemini-3-flash-preview': 'google/gemma-3-12b-it',
  'google/gemini-3.1-flash-lite-preview': 'google/gemma-3-12b-it',
  'google/gemini-2.5-flash': 'google/gemma-3-12b-it',
  'google/gemini-2.5-flash-lite': 'google/gemma-3-4b-it',
  'google/gemini-2.5-pro': 'google/gemma-3-27b-it',
};

// Map Lovable model names → Gemini-native model names
const GEMINI_MODEL_MAP: Record<string, string> = {
  'google/gemini-3-flash-preview': 'gemini-2.5-flash',
  'google/gemini-3.1-flash-lite-preview': 'gemini-2.5-flash-lite-preview-06-17',
  'google/gemini-2.5-flash': 'gemini-2.5-flash',
  'google/gemini-2.5-flash-lite': 'gemini-2.5-flash-lite-preview-06-17',
  'google/gemini-2.5-pro': 'gemini-2.5-pro',
};

const EXHAUSTED_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const ERROR_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes for non-auth errors
let geminiExhaustedUntil = 0;
let openrouterExhaustedUntil = 0;
let lovableExhaustedUntil = 0;

interface AiRequestOptions {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  tools?: unknown[];
  tool_choice?: unknown;
  stream?: boolean;
}

interface AiCallResult {
  response: Response;
  provider: 'gemini' | 'openrouter' | 'lovable';
}

/**
 * Call AI with automatic fallback chain: Gemini → OpenRouter (paid) → Lovable.
 * On 429 (rate limit) the error is returned immediately (no fallback).
 * On 402 (credits exhausted) the provider is skipped for 5 minutes.
 */
export async function callAI(options: AiRequestOptions, signal?: AbortSignal): Promise<AiCallResult> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  // ── 1. Gemini API (primary) ──────────────────────────────────────────
  if (GEMINI_API_KEY && Date.now() >= geminiExhaustedUntil) {
    try {
      const geminiModel = GEMINI_MODEL_MAP[options.model] || 'gemini-2.5-flash';
      console.log(`🟢 Trying Gemini (primary) with model: ${geminiModel}`);

      const geminiBody: Record<string, unknown> = {
        model: geminiModel,
        messages: options.messages,
      };
      if (options.temperature !== undefined) geminiBody.temperature = options.temperature;
      if (options.stream !== undefined) geminiBody.stream = options.stream;
      if (options.tools) geminiBody.tools = options.tools;
      if (options.tool_choice) geminiBody.tool_choice = options.tool_choice;

      const response = await fetch(GEMINI_GATEWAY, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GEMINI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiBody),
        signal,
      });

      if (response.ok) {
        console.log(`✅ Gemini success (${geminiModel})`);
        return { response, provider: 'gemini' };
      }

      if (response.status === 429) {
        console.warn('⚠️ Gemini rate-limited (429), returning error');
        return { response, provider: 'gemini' };
      }

      if (response.status === 402) {
        geminiExhaustedUntil = Date.now() + EXHAUSTED_COOLDOWN_MS;
        console.warn('⚠️ Gemini credits exhausted (402), falling back to OpenRouter...');
      } else {
        await response.text().catch(() => {});
        console.warn(`⚠️ Gemini error (${response.status}), falling back to OpenRouter...`);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      console.warn('⚠️ Gemini API unreachable, falling back to OpenRouter...', err);
    }
  }

  // ── 2. OpenRouter (secondary – paid models) ──────────────────────────
  if (OPENROUTER_API_KEY && Date.now() >= openrouterExhaustedUntil) {
    try {
      const orModel = OPENROUTER_MODEL_MAP[options.model] || 'google/gemma-3-12b-it';
      console.log(`🔵 Trying OpenRouter (fallback) with model: ${orModel}`);

      const orBody: Record<string, unknown> = {
        model: orModel,
        messages: options.messages,
      };
      if (options.temperature !== undefined) orBody.temperature = options.temperature;
      if (options.stream !== undefined) orBody.stream = options.stream;
      if (options.tools) orBody.tools = options.tools;
      if (options.tool_choice) orBody.tool_choice = options.tool_choice;

      const response = await fetch(OPENROUTER_GATEWAY, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orBody),
        signal,
      });

      if (response.ok) {
        console.log(`✅ OpenRouter success (${orModel})`);
        return { response, provider: 'openrouter' };
      }

      if (response.status === 429) {
        console.warn('⚠️ OpenRouter rate-limited (429), returning error');
        return { response, provider: 'openrouter' };
      }

      if (response.status === 402) {
        openrouterExhaustedUntil = Date.now() + EXHAUSTED_COOLDOWN_MS;
        console.warn('⚠️ OpenRouter credits exhausted (402), falling back to Lovable...');
      } else {
        openrouterExhaustedUntil = Date.now() + ERROR_COOLDOWN_MS;
        await response.text().catch(() => {});
        console.warn(`⚠️ OpenRouter error (${response.status}), cooldown ${ERROR_COOLDOWN_MS / 1000}s, falling back to Lovable...`);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      console.warn('⚠️ OpenRouter unreachable, falling back to Lovable...', err);
    }
  }

  // ── 3. Lovable AI Gateway (tertiary) ─────────────────────────────────
  if (LOVABLE_API_KEY && Date.now() >= lovableExhaustedUntil) {
    try {
      console.log(`🟣 Trying Lovable AI Gateway with model: ${options.model}`);

      const response = await fetch(LOVABLE_GATEWAY, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
        signal,
      });

      if (response.ok) {
        console.log(`✅ Lovable AI success`);
        return { response, provider: 'lovable' };
      }

      if (response.status === 429) {
        return { response, provider: 'lovable' };
      }

      if (response.status === 402) {
        lovableExhaustedUntil = Date.now() + EXHAUSTED_COOLDOWN_MS;
        console.warn('⚠️ Lovable AI credits exhausted (402)');
      } else {
        await response.text().catch(() => {});
        console.warn(`⚠️ Lovable AI error (${response.status})`);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      console.warn('⚠️ Lovable AI Gateway unreachable', err);
    }
  }

  // ── All providers failed ─────────────────────────────────────────────
  throw new Error('All AI providers failed (Gemini, OpenRouter, Lovable). Check API keys and credits.');
}
