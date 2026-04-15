/**
 * Zaeli API Logger
 * ─────────────────────────────────────────────────────────────
 * Central wrapper for all Anthropic API calls.
 * Logs every call to api_logs in Supabase.
 */

import { supabase } from './supabase';

// ── Pricing per model ─────────────────────────────────────────
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6':  { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
  'claude-haiku-4-5-20251001': { input: 0.25 / 1_000_000, output:  1.25 / 1_000_000 },
};
const DEFAULT_PRICING = PRICING['claude-sonnet-4-6'];

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';

// ── Feature type — all tracked call sites ─────────────────────
export type ZaeliFeature =
  // ── Core app features ──
  | 'home_brief'
  | 'calendar_brief'
  | 'shopping_brief'
  | 'meals_brief'
  | 'zaeli_chat'
  | 'chat_greeting'
  | 'recipe_photo'
  | 'menu_photo'
  | 'pantry_scan'
  | 'receipt_scan'
  | 'shopping_category'
  // ── Tutor features ──
  | 'tutor_practice'      // MC question generation + feedback + hints + workings
  | 'tutor_session'       // Homework help chat exchanges
  | 'tutor_socratic'      // Socratic sheet chat messages (Talk me through it)
  | 'tutor_reading'       // Reading feedback GPT call
  | 'tutor_vision'        // All photo analysis in tutor (book page, working photo)
  | 'tutor_whisper'       // Voice input in tutor screens (fixed cost per call)
  | 'whisper_transcription' // Voice input in main chat (kept for backwards compat)
  // ── Future ──
  | 'elevenlabs_tts';     // ElevenLabs text-to-speech (per character)

// ── Main call function ─────────────────────────────────────────
export async function callClaude({
  feature,
  familyId,
  body,
  accountId,
}: {
  feature: ZaeliFeature;
  familyId: string;
  body: Record<string, any>;
  accountId?: number;
}): Promise<any> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  logUsage({ feature, familyId, accountId, data, model: body.model });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${data?.error?.message || 'unknown error'}`);
  }

  return data;
}

// ── ElevenLabs cost logger ─────────────────────────────────────
// Charges per character — US$0.00022/char above plan
// Log separately so we can track TTS costs independently
export async function logElevenLabs({
  familyId,
  characterCount,
  accountId,
}: {
  familyId: string;
  characterCount: number;
  accountId?: number;
}) {
  // US$0.00022/char, convert to AUD (~1.55)
  const costUsd = characterCount * 0.00022;
  const costAud = costUsd * 1.55;

  supabase.from('api_logs').insert({
    family_id:     familyId,
    account_id:    accountId ?? null,
    feature:       'elevenlabs_tts',
    model:         'eleven_multilingual_v2',
    input_tokens:  characterCount, // repurpose input_tokens as char count
    output_tokens: 0,
    cost_usd:      parseFloat(costAud.toFixed(6)),
  }).then(({ error }) => {
    if (error) console.warn('[api-logger] ElevenLabs log failed:', error.message);
  });
}

// ── Whisper fixed cost logger ──────────────────────────────────
// Whisper charges per minute of audio, not per token
// US$0.006/min — typical tutor reading: 2-3 mins = ~US$0.015
// Log as fixed A$0.02 per call (covers up to ~2.5 mins)
export async function logWhisper({
  familyId,
  feature = 'tutor_whisper',
  accountId,
}: {
  familyId: string;
  feature?: ZaeliFeature;
  accountId?: number;
}) {
  supabase.from('api_logs').insert({
    family_id:     familyId,
    account_id:    accountId ?? null,
    feature,
    model:         'whisper-1',
    input_tokens:  0,
    output_tokens: 0,
    cost_usd:      0.02, // fixed A$0.02 per transcription (~2 mins audio)
  }).then(({ error }) => {
    if (error) console.warn('[api-logger] Whisper log failed:', error.message);
  });
}

// ── Internal usage logger — fire-and-forget ────────────────────
function logUsage({
  feature,
  familyId,
  accountId,
  data,
  model,
}: {
  feature: ZaeliFeature;
  familyId: string;
  accountId?: number;
  data: any;
  model?: string;
}) {
  const inputTokens  = data?.usage?.input_tokens  ?? 0;
  const outputTokens = data?.usage?.output_tokens ?? 0;
  const pricing = PRICING[model || ''] || DEFAULT_PRICING;
  const costUsd = (inputTokens * pricing.input) + (outputTokens * pricing.output);

  supabase.from('api_logs').insert({
    family_id:     familyId,
    account_id:    accountId ?? null,
    feature,
    model:         model ?? 'claude-sonnet-4-6',
    input_tokens:  inputTokens,
    output_tokens: outputTokens,
    cost_usd:      parseFloat(costUsd.toFixed(6)),
  }).then(({ error }) => {
    if (error) console.warn('[api-logger] Failed to log usage:', error.message);
  });
}
