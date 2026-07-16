/**
 * lib/ai-proxy.ts — Session 30 Phase 5 ⭐
 *
 * Client-side helpers for calling Anthropic + OpenAI + Whisper through
 * Supabase Edge Function proxies instead of directly hitting the vendor
 * APIs. The API keys live server-side as Supabase secrets, so the compiled
 * app bundle no longer contains extractable ANTHROPIC_API_KEY or
 * OPENAI_API_KEY — a critical pre-public-launch security requirement.
 *
 * All three helpers attach the user's Supabase session JWT and route to
 * the corresponding Edge Function. Failure surfaces as a normal thrown
 * error the caller catches.
 *
 * Migration pattern:
 *   Before: fetch('https://api.anthropic.com/v1/messages', { headers: { 'x-api-key': KEY, ... }, body: JSON.stringify({...}) })
 *   After:  callAnthropic({...})
 *
 *   Before: fetch('https://api.openai.com/v1/chat/completions', { headers: { Authorization: `Bearer ${KEY}` }, body: JSON.stringify({...}) })
 *   After:  callOpenAI({...})
 *
 *   Before: fetch('https://api.openai.com/v1/audio/transcriptions', { headers: { Authorization: `Bearer ${KEY}` }, body: formData })
 *   After:  callWhisper(formData)
 *
 * Return value: parsed JSON in all three cases (matches shape of raw vendor
 * responses so downstream code needs no shape changes).
 */

import { supabase } from './supabase';

// Resolved once at module load. Falls back to a warning path if the env var
// somehow isn't wired — should never happen in a built app but avoids a
// cryptic crash if it does.
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

function proxyUrl(path: string): string {
  if (!SUPABASE_URL) {
    throw new Error('[ai-proxy] EXPO_PUBLIC_SUPABASE_URL not set — proxies cannot be called');
  }
  return `${SUPABASE_URL}/functions/v1/${path}`;
}

async function currentAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('[ai-proxy] No signed-in user — AI calls require an active session');
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

// ── Anthropic ───────────────────────────────────────────────────────────────
// `payload` is the standard Anthropic /v1/messages body:
//   { model, max_tokens, messages, system?, tools?, ... }
// Optional `betaHeaders` array is passed through the proxy as anthropic-beta
// (e.g. ['prompt-caching-2024-07-31']).
export interface AnthropicPayload {
  model: string;
  max_tokens: number;
  messages: any[];
  system?: any;
  tools?: any[];
  tool_choice?: any;
  temperature?: number;
  [k: string]: unknown;
}

export async function callAnthropic(
  payload: AnthropicPayload,
  options?: { betaHeaders?: string[] },
): Promise<any> {
  const authHeader = await currentAuthHeader();
  const body = options?.betaHeaders?.length
    ? { ...payload, _betaHeaders: options.betaHeaders }
    : payload;
  const res = await fetch(proxyUrl('anthropic-proxy'), {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  // Return parsed JSON regardless of status — vendor errors have a shape
  // downstream code already handles (e.g. { error: { message, type } }).
  // The proxy preserves the upstream status code.
  return await res.json().catch(() => ({ error: { message: `Proxy returned status ${res.status}` } }));
}

// ── OpenAI (chat completions) ───────────────────────────────────────────────
export interface OpenAIPayload {
  model: string;
  messages: any[];
  max_completion_tokens?: number;
  temperature?: number;
  response_format?: any;
  tools?: any[];
  tool_choice?: any;
  [k: string]: unknown;
}

export async function callOpenAI(payload: OpenAIPayload): Promise<any> {
  const authHeader = await currentAuthHeader();
  const res = await fetch(proxyUrl('openai-proxy'), {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json().catch(() => ({ error: { message: `Proxy returned status ${res.status}` } }));
}

// ── Whisper (multipart audio transcription) ─────────────────────────────────
// Caller builds a FormData with { file, model, language?, ... }. We attach
// the JWT and forward to the proxy which relays to OpenAI.
// The proxy sets `language: 'en'` server-side if the client didn't — belt
// and braces on the Session 30 Welsh-hallucination fix.
export async function callWhisper(form: FormData): Promise<any> {
  const authHeader = await currentAuthHeader();
  const res = await fetch(proxyUrl('whisper-proxy'), {
    method: 'POST',
    headers: authHeader, // NB: DO NOT set Content-Type — fetch handles multipart boundary
    body: form,
  });
  return await res.json().catch(() => ({ error: { message: `Whisper proxy returned status ${res.status}` } }));
}
