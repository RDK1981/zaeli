# CLAUDE.md — Zaeli Project Context
*Last updated: 23 March 2026 — Session (Home Screen Redesign + Design System)*

---

## Who You Are Talking To
- **Richard** — beginner developer. Always give **full file rewrites**, easy copy-paste PowerShell commands, step by step. No partial diffs.
- Family: Anna (logged-in user), Richard, Poppy (Yr6, age 12), Gab (Yr4, age 10), Duke (Yr1, age 8)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no `&&` chaining)
- Repo: https://github.com/RDK1981/zaeli (private)
- **PowerShell rule:** Run commands one at a time, never chain with `&&`
- **Copy rule:** Every PowerShell command in its own separate copy-paste block

---

## Stack
- React Native + Expo (iOS-first, SDK 53+)
- Supabase (Postgres) — `rsvbzakyyrftezthlhtd` (Sydney ap-southeast-2)
- OpenAI GPT-5.4-mini — primary AI for chat, briefs, all responses
- Claude claude-sonnet-4-6 — vision only (image description)
- expo-router (file-based routing)
- Poppins font (all UI), DMSerifDisplay (logo/hero only)
- No bottom tab bar — hamburger menu only navigation

---

## Key Constants
```ts
DUMMY_FAMILY_ID   = '00000000-0000-0000-0000-000000000001'
DUMMY_MEMBER_NAME = 'Anna'
GPT_MODEL         = 'gpt-5.4-mini'          // use max_completion_tokens
CLAUDE_MODEL      = 'claude-sonnet-4-6'     // use max_tokens — vision only
```

**CRITICAL:** Never mix `max_tokens` (Claude) with `max_completion_tokens` (OpenAI)

---

## Import Paths
```ts
// From app/(tabs)/*.tsx:
import { supabase } from '../../lib/supabase'
import { NavMenu, HamburgerButton } from '../components/NavMenu'
import * as FileSystem from 'expo-file-system/legacy'   // NOT expo-file-system
```

---

## Colour System (locked — do not change without discussion)

| Screen | Colour | Hex |
|--------|--------|-----|
| Home banner (light) | Warm Coral | #E8503A |
| Home banner (dark) | Deep Navy | #0D1B3E |
| Home/Chat accent | Electric Coral | #FF4545 |
| Calendar | Cobalt Blue | #2055F0 |
| Shopping | Forest Green | #1A7A45 |
| Meal Planner | Terra Orange | #E8601A |
| Tutor | Deep Violet | #6B35D9 |
| To-dos | Zaeli Gold | #C9A820 |
| Travel | Ocean Cyan | #0096C7 |
| Notes | Sage Olive | #5C8A3C |
| Our Family | Magenta Pink | #D4006A |
| Settings | Slate Grey | #6B7280 |

### Home screen theme tokens (light/dark via useColorScheme):
- Light: coral banner `#E8503A`, white body `#FFFFFF`, neutral bubble `#F2F2F2`
- Dark: navy banner `#0D1B3E`, true black body `#111111`, dark bubble `#1E2D50`
- Zaeli ✦ star always: `#4D8BFF` (light blue — AI identity signal)
- Coral = send button ONLY — nothing else

---

## Screen Status

| File | Status |
|------|--------|
| `index.tsx` | ✅ Complete — AI-first chat home, light/dark, quick replies, grid nav |
| `calendar.tsx` | ✅ Complete |
| `shopping.tsx` | ✅ Complete — List, Pantry, Spend tabs |
| `zaeli-chat.tsx` | ⚠️ Needs design update to match new home screen |
| `more.tsx` | ✅ Complete |
| `tutor.tsx` | ✅ Complete |
| `mealplanner.tsx` | ⚠️ Needs Supabase connection (dummy data) |
| `voice-overlay.tsx` | ✅ Complete |

---

## index.tsx Architecture (AI-First Chat Home)

### What it is
Chat IS the home screen. Zaeli opens every session with a brief. Screens are data tools accessed via grid icon.

### Key design decisions (LOCKED)
- **No accent colours in Zaeli text** — plain ink only
- **No pills** — replaced by 3×3 grid icon (⊞) above input bar
- **Quick replies** replace CTAs — GPT returns `["chip 1","chip 2","chip 3"]` array
- **"All good →"** muted dismiss below chips
- **No bottom tab bar** — hamburger only
- **Walkie-talkie voice** — auto-sends after Whisper transcription
- **Eyebrow (✦ Zaeli · timestamp)** — first message in sequence only
- **Sentence spacing** — paragraphs split on full stops, `marginBottom: 10`
- **Grid tap** — injects seed message into chat (NOT navigation)
- **Live camera** — replaces Files in + sheet

### Brief JSON format
```json
{"main":"Evening, Anna — ...","replies":["What's on tomorrow","Lock in dinner","Suss the shopping"],"seed":"What's on tomorrow?"}
```

### buildContext() fetches (all in one Promise.all)
- Shopping item names + count (up to 50)
- Calendar events (next 5)
- Todo count
- Meal plan

### Claude Vision
- `describeImageWithClaude()` in index.tsx
- `lastImageDesc` ref persists description for follow-up messages

---

## Zaeli Persona (KEY — read ZAELI-PERSONA.md)

Full spec in `C:\Users\richa\zaeli\ZAELI-PERSONA.md`

**Core voice:** Smart, warm, quietly witty teammate. Anne Hathaway energy + camaraderie.
**Banned:** "mate", "Of course!", "Absolutely!", "Great question!", bullet points, markdown
**Emojis:** 1-2 per message max, purposeful (💪 🙌 👀 ✨)
**Never start with "I"**
**Vary tone:** dry / warm / energetic / brief — never same rhythm twice
**The viral moment test:** Would Anna screenshot this and send it to a friend?

---

## Domains
- **zaeli.app** — app / deep link destination (purchased 23 Mar 2026, Cloudflare)
- **zaeli.ai** — marketing website (purchased 23 Mar 2026, Cloudflare)

## Apple Developer Account
- Individual account registered 23 March 2026 — $144.99 AUD/year
- Pending Apple approval (24-48 hours)
- Once approved: App Store Connect → TestFlight → external testers

---

## Known Warnings (Expo Go — not real errors)
- `expo-av deprecated` — will migrate to expo-audio/expo-video at SDK 54
- `expo-notifications not supported in Expo Go` — use dev build for push
- `Route settings.tsx missing default export` — legacy file, ignore
- Coral keyboard tint in Expo Go — iOS UIWindow tintColor, fixed in dev build

---

## Development Build (next step after Apple approval)
```
npx expo run:ios
```
Fixes: coral keyboard tint, expo-notifications, expo-av warnings

---

## Supabase Tables
- `shopping_items` — id, name, checked, family_id
- `events` — title, date, time, family_id
- `todos` — title, priority, done, family_id
- `meal_plans` — meal_name, date, family_id
- `pantry_items` — working ✅
- `receipts` — store, purchase_date, total_amount, items (jsonb)

## Admin Dashboard
https://incomparable-gumdrop-32e4ba.netlify.app

---

## Rules (never break)
1. Full file rewrites only — no partial edits for screen updates
2. PowerShell: separate lines, no `&&`
3. `npx expo start --clear` after every file change
4. Read ZAELI-PERSONA.md + ZAELI-PRODUCT.md before any architectural decisions
5. SafeAreaView always `edges={['top']}`
6. Never use `expo-file-system` directly — use `expo-file-system/legacy`
