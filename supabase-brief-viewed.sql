-- Build 75 (Session 38+) — add viewed_at column to zaeli_briefs.
--
-- The server-side brief-scheduler generates a brief and pushes it to the
-- user's lockscreen. Users with lockscreen previews DISABLED only see the
-- app name in the notification ("Zaeli") — the brief text is hidden. If
-- they never tap the notification, they miss the brief entirely.
--
-- Build 75 adds a Home tile fallback card that shows the fresh brief on
-- app open (within the relevant time window) if the user hasn't marked
-- it viewed. viewed_at gets stamped when:
--   * User taps the card (opens Chat with brief seeded), OR
--   * User taps the ✕ dismiss button on the card, OR
--   * User taps the push notification on lockscreen (deep link handler)
--
-- Time-gated on the client side (morning card only 5am-11:59am, evening
-- 4pm-11:59pm) so stale briefs from earlier windows never resurface.
--
-- Idempotent — safe to re-run.

ALTER TABLE public.zaeli_briefs
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

-- Small index on (family_id, user_id, viewed_at) for the "unviewed brief
-- for this user in this window" lookup — the Home tile fetches this on
-- every app open.
CREATE INDEX IF NOT EXISTS zaeli_briefs_unviewed_idx
  ON public.zaeli_briefs (family_id, user_id, viewed_at)
  WHERE viewed_at IS NULL;
