# Zaeli App — New Chat Handover Brief
*26 March 2026 — Post design session. Copy this entire document to start the new build chat.*

---

## Hi! Continuing development of Zaeli.

Zaeli is an **iOS-first AI family life platform** built in React Native / Expo. We've been building this across many sessions. Please read `CLAUDE.md` in the repo root before we start — it has the full stack, architecture rules, and coding standards.

---

## How I like to work
- I'm a **beginner developer** — always give **full file rewrites** I can copy-paste, never partial diffs
- **Two fixes at a time max** — bulk changes cause too many variables when something breaks
- One PowerShell command at a time, never chained with `&&`
- Explain what you're doing in plain English before any code
- **Design before code** — for any new screen or major feature, discuss first
- Always ask me to upload the current working file before editing — never build from memory

---

## Who I am
- My name is **Richard**. The logged-in user in the app is **Rich** (Richard)
- Family: Anna, Richard (Rich), Poppy (Yr6, age 12, girl), Gab (Yr4, age 10, BOY — Gabriel, he/him), Duke (Yr1, age 8, boy)
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell)
- PowerShell escape: `app\`(tabs`)\filename.tsx`
- Repo: https://github.com/RDK1981/zaeli (private)
- Admin dashboard: https://incomparable-gumdrop-32e4ba.netlify.app

---

## Key constants
```
DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'
SONNET    = 'claude-sonnet-4-20250514'   ← CORRECT (NOT claude-sonnet-4-6)
GPT_MINI  = 'gpt-5.4-mini'              ← CORRECT (NOT gpt-4.1-mini — that model is retired)
CRITICAL: OpenAI = max_completion_tokens. Anthropic = max_tokens. Never mix these.
```

---

## Current app state (as of 25 Mar 2026)

### What's built and working
- `index.tsx` — Home chat screen (PRIMARY). Splash → chat. Anthropic tool-calling for calendar, todos, shopping. Whisper voice. Photo scan via calendarScan param.
- `calendar.tsx` — Full time grid (48px/hour), day strip, month view, event CRUD via Zaeli chat, photo scan to event
- `shopping.tsx` — List / Pantry / Spend tabs, receipt scan, pantry sync
- `mealplanner.tsx` — GPT brief, meal plan
- `more.tsx` — Hub + Settings + Todos stub
- `tutor.tsx`, `tutor-child.tsx`, `tutor-session.tsx` — Homework help, Socratic method
- `zaeli-chat.tsx` — DEPRECATED, replaced by index.tsx

### Pending from previous session
- Verify calendar event CRUD (add/update/delete) end-to-end
- Verify photo scan → Zaeli vision → event creation end-to-end
- Remove console.log diagnostic statements from `index.tsx` send() and executeTool()
- `tutor-practice.tsx` UX review
- `tutor-reading.tsx` UX review

---

## ══════════════════════════════════════
## THE NEW VISION — READ THIS CAREFULLY
## ══════════════════════════════════════

This session introduces a major architectural and design shift. We spent a full design session defining this. Everything below is **locked and agreed**.

---

## 1. NO MORE DEDICATED SCREENS — EVERYTHING IS A CHANNEL

### The fundamental shift
The old model: Home screen + separate dedicated screens (Calendar, Shopping, Meals etc.) with their own navigation.

**The new model: Everything is a channel.** There is no dedicated Calendar screen you navigate *to*. There is no dedicated Shopping screen. There are **channels** — each one is a persistent chat with Zaeli, where the relevant data renders inline inside the conversation.

The user never leaves "chat". They switch **channels**, not screens.

### What a channel is
A channel is a full-screen chat interface with Zaeli. It has:
1. A **banner** at the top — wordmark + channel name + avatar. This stays fixed.
2. A **brief** below the banner on first open — DM Serif hero text + quick action pills. Scrolls away as conversation grows.
3. A **chat area** — white background, Zaeli messages on the left, user bubbles on the right. Zaeli renders data (calendar, shopping list, meal plan, todos etc.) **directly inline** as rich components inside her messages — not as separate screens.
4. A **chat bar** at the bottom — identical pill structure across all channels, only the + button action changes.

### The 10 channels
| Channel | What Zaeli renders inline |
|---------|--------------------------|
| 🏠 Home | Calendar week grid, any data surface when asked |
| 📅 Calendar | Time grid, day view, event detail |
| 🛒 Shopping | Shopping list, pantry, spend summary |
| 🍽 Meals | Week meal plan, tonight's dinner |
| 🎒 Kids Hub | All kids at a glance, homework status |
| 📚 Tutor | Question cards, Socratic chat, full-width doc style |
| ✅ To-dos | Task list with big DM Serif number, overdue/today/done |
| 📝 Notes | Notes list, note detail |
| ✈️ Travel | Trip status, checklist, hotel/flight info |
| 👨‍👩‍👧 Our Family | All 5 family members, today at a glance |

---

## 2. NAVIGATION MODEL

### How users switch channels
- **Hamburger menu** (top left or swipe) — lists all 10 channels, tapping navigates to that channel
- **Zaeli suggests** — if the user asks something that belongs in another channel, Zaeli can offer a transition: *"Want to switch to Calendar to see the full week?"*
- **Deep links** — existing `router.navigate()` params (seedMessage, autoMic, calendarScan) still work, they just navigate to the relevant channel
- **No bottom tab bar** — hamburger menu only, same as before

### Navigation rules (UNCHANGED — critical)
- Always `router.navigate()` — never `router.push()` (stacks copies) or `router.replace()` (crashes from inside modals)
- Channel files live in `app/(tabs)/` — same as before
- Each channel is its own `.tsx` file

### Channel file mapping
```
app/(tabs)/index.tsx          → Home channel (existing, refactor)
app/(tabs)/calendar.tsx       → Calendar channel (existing, refactor)
app/(tabs)/shopping.tsx       → Shopping channel (existing, refactor)
app/(tabs)/mealplanner.tsx    → Meals channel (existing, refactor)
app/(tabs)/kids.tsx           → Kids Hub channel (NEW)
app/(tabs)/tutor.tsx          → Tutor channel (existing, refactor)
app/(tabs)/todos.tsx          → To-dos channel (NEW)
app/(tabs)/notes.tsx          → Notes channel (NEW)
app/(tabs)/travel.tsx         → Travel channel (NEW)
app/(tabs)/family.tsx         → Our Family channel (NEW)
```

---

## 3. COLD START — SPLASH SCREEN

### Spec (locked)
- Background: **Aqua Green `#A8E8CC`**
- Wordmark: **Ink `#0A0A0A` body** + **Warm Peach `#FAC8A8`** on the 'a' and 'i'
- Font: DM Serif Display, 72px, letter-spacing -3px
- Personal time-of-day greeting above wordmark: *"Good morning, Anna 👋"* — Poppins 400, 15px
- Tagline below wordmark: *"Your family, smarter."* — Poppins 500, 10px, uppercase, 2.5px letter-spacing
- Loading dots: 3 × 6px circles, `#FAC8A8` peach, animated pulse
- Hold duration: **1.5 seconds**, then transition to Home channel
- Subtle radial glow orbs in top-right and bottom-left for depth

