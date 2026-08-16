-- ═══════════════════════════════════════════════════════════════════════
-- supabase-kara-email-backfill.sql · Build 54 (Session 36)
--
-- One-shot fix for Kara De Kretser (karadekretser@gmail.com).
--
-- BACKGROUND:
--   Rich manually sent Kara the "You're in - welcome to Zaeli" email at
--   8:36pm on 16 Aug 2026 via admin-announce (which does NOT write to
--   email_log). The auto-drip pipeline dedup keys on:
--     email_log WHERE recipient_user_id=X AND template_id='welcome'
--   Without a row for Kara, any future auto-trigger of 'welcome' (e.g. a
--   grant retry, an admin resend before this SQL landed) would fire a
--   duplicate. This backfill inserts the missing row so the pipeline
--   knows welcome landed.
--
-- SAFE FOR REPLAY: uses ON CONFLICT DO NOTHING via a pre-check. Running
-- this twice is a no-op.
--
-- Day-3 (checkin-3day) fires independently — it keys off beta_start_date
-- + email_log template_id='checkin-3day'. This backfill doesn't touch
-- that path so day-3 lands correctly for Kara around 19 Aug.
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  kara_user_id uuid;
  kara_email text := 'karadekretser@gmail.com';
  existing_row_id uuid;
BEGIN
  -- Look up Kara's profile by email
  SELECT id INTO kara_user_id
  FROM public.profiles
  WHERE lower(email) = kara_email
  ORDER BY (kind = 'owner') DESC, created_at ASC
  LIMIT 1;

  IF kara_user_id IS NULL THEN
    RAISE NOTICE 'No profile found for %', kara_email;
    RETURN;
  END IF;

  -- Check if a welcome row already exists (avoid duplicate insert)
  SELECT id INTO existing_row_id
  FROM public.email_log
  WHERE recipient_user_id = kara_user_id
    AND template_id = 'welcome'
  LIMIT 1;

  IF existing_row_id IS NOT NULL THEN
    RAISE NOTICE 'welcome already logged for % (row %) — no backfill needed', kara_email, existing_row_id;
    RETURN;
  END IF;

  -- Insert backfill row — matches the shape sendEmailInline writes
  INSERT INTO public.email_log (
    recipient_email,
    recipient_user_id,
    template_id,
    subject,
    triggered_by,
    status,
    sent_at
  ) VALUES (
    kara_email,
    kara_user_id,
    'welcome',
    'You''re in — welcome to Zaeli',
    'manual',
    'sent',
    '2026-08-16 20:36:00+10'  -- Rich's manual send time (Brisbane)
  );

  RAISE NOTICE 'Backfilled welcome email_log row for % (user_id %)', kara_email, kara_user_id;
END $$;

-- Verify
SELECT id, recipient_email, template_id, triggered_by, status, sent_at
FROM public.email_log
WHERE recipient_email = 'karadekretser@gmail.com'
ORDER BY sent_at DESC;
