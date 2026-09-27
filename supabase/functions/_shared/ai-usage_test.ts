import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { billedOutputTokens, StreamUsage } from './ai-usage.ts';

Deno.test('Gemini direkt: Denk-Tokens stecken nur in total_tokens', () => {
  // Qualitätsprüfung, typischer Aufruf vom 27.09.2026
  assertEquals(billedOutputTokens({ prompt_tokens: 327, completion_tokens: 18, total_tokens: 469 }), 142);
});

Deno.test('OpenRouter: Denk-Tokens schon in completion_tokens', () => {
  assertEquals(billedOutputTokens({ prompt_tokens: 323, completion_tokens: 143, total_tokens: 466 }), 143);
});

Deno.test('Fehlende Angaben', () => {
  assertEquals(billedOutputTokens(null), null);
  assertEquals(billedOutputTokens({}), null);
  assertEquals(billedOutputTokens({ completion_tokens: 40 }), 40);
});

const enc = new TextEncoder();

Deno.test('Stream: letzte usage gewinnt, auch über Blockgrenzen', () => {
  const s = new StreamUsage();
  s.push(enc.encode('data: {"choices":[{"delta":{"content":"Hal"}}],"usage":{"prompt_tokens":90,"completion_tokens":1,"total_tokens":91}}\n\n'));
  s.push(enc.encode('data: {"choices":[{"delta":{"content":"lo"}}],"usa'));
  s.push(enc.encode('ge":{"prompt_tokens":90,"completion_tokens":12,"total_tokens":130}}\n\ndata: [DONE]'));
  s.end();
  assertEquals(s.usage, { prompt_tokens: 90, completion_tokens: 12, total_tokens: 130 });
  assertEquals(billedOutputTokens(s.usage), 40);
});

Deno.test('Stream ohne usage bleibt leer', () => {
  const s = new StreamUsage();
  s.push(enc.encode('data: {"choices":[{"delta":{"content":"x"}}]}\n\ndata: [DONE]\n\n'));
  s.end();
  assertEquals(s.usage, null);
});
