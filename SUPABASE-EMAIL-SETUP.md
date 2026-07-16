# Supabase Email Template Setup

*Session 30 — customises Supabase's built-in auth emails to feel like Zaeli, not generic Supabase.*

Zero code required. Two templates to update in the Supabase dashboard. ~10 minutes.

---

## Which emails Supabase sends

When someone signs up via `signUpOwner` or `signUpFromInvite`, Supabase automatically sends emails. By default these look like plain "Confirm your email" system messages. We want them to feel like Zaeli — warm, on-brand, useful.

Two templates worth polishing right now:

1. **Confirm signup** — sent when a new user signs up (owner OR invitee) if email confirmation is enabled
2. **Reset password** — sent when a user taps "Forgot password"

Other templates (Magic link, Change email, Invite user) — we don't use these active flows yet, leave defaults.

---

## Step 1 — Open the email templates section

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select the Zaeli project (rsvbzakyyrftezthlhtd)
3. Left sidebar → **Authentication** → **Email Templates**
4. You'll see a list of template types. Click **Confirm signup** first.

---

## Step 2 — Confirm signup template

**Subject line** — replace with:
```
Welcome to Zaeli — confirm your email
```

**Message body** — replace the default with this HTML. Copy-paste as-is:

```html
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FAF8F5; margin: 0; padding: 40px 20px; color: #0A0A0A;">
  <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 22px; padding: 40px 32px;">

    <div style="font-size: 40px; font-weight: 800; letter-spacing: -1.5px; margin-bottom: 24px;">
      z<span style="color: #A8D8F0;">a</span>el<span style="color: #A8D8F0;">i</span>
    </div>

    <h1 style="font-size: 28px; font-weight: 700; letter-spacing: -0.5px; margin: 0 0 16px 0; line-height: 1.2;">
      Welcome in 👋
    </h1>

    <p style="font-size: 17px; line-height: 1.6; color: rgba(10,10,10,0.75); margin: 0 0 24px 0;">
      One quick step and you're set — tap the button below to confirm your email address.
    </p>

    <div style="margin: 32px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #0A0A0A; color: #FFFFFF; padding: 14px 28px; border-radius: 28px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Confirm your email
      </a>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: rgba(10,10,10,0.55); margin: 24px 0 0 0;">
      Once you're in, Zaeli's ready to help with the family week — calendar, meals, shopping, kids' bits and everything in between. Just chat with her like you'd chat with a switched-on friend.
    </p>

    <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(10,10,10,0.08); font-size: 12px; color: rgba(10,10,10,0.45); line-height: 1.6;">
      If you didn't create a Zaeli account, you can safely ignore this email — no one gets access without confirming.
      <br><br>
      Questions? Reply to this email or drop us a line at <a href="mailto:hello@zaeli.ai" style="color: #0A5C80;">hello@zaeli.ai</a>.
    </div>

  </div>
</body>
</html>
```

The `{{ .ConfirmationURL }}` placeholder is Supabase's own — don't change it. Supabase replaces it with the actual confirmation link when the email sends.

Click **Save**.

---

## Step 3 — Reset password template

Same left-sidebar menu → click **Reset password** template.

**Subject line**:
```
Reset your Zaeli password
```

**Message body**:

```html
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FAF8F5; margin: 0; padding: 40px 20px; color: #0A0A0A;">
  <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 22px; padding: 40px 32px;">

    <div style="font-size: 40px; font-weight: 800; letter-spacing: -1.5px; margin-bottom: 24px;">
      z<span style="color: #A8D8F0;">a</span>el<span style="color: #A8D8F0;">i</span>
    </div>

    <h1 style="font-size: 28px; font-weight: 700; letter-spacing: -0.5px; margin: 0 0 16px 0; line-height: 1.2;">
      Reset your password
    </h1>

    <p style="font-size: 17px; line-height: 1.6; color: rgba(10,10,10,0.75); margin: 0 0 24px 0;">
      Tap the button below to set a new password. This link expires in an hour.
    </p>

    <div style="margin: 32px 0;">
      <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #0A0A0A; color: #FFFFFF; padding: 14px 28px; border-radius: 28px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Reset password
      </a>
    </div>

    <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(10,10,10,0.08); font-size: 12px; color: rgba(10,10,10,0.45); line-height: 1.6;">
      If you didn't request this, you can safely ignore this email — your password won't change.
      <br><br>
      Questions? <a href="mailto:hello@zaeli.ai" style="color: #0A5C80;">hello@zaeli.ai</a>.
    </div>

  </div>
</body>
</html>
```

Click **Save**.

---

## Step 4 — Verify from address

Same sidebar → **Authentication** → **Settings** (or **URL Configuration** depending on your Supabase UI version).

Look for **SMTP Settings** or **Email sender**:
- **Sender name**: `Zaeli`
- **Sender email**: `hello@zaeli.ai` (recommended) OR whatever Supabase's default is if you don't want to configure custom SMTP

If you want the emails to come from `hello@zaeli.ai` (recommended, looks more legit than a Supabase relay), you'll need to configure SMTP with a provider like Resend, SendGrid, or Postmark. Each is ~$0/month for our volume. For now, if this feels like too much, leave the default — Supabase's built-in mail relay works, it just shows `noreply@supabase-hosted-domain.com` as the sender.

**Pre-launch: worth switching to Resend or similar** — free tier covers ~3,000 emails/month, professional sender address, better deliverability. But not blocking for beta.

---

## Optional — enable / disable email confirmation

Same **Authentication → Settings** page, look for **Confirm email**.

- **Currently: disabled** (from Session 21 setup — you turned this off so sign-up doesn't require confirmation before login)
- **Recommended for public launch: enabled** — prevents fake email sign-ups + gives users a moment of "yes, this is real"

When you flip this ON, all new sign-ups will need to click the confirmation link in their email before they can log in. Your Session 21 sign-up flow (`signUpOwner` in `lib/auth.ts`) already handles the "check-email" state, so this flip is safe — the UI already tells users to check their inbox.

**Recommendation**: keep it OFF during beta (Anna + friends don't need extra friction), turn it ON before public launch.

---

## Test it works

1. Log out of Zaeli
2. Sign up with a fresh email address
3. Check that email inbox — you should see the Zaeli-branded welcome
4. Tap the confirmation link (should redirect back to the app or a "Confirmed!" page)
5. Log in with the new account

If the email doesn't arrive, check spam. If it's still missing, Supabase dashboard → **Logs** → **Auth** will show whether it was sent.

---

## What we're NOT doing (yet)

- **Custom Edge Function on `auth.users` insert** — could send a richer welcome (attachments, personalisation from onboarding data), but Supabase's built-in template is 90% of the value for 5% of the work. Revisit post-launch if we want something fancier.
- **Marketing emails** — the templates above are transactional. Anything else (product tips, feature announcements) needs a separate opt-in and probably a proper email service (Mailchimp, Loops, etc). Not required for launch.
