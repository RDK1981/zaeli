# ZAELI-PRODUCT.md — Product Framework
*Last updated: 23 March 2026*

---

## What Zaeli Is

Zaeli is an AI-first family life platform. The AI is the product — not a feature bolted onto an app.

**Positioning:** Zaeli is an AI assistant that happens to have screens — not an app that happens to have AI.

**The 80/20 rule:** 80% of family interactions happen in the chat. 20% happen in the dedicated screens (Calendar, Shopping, Meals etc). The screens are data management tools, not the primary interface.

---

## Who It's For

**Primary market:** Australian families with children, dual-income couples with primary school-aged children in metro areas.

**Logged-in user:** Anna (the family organiser — typically the primary parent managing household logistics).

**Family:** Anna, Richard, Poppy (Yr6, 12), Gab (Yr4, 10), Duke (Yr1, 8).

---

## The AI-First Chat Framework

### Chat is home
Zaeli opens every session. The brief IS the home screen. No dashboard, no tiles — just Zaeli speaking first.

### The Brief
Zaeli's opening message every session. Time-aware, data-driven, warm. Follows the spec in `zaeli-brief-logic-spec.md`.

**Brief JSON format (current):**
```json
{
  "main": "Evening, Anna — [3 sentences]",
  "replies": ["chip 1", "chip 2", "chip 3"],
  "seed": "Anna's natural response to first chip"
}
```

### Quick Replies (not CTAs)
3 contextual chips generated alongside the brief. Time-aware and specific. No colour — border only. "All good →" as muted dismiss below. Chips fire `send()` directly — conversation continues naturally.

### Grid Navigation
3×3 dot grid icon (⊞) above input bar. Tapping opens a sheet with all 9 screens. Tapping a screen injects a seed message into chat — does NOT navigate away. Chat is always home.

### Screens (data tools, not primary interface)
Calendar · Shopping · Meals · Tutor · To-dos · Kids Hub · Notes · Travel · Our Family

---

## Design System (locked 23 March 2026)

### Home screen
- **Light mode:** Coral banner `#E8503A`, white body, neutral grey bubble `#F2F2F2`
- **Dark mode:** Navy banner `#0D1B3E`, true black body, dark blue bubble
- **Zaeli ✦ star:** always `#4D8BFF` light blue — AI identity signal
- **Coral = send button ONLY** — no other use of coral anywhere on screen
- **No accent colours in Zaeli text** — plain ink throughout
- **No pills** — grid icon replaces them entirely
- **No bottom tab bar** — hamburger navigation only
- **Font:** 17px / 27px line height for all message text
- **Sentence spacing:** paragraphs split on full stops, 10px gap between

### User bubbles
- Light: `#F2F2F2` warm neutral, `#0A0A0A` text
- Dark: `#1E2D50` dark blue, `#A8C4FF` light text

### Typography
- **All UI:** Poppins (400/500/600/700)
- **Logo + hero:** DM Serif Display italic only
- **Message text:** 17px / 27px line height
- **Quick reply chips:** 13px, border-only, no colour

---

## Zaeli's Voice (see ZAELI-PERSONA.md for full spec)

Think: smart, capable, slightly mischievous best friend. Always one step ahead. Warm enough to celebrate with you. Dry enough to be real. Energetic enough to make you feel like you have backup.

**The viral moment test:** Would Anna screenshot this and send it to a friend?

**Key rules:**
- Never say "mate"
- Never start with "I"
- No hollow affirmations ("Of course!", "Absolutely!")
- Vary tone — never same rhythm twice
- 1-2 emojis max per message, purposeful
- Camaraderie: "we've got this", "let's knock it out"

---

## Data Architecture

### getFamilyContext() / buildContext()
Fetches all live data in one `Promise.all` before every GPT call:
- Shopping item names + count (up to 50 items)
- Calendar events (next 5, with natural date formatting)
- Todo count
- Meal plan (today + week)

### Caching
- Brief cached at module level for 30 minutes
- `lastImageDesc` ref persists Claude Vision description across follow-up messages
- Tab return < 30 min: serve cached brief
- Tab return > 30 min: regenerate

### Image handling
- Claude Vision (`claude-sonnet-4-6`) describes images
- Description injected into GPT system prompt
- Persisted in `lastImageDesc` for entire session

