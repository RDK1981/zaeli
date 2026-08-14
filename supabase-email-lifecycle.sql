-- ═══════════════════════════════════════════════════════════════════════
-- supabase-email-lifecycle.sql — Admin Console v3 Batch 5
-- ═══════════════════════════════════════════════════════════════════════
--
-- Auto-sends lifecycle emails to beta users (welcome, 3-day check-in,
-- 14-day tips, beta ending in 14 days). Idempotent — safe to re-run.
--
-- Design:
--   1. `profiles.beta_start_date` column captures when beta was granted.
--      admin-actions grant_beta / grant_beta_by_email / extend_beta
--      stamps it on first grant only (subsequent extends preserve
--      original start date — the lifecycle keys off it).
--   2. `email_log` records every email sent so nothing double-sends.
--      Query pattern: WHERE recipient_user_id = X AND template_id = Y
--      before firing.
--   3. `email-lifecycle` Edge Function runs daily at 09:00 Brisbane
--      (23:00 UTC prior day) via pg_cron.
--   4. Welcome email fires immediately on beta grant via admin-actions
--      calling email-lifecycle in send_template mode.
--
-- SETUP (one-time — pg_cron + pg_net must already be enabled from
-- brief-scheduler setup):
--   1. Deploy the Edge Function:
--        supabase functions deploy email-lifecycle
--   2. Fill in your service_role key on the line marked FILL IN below.
--   3. Run this whole file in Supabase Studio → SQL Editor.
--
-- To PAUSE:  SELECT cron.unschedule('email-lifecycle-daily');
-- To CHECK:  SELECT * FROM cron.job WHERE jobname = 'email-lifecycle-daily';
-- To LOGS:   SELECT * FROM cron.job_run_details WHERE jobname = 'email-lifecycle-daily' ORDER BY start_time DESC LIMIT 10;
-- ═══════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────
-- 1. profiles.beta_start_date
-- ────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists beta_start_date timestamptz;

-- Backfill for existing beta users: assume 3-month grant, start = end - 90d.
-- Only if beta_start_date is null AND beta_end_date is set.
-- These backfilled users will NOT receive day-3 or day-14 lifecycle emails
-- (they're already past those thresholds) but WILL receive beta-ending nudges.
update public.profiles
set    beta_start_date = beta_end_date - interval '90 days'
where  beta_start_date is null
  and  beta_end_date is not null;

-- ────────────────────────────────────────────────────────────────────────
-- 2. email_log — one row per email sent
-- ────────────────────────────────────────────────────────────────────────
create table if not exists public.email_log (
  id                uuid primary key default gen_random_uuid(),
  recipient_email   text not null,
  recipient_user_id uuid,                                     -- nullable for anon signup emails
  template_id       text not null,                            -- 'welcome' | 'checkin-3day' | 'tips-14day' | 'beta-ending' | 'manual-<subject-hash>' | 'custom'
  subject           text,
  triggered_by      text not null default 'lifecycle',        -- 'lifecycle' | 'manual' | 'grant'
  status            text not null default 'sent',             -- 'sent' | 'failed' | 'skipped'
  error             text,
  sent_at           timestamptz not null default now()
);

create index if not exists email_log_user_template_idx on public.email_log (recipient_user_id, template_id);
create index if not exists email_log_email_template_idx on public.email_log (recipient_email, template_id);
create index if not exists email_log_sent_at_idx on public.email_log (sent_at desc);

alter table public.email_log enable row level security;

-- Drop + recreate admin SELECT policy (idempotent)
drop policy if exists "Admin reads all email_log" on public.email_log;
create policy "Admin reads all email_log" on public.email_log
  for select using (public.is_admin());

-- No INSERT/UPDATE/DELETE policies — only service_role (Edge Function) can write.

-- ────────────────────────────────────────────────────────────────────────
-- 3. pg_cron schedule — daily at 09:00 Brisbane (23:00 UTC prior day)
-- ────────────────────────────────────────────────────────────────────────
-- Brisbane is UTC+10 (no DST). 09:00 AEST = 23:00 UTC prior day.
-- Cron uses UTC.

DO $$
BEGIN
  PERFORM cron.unschedule('email-lifecycle-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;  -- didn't exist; fine
END $$;

SELECT cron.schedule(
  'email-lifecycle-daily',
  '0 23 * * *',                                               -- 09:00 Brisbane, once a day
  $$
  SELECT net.http_post(
    url     := 'https://rsvbzakyyrftezthlhtd.supabase.co/functions/v1/email-lifecycle',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'    -- FILL IN before running
    ),
    body    := '{"mode":"sweep"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- Verify
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'email-lifecycle-daily';

-- ═══════════════════════════════════════════════════════════════════════
-- Verify + spot-check queries you can run after setup:
--
--   -- What's about to fire on next sweep:
--   select p.email, p.name, p.beta_start_date, p.beta_end_date,
--          extract(day from (now() - p.beta_start_date))::int as days_in_beta,
--          extract(day from (p.beta_end_date - now()))::int as days_until_end
--   from public.profiles p
--   where p.kind = 'owner' and p.beta_start_date is not null
--   order by p.beta_start_date;
--
--   -- What's been sent in last 7 days:
--   select recipient_email, template_id, triggered_by, sent_at
--   from public.email_log
--   where sent_at >= now() - interval '7 days'
--   order by sent_at desc;
--
--   -- Manual test-fire the sweep (from Studio):
--   select net.http_post(
--     url := 'https://rsvbzakyyrftezthlhtd.supabase.co/functions/v1/email-lifecycle',
--     headers := jsonb_build_object('Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE', 'Content-Type', 'application/json'),
--     body := '{"mode":"sweep","dry_run":true}'::jsonb
--   );
-- ═══════════════════════════════════════════════════════════════════════