### Implementation note
The existing splash → index.tsx flow stays. Just update the splash styling to match this spec.

---

## 4. BRAND & COLOUR SYSTEM — LOCKED

### The wordmark rule
Font: **DM Serif Display**, always lowercase `zaeli`. The 'a' and 'i' carry a complementary colour — the AI easter egg. Never explain it in marketing.

### Three logo contexts
| Context | Wordmark body | 'a' and 'i' |
|---------|--------------|------------|
| Dark backgrounds (splash, social) | `#A8E8CC` Aqua Green | `#FAC8A8` Warm Peach |
| Light/channel backgrounds (app banner) | `#0A0A0A` Ink | Channel ai colour (see table below) |
| White/collapsed banner | `#0A0A0A` Ink | `#FAC8A8` Warm Peach |

### Per-channel colour system (THE CORE RULE)
Every channel has a **background colour**, a **AI letter colour** (for the wordmark 'a' and 'i'), and an **accent colour** (for the send button, Zaeli eyebrow label, CTA pills).

The AI letter colour and accent colour travel together — they are always the same colour in a given context.

| Channel | Banner bg | 'a'+'i' / eyebrow / send / pills | Accent (dark, for eyebrow text) |
|---------|-----------|----------------------------------|-------------------------------|
| Home | `#F5EAD8` | `#A8D8F0` Sky Blue | `#0A7A3A` |
| Calendar | `#B8EDD0` | `#F0C8C0` Warm Blush | `#0A7A3A` |
| Shopping | `#F0E880` | `#D8CCFF` Lavender | `#6A6000` |
| Meals | `#FAC8A8` | `#A8E8CC` Fresh Green | `#C84010` |
| Kids Hub | `#A8E8CC` | `#FAC8A8` Warm Peach | `#0A6040` |
| Tutor | `#D8CCFF` | `#A8E8CC` Fresh Green | `#5020C0` |
| To-dos | `#F0DC80` | `#D8CCFF` Lavender | `#806000` |
| Notes | `#C8E8A8` | `#F0C8C0` Warm Blush | `#2A6010` |
| Travel | `#A8D8F0` | `#B8EDD0` Soft Mint | `#0060A0` |
| Our Family | `#F0C8C0` | `#D8CCFF` Lavender | `#A01830` |