---

## AI Model Routing

| Task | Model | Reason |
|------|-------|--------|
| All chat responses | GPT-5.4-mini (`max_completion_tokens`) | Speed + cost |
| All briefs | GPT-5.4-mini | Speed + cost |
| Image description | Claude claude-sonnet-4-6 (`max_tokens`) | Vision quality |
| Voice transcription | Whisper-1 | Accuracy |

**CRITICAL:** Never mix `max_tokens` (Claude) with `max_completion_tokens` (OpenAI)

---

## Voice — Walkie-Talkie Mode
Recording stops → Whisper transcribes → `send(transcript)` fires automatically. No input field step, no send button tap. Speak, release, Zaeli responds. Pure walkie-talkie.

---

## Live Camera
Accessible via `+` button in chat bar → "Live" option. Opens camera, user photographs something and asks a question. Claude Vision describes the image. GPT responds. Flows back into chat thread as a seamless message. Use cases: "Can I make dinner from this?", "Is this healthy?", "What am I missing?"

Future (not yet built): simultaneous camera preview + voice recording via `expo-camera` + `expo-av`.

---

## Navigation Model

- **Chat is home** — `index.tsx` is the root
- **Logo tap** → home on all screens
- **Hamburger** → NavMenu (all screens)
- **Grid icon ⊞** → injects context into chat (home only)
- **No bottom tab bar** anywhere
- **No floating FAB** anywhere

---

## Pricing & Business Model

| Plan | Price |
|------|-------|
| Family plan | $15 AUD/month |
| Homework add-on | $10 AUD/child/month |

**Distribution:** Web-first signup (zaeli.ai) to bypass App Store 15% cut. App free to download. 7-day free trial. Stripe for payments.

**Target market penetration:** 10,000 families = ~0.3% of Australian addressable market. Achievable but retention-dependent.

**Unit economics (GPT-5.4-mini):**
- ~$0.004 AUD/message
- ~$0.002 AUD/brief
- Heavy family usage well within margin at $15/month

---

## Growth Strategy

| Phase | Target | Strategy |
|-------|--------|----------|
| Phase 1 | 0–500 families | Personal networks, tight communities |
| Phase 2 | 500–3,000 | Referral engine, short-form content |
| Phase 3 | 3,000–10,000 | Micro-influencers, press, school/childcare partnerships |

**Key retention insight:** Zaeli's value is best understood through lived experience. Retaining active subscribers past the first few days is the real challenge, not acquiring installs.

---

## Domains
- **zaeli.ai** → marketing website (purchased 23 March 2026)
- **zaeli.app** → app / deep link destination (purchased 23 March 2026)
- Both registered via Cloudflare Registrar

## Apple Developer Account
- Individual account, registered 23 March 2026
- $144.99 AUD/year
- Pending Apple approval

---

## Build Order

### Layer 1 — Foundation ✅
- [x] Auth + family setup
- [x] Home screen (AI-first chat)
- [x] Calendar
- [x] Shopping (List + Pantry + Spend)
- [x] Zaeli chat
- [x] Navigation

### Layer 2 — Core AI ✅
- [x] Brief generation (time-aware)
- [x] Quick replies replacing CTAs
- [x] Claude Vision for images
- [x] Walkie-talkie voice
- [x] Full data context in every GPT call
- [x] Light/dark mode theming

### Layer 3 — Growth features (in progress)
- [ ] Development build (replace Expo Go)
- [ ] Meal Planner connected to Supabase
- [ ] API usage logging (per-family cost tracking)
- [ ] Kids Hub redesign
- [ ] Live camera (simultaneous camera + voice)
- [ ] Zaeli-chat.tsx design update

### Layer 4 — Launch
- [ ] Marketing website (zaeli.ai)
- [ ] TestFlight beta
- [ ] Stripe integration
- [ ] App Store submission

---

## Open Questions
1. Should zaeli-chat.tsx be retired entirely now that index.tsx IS the chat?
2. Live camera: build proper simultaneous camera+voice or defer to post-launch?
3. Dark mode: when to make it user-selectable vs always following system?
4. Kids context switch: how does Zaeli know she's talking to a child vs a parent?
