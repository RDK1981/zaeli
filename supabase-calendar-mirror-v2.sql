-- ═══════════════════════════════════════════════════════════════════════
-- supabase-calendar-mirror-v2.sql — Build 52 (iCal reconciliation + auto-remediation)
-- ═══════════════════════════════════════════════════════════════════════
--
-- Build 52 adds update + delete propagation to the iCal write-back path
-- (Zaeli event edited/deleted → mirror updated/removed on iPhone Calendar).
-- Reconciliation runs inside syncNow every app open — no per-mutation hook
-- needed in the tool call paths.
--
-- Also adds auto-remediation: when we ship a schema/logic fix (like the
-- Build 51 timezone bug), we bump the mirror_schema_version. On next sync,
-- if a user's config has an older version, we wipe their mirrored events
-- + re-mirror fresh. No more "disconnect + reconnect" instructions for
-- users to follow manually.
--
-- WHAT THIS ADDS:
--   calendar_sync_config.mirror_schema_version — int, default 0. Current
--   canonical version is defined client-side (MIRROR_SCHEMA_VERSION in
--   lib/calendar-sync.ts). On sync, if user's stored version < current →
--   auto-wipe all mirrored events (both DB and EventKit) + re-mirror
--   with the fixed code + bump to current version.
--
--   No new tables. No policy changes.
--
-- SETUP:
--   Run in Supabase Studio → SQL Editor. Idempotent.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.calendar_sync_config
  add column if not exists mirror_schema_version integer not null default 0;

comment on column public.calendar_sync_config.mirror_schema_version is
  'Version marker for the mirror logic. Bumped in lib/calendar-sync.ts (MIRROR_SCHEMA_VERSION) whenever we ship a fix that requires re-mirroring existing users. On sync, if this < current → auto-wipe + re-mirror once.';


-- ────────────────────────────────────────────────────────────────────────
-- Verify:
--
--   select column_name, data_type, column_default
--     from information_schema.columns
--     where table_name = 'calendar_sync_config'
--       and column_name = 'mirror_schema_version';
--
--   -- Existing users default to 0 (will be auto-remediated on next sync)
--   select user_id, mirror_schema_version from public.calendar_sync_config;
-- ═══════════════════════════════════════════════════════════════════════