**The rule in plain English:** On each channel's banner, the wordmark 'a' and 'i', the Zaeli eyebrow label, the send button background, and the action pill backgrounds are ALL the channel's ai colour. The wordmark body is always ink. The ai colours are all pastel — the send button arrow is always ink (not white).

### Family member colours (person-first, unchanged)
```
Anna:  #FF7B6B
Rich:  #4D8BFF
Poppy: #A855F7
Gab:   #22C55E
Duke:  #F59E0B
```

### Typography (unchanged)
- **DM Serif Display** — wordmark, hero brief, feature titles, big numbers
- **Poppins** — all UI, chat text, labels, buttons, timestamps. Never swap.

---

## 5. CHANNEL BANNER STRUCTURE — LOCKED

Every channel banner follows this exact structure:

```
┌─────────────────────────────────────────┐  ← channel bg colour
│ [status bar]                            │
│ zaeli    [Channel Name]  [Anna avatar]  │  ← wordmark 34px + channel name 13px/600
│ ─────────────────────────────────────── │  ← 1px divider rgba(0,0,0,0.08)
│ [Brief — only on Home and cold opens]   │  ← DM Serif 24px hero + pills
│ ─────────────────────────────────────── │
└─────────────────────────────────────────┘
```

### Banner spec
- **Wordmark**: DM Serif Display, **34px**, letter-spacing -1.5px, ink body, ai letters in channel colour
- **Channel name**: Poppins 600, **13px**, `rgba(0,0,0,0.5)` — shown to the right of wordmark, left of avatar
- **Avatar**: 32×32px circle, family colour of logged-in user (Rich = `#4D8BFF`)
- **Banner padding**: 10px top, 22px sides, 16px bottom
- **Background**: Always the channel's bg colour — it does NOT go white when scrolled. The banner stays coloured throughout.
- **Divider**: 1px, `rgba(0,0,0,0.08)`

---

## 6. THE BRIEF — HOME AND COLD CHANNEL OPEN

On Home (and optionally on first open of other channels), a brief sits between the banner and the chat area:

```
Good morning, Rich 👋  Thursday 26 March   ← Poppins 12px, rgba(0,0,0,0.38)
Soccer's at 4, dinner's wide open —        ← DM Serif 24px, ink
and Gab's library books are due today.       em tags for italic de-emphasis

[Sort dinner]  [Remind Gab]  [All good]   ← pills: channel ai bg, ink text, Poppins 600 12px
```

The brief scrolls away naturally as the chat conversation grows. It does NOT collapse to a slim bar — the banner stays but the brief disappears under scroll.

### Brief writing rules (Zaeli's voice)
- Anne Hathaway energy — smart, warm, magnetic. Never try-hard.
- Australian warmth. NEVER "mate" or "guys". Never starts with "I".
- Plain text only — no asterisks or markdown in spoken responses.
- Sets the scene first, then makes the offer. Never ends on a bare open question.
- Quick reply chips always follow Zaeli's messages that invite a response.

### Example brief (Home, evening, busy day)
*"Thursday's already loaded — two runs, dance pickup, and the shopping is less of a quick top-up and more of a logistics operation. Dinner's the easy win. Pasta bake, everything in the pantry, 30 minutes. Want me to lock it in?"*

---

## 7. CHAT INTERFACE — LOCKED SPEC

