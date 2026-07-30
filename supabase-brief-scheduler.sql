-- ═══════════════════════════════════════════════════════════════════════
-- supabase-brief-scheduler.sql — Session 32 v2 Phase 07
--
-- Schedules the brief-scheduler Edge Function to run every 15 minutes via
-- pg_cron. The function itself finds families whose brief time falls in
-- the last 15 minutes and generates + pushes their brief.
--
-- SETUP STEPS (one-time, run in this order):
--
--   1. Enable extensions (Supabase Studio → Database → Extensions):
--      - pg_cron   (schedules the job)
--      - pg_net    (lets pg_cron call HTTP endpoints)
--
--   2. Deploy the Edge Function:
--      supabase functions deploy brief-scheduler
--
--   3. Grab the Edge Function URL from the Supabase dashboard:
--      https://<project-ref>.supabase.co/functions/v1/brief-scheduler
--
--   4. Grab your service_role key from Settings → API.
--
--   5. Run this file below, replacing the placeholders on the two lines
--      marked FILL IN.
--
-- SAFETY:
--   - Idempotent: cron.schedule() with the same jobname replaces the prior
--     schedule cleanly.
--   - Every 15 min is fine for a small family count; if scaling past a few
--     hundred families, bump to hourly and split briefs across the hour.
--   - Uses service_role key so the function's auth check is bypassed —
--     the function itself does no user-context work.
--
-- To PAUSE: SELECT cron.unschedule('brief-scheduler-15min');
-- To CHECK: SELECT * FROM cron.job;
-- To LOGS:  SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
-- ═══════════════════════════════════════════════════════════════════════

-- Remove any prior schedule with the same name (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('brief-scheduler-15min');
EXCEPTION WHEN OTHERS THEN
  -- Job didn't exist; that's fine
  NULL;
END $$;

-- Schedule every 15 minutes on the quarter-hour (00, 15, 30, 45)
SELECT cron.schedule(
  'brief-scheduler-15min',
  '0,15,30,45 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://rsvbzakyyrftezthlhtd.supabase.co/functions/v1/brief-scheduler',  -- FILL IN if project-ref changes
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'  -- FILL IN
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Verify
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'brief-scheduler-15min';
