/**
 * Zaeli API Logger
 * ─────────────────────────────────────────────────────────────
 * Central wrapper for all Anthropic API calls.
 * Logs every call to api_logs in Supabase with:
 *   - family_id       who made the call
 *   - feature         which part of the app (e.g. 'zaeli_chat', 'home_brief')
 *   - input_tokens    tokens sent (from Anthropic usage response)
 *   - output_tokens   tokens received
 *   - cost_usd        calculated cost (Sonnet 4 pricing)
 *   - created_at      timestamp
 *
 * Usage:
 *   import { callClaude } from '../../lib/api-logger';
 *
 *   const data = await callClaude({
 *     feature: 'home_brief',
 *     familyId: DUMMY_FAMILY_ID,
 *     body: { model: 'claude-sonnet-4-20250514', max_tokens: 300, ... }
 *   });
 *   // data is the parsed Anthropic response JSON — use exactly as before
 *
 * SQL to create the table (run once in Supabase):
 *   create table if not exists api_logs (
 *     id            uuid default gen_random_uuid() primary key,
 *     family_id     uuid not null,
 *     account_id    integer,
 *     feature       text not null,
 *     model         text not null default 'claude-sonnet-4-20250514',
 *     input_tokens  integer not null default 0,
 *     output_tokens integer not null default 0,
 *     cost_usd      numeric(10,6) not null default 0,
 *     created_at    timestamptz not null default now()
 *   );
 *   create index on api_logs (family_id, created_at);
 *   create index on api_logs (feature, created_at);
 */

import { supabase } from './supabase';

// ── Pricing per model ─────────────────────────────────────────
// Sonnet 4:  $3.00 / $15.00 per million tokens (input/output)
// Haiku 4.5: $0.25 / $1.25  per million tokens (input/output)
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514':  { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
  'claude-haiku-4-5-20251001': { input: 0.25 / 1_000_000, output:  1.25 / 1_000_000 },
};
const DEFAULT_PRICING = PRICING['claude-sonnet-4-20250514'];

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';

// ── Feature type — all tracked call sites ─────────────────────
export type ZaeliFeature =
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
  | 'shopping_category';

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

  // Log asynchronously — never let logging failure break the UI
  logUsage({ feature, familyId, accountId, data, model: body.model });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${data?.error?.message || 'unknown error'}`);
  }

  return data;
}

// ── Internal logging — fire-and-forget ────────────────────────
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
  // Extract token usage from Anthropic response
  const inputTokens  = data?.usage?.input_tokens  ?? 0;
  const outputTokens = data?.usage?.output_tokens ?? 0;
  const pricing = PRICING[model || ''] || DEFAULT_PRICING;
  const costUsd = (inputTokens * pricing.input) + (outputTokens * pricing.output);

  // Fire and forget — don't await, don't block UI
  supabase.from('api_logs').insert({
    family_id:     familyId,
    account_id:    accountId ?? null,
    feature,
    model:         model ?? 'claude-sonnet-4-20250514',
    input_tokens:  inputTokens,
    output_tokens: outputTokens,
    cost_usd:      parseFloat(costUsd.toFixed(6)),
  }).then(({ error }) => {
    if (error) console.warn('[api-logger] Failed to log usage:', error.message);
  });
}