### Zaeli messages
```
[sky dot] ZAELI  9:41 am          ← eyebrow: 9px/700/uppercase, channel ai colour
Pasta bake would sort dinner...   ← Poppins 15px/400, ink, line-height 1.6

[▶ Play] [□ Copy] [➤ Forward] [👍 Helpful]   ← action icons, 26px, opacity 0.35
```

### User bubbles
```
                    Yes lock it in   ← right-aligned, rounded 14px/2px/14px/14px
                   [□ Copy] [➤ Fwd] ← right-aligned action icons below bubble
```

### Quick reply chips
```
[Lock in pasta bake]  [Something else]  [What's on tomorrow]
```
Shown below every Zaeli message that invites a response. Poppins 12px/500, 7px/13px padding, 16px border-radius, `rgba(0,0,0,0.15)` border, white background.

### Message action icons (4 icons on Zaeli, 2 on user)
- **▶ Play** — triangle SVG, reads message aloud (ElevenLabs, future)
- **□ Copy** — two overlapping rect SVG
- **➤ Forward** — paper plane SVG
- **👍 Helpful** — thumbs up SVG
- All icons: 26×26px button, 8px border-radius, opacity 0.35 at rest, 0.7 on hover, no background fill

### Chat text sizes
- Zaeli message text: **Poppins 15px/400**, line-height 1.6
- User bubble text: **Poppins 15px/400**, line-height 1.5
- Chat input placeholder: Poppins 13px

---

## 8. CHAT BAR — CANONICAL SPEC (unchanged from ZAELI-CHAT-BAR-SPEC.md)

```
inputArea (position:absolute, bottom:0, transparent bg)
  paddingH:14, paddingBottom: iOS?30:18, paddingTop:10

barPill (borderRadius:30, paddingV:14, paddingH:16, borderWidth:1, shadow)
  ├── barBtn 34×34 → IcoPlus 20×20 SVG stroke rgba(0,0,0,0.4)
  ├── barSep 1×18px rgba(10,10,10,0.1)
  ├── TextInput fontSize:15, Poppins_400Regular
  ├── barBtn 34×34 → IcoMic 20×20 SVG
  └── barSend 32×32, borderRadius:16, bg = channel ai colour
      → IcoSend 16×16 SVG, stroke = var(--ink) [ALL channels — ai colours are pastel]
```

**Send button colour:** Each channel uses its own ai colour (NOT a universal colour). The arrow is always ink — not white — because all ai colours are light pastels.

**KAV structure (do not deviate):**
```tsx
<KAV behavior='padding' offset={0}>
  <View style={contentWrap}>           // flex:1, position:relative
    <ScrollView/>
    <View style={[inputArea, keyboardOpen && inputAreaKb]}/>  // absolute
  </View>
</KAV>
```

---

## 9. IN-CHAT RICH RENDERING — THE BIG ONE

When Zaeli surfaces data, it renders **inline inside the chat** as a full-width component — no card wrapper, no border, no extra padding. It feels like the data extends naturally out of Zaeli's message.

### Calendar time grid (inline)
- 48px = 1 hour, proportional height always
- Full day 0am–midnight, auto-scrolls to now − 2hrs on open
- Family-coloured event blocks (person-first colours)
- Now-line: `#E8374B` red dot + horizontal line
- Half-hour dashed guidelines
- All-day event lane above grid
- Overlap: side-by-side columns for 1–2 overlapping events
- Day strip above grid: multi-colour family dots, today pill highlighted in ink

### Shopping list (inline)
- Grouped by aisle/category with section headers
- Emoji icons for each item
- Circular check buttons — tapping a food item auto-syncs to Pantry
- Recently Bought section in magenta `#D4006A`, no strikethrough

### Meal plan (inline)
- DM Serif 22px for tonight's dinner name
- 7-day list below with day name, meal, time badge
- Unplanned days shown as italic placeholder

### To-do list (inline)
- DM Serif 48px big number at top (count of open tasks)
- Sections: Overdue (red), Due Today, This Week, Done
- Person avatar (18px circle) on each task showing who it belongs to

### Tutor (full-width document style — NOT bubbles)
- Question card: white/FAFAFA background, question text, Zaeli's guiding note
- Student response: white card, student name in their colour
- Zaeli response: tinted card in channel colour, no standard bubble
- Photo prompt card: dark background with camera icon

### Notes (inline)
- Note cards with title, preview text, tag chip, date
- Tapping opens note detail in same channel

