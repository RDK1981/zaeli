-- ═══════════════════════════════════════════════════════════════════════
-- supabase-api-logs-cache-cols.sql · Build 60 (Session 38)
--
-- Add cache observability to api_logs. Previously we could see cost_usd
-- (which is cache-aware after Session 29's fix) but couldn't see WHY a
-- given call was cheap or expensive — cache_read tokens and
-- cache_creation tokens were computed in send() then thrown away.
--
-- This makes it possible to answer:
--   * Is prompt caching actually hitting for text-only chat sessions?
--   * How often is the imgCtx move (Build 60) improving cache hit rate?
--   * Which sessions saw cache_creation (expensive first turn) vs
--     cache_read (cheap subsequent turns)?
--
-- Both columns nullable so existing rows stay valid (they just show NULL
-- for historical rows, real values from Build 60 onwards).
--
-- SAFETY:
--   - IF NOT EXISTS on ADD COLUMN — safe to re-run
--   - Nullable — no default value churn, doesn't lock table
--
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.api_logs
  ADD COLUMN IF NOT EXISTS cache_read_tokens integer,
  ADD COLUMN IF NOT EXISTS cache_creation_tokens integer;

COMMENT ON COLUMN public.api_logs.cache_read_tokens IS
  'Anthropic cache_read_input_tokens — tokens served from prompt cache at ~10% of full input rate. Null for calls that never had caching (GPT, older logs).';

COMMENT ON COLUMN public.api_logs.cache_creation_tokens IS
  'Anthropic cache_creation_input_tokens — tokens written to prompt cache at 1.25x full input rate on first call of a session. Null for calls that never had caching.';

COMMIT;

-- Verify:
--   SELECT feature, COUNT(*), AVG(cache_read_tokens), AVG(cache_creation_tokens)
--   FROM api_logs
--   WHERE created_at > NOW() - INTERVAL '1 day'
--   GROUP BY feature;
