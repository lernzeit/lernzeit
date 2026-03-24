/**
 * Shared AI client with automatic fallback from Lovable AI Gateway to direct Gemini API.
 * When Lovable credits are exhausted (402), it retries with the GEMINI_API_KEY.
 */

const LOVABLE_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const GEMINI_GATEWAY = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

// Map Lovable model names to Gemini-native model names
const MODEL_MAP: Record<string, string> = {
  'google/gemini-3-flash-preview': 'gemini-2.5-flash',
  'google/gemini-3.1-flash-lite-preview': 'gemini-2.5-flash-lite-preview-06-17',
  'google/gemini-2.5-flash': 'gemini-2.5-flash',
  'google/gemini-2.5-flash-lite': 'gemini-2.5-flash-lite-preview-06-17',
  'google/gemini-2.5-pro': 'gemini-2.5-pro',
};

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
  usedFallback: boolean;
}

/**
 * Call AI with automatic fallback.
 * 1. Try Lovable AI Gateway
 * 2. On 402 (credits exhausted), retry with direct Gemini API
 * 3. On 429 (rate limit), return immediately (no fallback)
 */
export async function callAI(options: AiRequestOptions, signal?: AbortSignal): Promise<AiCallResult> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

  // Try Lovable Gateway first
  if (LOVABLE_API_KEY) {
    try {
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
        return { response, usedFallback: false };
      }

      // Rate limit — don't fallback, propagate
      if (response.status === 429) {
        return { response, usedFallback: false };
      }

      if (response.status === 402) {
        console.warn('⚠️ Lovable AI credits exhausted (402), falling back to Gemini API...');
      } else {
        await response.text().catch(() => {});
        console.warn(`⚠️ Lovable AI error (${response.status}), falling back to Gemini API...`);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      console.warn('⚠️ Lovable AI Gateway unreachable, falling back to Gemini API...', err);
    }
  }

  // Fallback: Direct Gemini API (OpenAI-compatible endpoint)
  if (!GEMINI_API_KEY) {
    throw new Error('Neither LOVABLE_API_KEY nor GEMINI_API_KEY is configured');
  }

  const geminiModel = MODEL_MAP[options.model] || 'gemini-2.0-flash';
  console.log(`🔄 Using Gemini fallback with model: ${geminiModel}`);

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

  return { response, usedFallback: true };
}