### Travel (inline)
- Trip hero: destination in DM Serif, countdown, status pills
- Checklist below with check/uncheck

### Our Family (inline)
- All 5 family members as rows
- Avatar (40px circle, family colour), name, today's key commitment, status indicator

---

## 10. IMPLEMENTATION PRIORITY ORDER

Work through these in order. **Do not jump ahead.**

### Phase 1 — Stabilise existing (do first)
1. Verify calendar event CRUD (add/update/delete) working end-to-end via chat
2. Verify photo scan → vision → event creation end-to-end
3. Remove all console.log diagnostic statements from index.tsx
4. `tutor-practice.tsx` UX review
5. `tutor-reading.tsx` UX review

### Phase 2 — Splash screen update
6. Update splash screen to new brand spec (aqua bg, ink+peach wordmark, greeting, peach dots)

### Phase 3 — Home channel refactor (index.tsx)
7. Update banner: 34px wordmark, ink body + `#A8D8F0` sky ai letters, channel name label, cream bg throughout
8. Brief pills: `#A8D8F0` background, ink text
9. Send button: `#A8D8F0` background, ink arrow
10. Zaeli eyebrow (dot + name): `#A8D8F0`
11. Chat text: Poppins 15px throughout
12. Add message action icons (play/copy/forward/thumbs up on Zaeli, copy/forward on user)
13. Quick reply chips on every Zaeli message that invites response

### Phase 4 — Calendar channel refactor (calendar.tsx)
14. Update banner to channel colour system (`#B8EDD0` bg, blush ai letters)
15. Remove any navigation that goes "to" a dedicated screen — everything stays in channel
16. Ensure inline chat rendering of calendar data works

### Phase 5 — Shopping channel refactor (shopping.tsx)
17. Update banner to channel colour system (`#F0E880` bg, lavender ai letters)
18. Inline rendering of list, pantry, spend in chat

### Phase 6 — New channels (stub first, then flesh out)
19. Create `kids.tsx` — Kids Hub channel
20. Create `todos.tsx` — To-dos channel
21. Create `notes.tsx` — Notes channel
22. Create `travel.tsx` — Travel channel
23. Create `family.tsx` — Our Family channel

### Phase 7 — Meals and Tutor refactor
24. Update `mealplanner.tsx` → Meals channel
25. Update `tutor.tsx` → Tutor channel (channel colour system)

### Phase 8 — Navigation update
26. Update hamburger menu to list all 10 channels with correct colours
27. Ensure channel switching works cleanly via router.navigate()
28. Remove any remaining dedicated-screen navigation

---

## 11. ARCHITECTURE RULES (UNCHANGED — CRITICAL)

```
Navigation:     router.navigate() only — NEVER push() or replace()
Date handling:  Local date construction — NEVER toISOString() (UTC/AEST shift bug)
Events table:   Column is start_time NOT time
Model strings:  claude-sonnet-4-20250514 (vision) · gpt-4.1-mini (chat/briefs)
Image picker:   ['images'] as any — NOT deprecated MediaTypeOptions.Images
Keyboard:       KAV → contentWrap (relative) → ScrollView + inputArea (absolute)
SafeAreaView:   edges={['top']} always
Logo tap:       router.navigate('/(tabs)/') on all screens
```

---

## 12. SUPABASE TABLES

```
events         → date, start_time (ISO local), end_time, assignees (jsonb)
todos          → family_id, text, due_date, assignee, completed
shopping_items → family_id, name, category, quantity, checked
pantry_items   → family_id, name, category, stock_level
receipts       → family_id, store, purchase_date, total_amount, items (jsonb)
meal_plans     → family_id, date, meal_name, recipe_id
recipes        → family_id, name, ingredients, instructions
family_members → family_id, name, colour, role
api_logs       → family_id, model, input_tokens, output_tokens, screen, created_at
tutor_sessions → family_id, child_id, subject, messages (jsonb)
```

**Supabase project:** `rsvbzakyyrftezthlhtd` (Sydney, ap-southeast-2)

---

## 13. REFERENCE FILES

I have a complete HTML mockup showing all 10 channels with the new brand system applied. You cannot access it directly, but I can describe any channel or share screenshots on request.

The following files exist in the repo root and should be read at the start of each session:
- `CLAUDE.md` — full stack, colours, family members, coding rules, screen status
- `ZAELI-PRODUCT.md` — product vision, design decisions
- `ZAELI-CHAT-BAR-SPEC.md` — canonical chat bar spec, apply identically everywhere

---

## 15. PRODUCT DECISIONS — 26 MARCH 2026 SESSION

These decisions override anything conflicting in older docs.

### Navigation model (FINAL)
- **No channel navigation UI anywhere in the app** — no hamburger menu listing channels, no grid, no tab bar
- **Zaeli is the only navigation mechanism** — she decides when to transition channels based on conversation context
- **Avatar (top right) opens:** Settings, Billing, Our Family, Tutor (with premium badge) — admin only, nothing conversational except Tutor
- **Tutor is a standalone premium module** — its own dedicated pages accessible from avatar menu, NOT a channel. Has its own sub-navigation (child selector, session history, subject picker). Subscription add-on at A$9.99/child/month.

### Channel transitions
- When Zaeli transitions a user to a channel, **no new brief is generated** — the conversation flows continuously
- Transitions happen via contextual pills in chat (see below) or Zaeli's own suggestion
- Background colour shifts subtly to the destination channel colour — the only visual signal of transition

### Pill system (LOCKED)
Two distinct pill types — users learn the difference instinctively:

**Portal pills** (destination navigation):
- Filled background in the **destination channel's bg colour**
- Arrow/chevron in the channel's **accent colour** (dark version)
- Examples: "See full list →" in `#F0E880` Shopping yellow, "Check calendar →" in `#B8EDD0` Calendar green
- Maximum 3 portal pills shown at once
- Tapping opens that channel's data **inline** in the current conversation — no separate navigation

**Quick reply chips** (conversation continuation):
- White background, ink border `rgba(0,0,0,0.15)`, ink text
- Continue the conversation — do not navigate anywhere
- Shown below every Zaeli message that invites a response

### Inline render philosophy
- When a portal pill is tapped, data renders **directly inside the chat** — fully interactive
- Shopping list: tappable items, tick to complete, auto-syncs to Pantry
- Calendar grid: fixed-height window (not internally scrollable) to avoid React Native nested scroll conflicts
- Each channel has a `renderMode` — either full channel open, or inline data render only
- Zaeli can offer "Want to see the full pantry?" as an escape hatch for deep editing

### API cost implications
- No channel brief on transition = significant cost saving vs old model
- Only Home generates a brief on cold open
- Other channels generate a brief only on first-ever open (cold open), not on subsequent visits within same session
- Tutor costs are cleanly attributable to the premium add-on subscription

### Logging (FIXED — 26 March)
- `api_logs` table columns are `input_tokens` / `output_tokens` (NOT `prompt_tokens` / `completion_tokens`)
- `total_tokens` column does NOT exist — do not insert it
- `FAMILY_ID` and `DUMMY_FAMILY_ID_HOME` are both `'00000000-0000-0000-0000-000000000001'`
- Logging is confirmed working as of 26 March 2026



These are new decisions that override anything in the existing docs:

1. **No dedicated screens** — everything lives in channels. Shopping.tsx becomes the Shopping channel, not a screen you navigate to.
2. **Banner stays coloured** — the channel background colour persists in the banner even when scrolled. It does NOT go white.
3. **Wordmark is bigger** — 34px in the banner (was 24px).
4. **Per-channel colour system** — wordmark ai letters, eyebrow, send button, and pills all use the channel's designated ai colour. This is locked.
5. **Send button arrow is ink** — all ai colours are pastel, so white arrow would disappear. Arrow is always `#0A0A0A`.
6. **Message action icons** — Zaeli messages: Play + Copy + Forward + Thumbs Up. User messages: Copy + Forward. Subtle, icon-only, opacity 0.35.
7. **Quick reply chips** — every Zaeli message that invites a response gets chips below it.
8. **Chat text is 15px** — not 13px. Bigger, more readable.
9. **Splash is aqua green** — `#A8E8CC` background, ink + peach wordmark, personal greeting.
10. **Home logo fix** — Home 'a'+'i' are sky blue `#A8D8F0`, NOT peach. Peach is only for dark backgrounds and the splash.

---

**Please confirm you've read this and CLAUDE.md. Start with Phase 1 — verify calendar CRUD is working before touching any of the new design work.**
