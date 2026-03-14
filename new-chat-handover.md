## Zaeli App — New Chat Handover Brief
*14 March 2026 — copy this entire message to start a new chat*

---

Hi! I'm continuing development of the **Zaeli app** — a React Native / Expo iOS-first family life platform with AI (Claude API) at its core. We've been building this together across many sessions and I need you to pick up exactly where we left off.

---

### Who you are talking to
- My name is Richard. The app's logged-in user is Anna (my family: Anna, Richard, Poppy age 12, Gab age 10, Duke age 8)
- I'm a beginner developer — always give me full file rewrites with copy-paste PowerShell commands
- Local path: `C:\Users\richa\zaeli` (Windows, PowerShell — no `&&` chaining)
- Repo: https://github.com/RDK1981/zaeli (private)

---

### Where to find everything
**Master brief (CLAUDE.md):** `C:\Users\richa\zaeli\CLAUDE.md` — contains full stack, colors, family members, coding rules, all screen statuses. Always read this first if you need context.

**Transcripts:** `/mnt/transcripts/` — full session history. See `journal.txt` for catalog. Read these if you need to recover any source file.

**Output files:** `/mnt/user-data/outputs/` — latest versions of all built files.

**Reference HTML mockups:** `platform-v5.html` and `platform-v6__2_.html` in uploads — use these as design reference.

**Key constants:**
- `DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001'`
- `DUMMY_MEMBER_NAME = 'Anna'`
- AI model: always `claude-sonnet-4-20250514`

---

### What's been built (as of today)
- ✅ `index.tsx` — Home screen with brief card (typewriter animation, instant load), Option C tiles (magenta/black/orange/gold footer bars), radar, Ask Zaeli bar
- ✅ `calendar.tsx` — Full calendar, add/edit events, Zaeli brief, dismissed card
- ✅ `shopping.tsx` — List tab (sticky toolbar), Pantry tab (scan, review, stock bars, insight card, nudges), Receipts stub
- ✅ `zaeli-chat.tsx` — Multi-channel chat, memory, pantry nudge after shopping adds, freeze fix
- ✅ `more.tsx` — Hub + Settings + Permissions screen
- ✅ `NavMenu.tsx` + `HamburgerButton` component
- ✅ `_layout.tsx` — Tab layout (all hidden from bar, hamburger nav only)
- ✅ `lib/useProductScanner.ts` — pickImage, scanProduct, scanPantry, scanReceipt
- ✅ `pantry_items` Supabase table — created and working

---

### What we were doing in the last session (March 14)
We completed a big session covering:

1. **Pantry tab** — fully built and working (scan, review screen, stock levels, insight card, + List button, delete for parents only)
2. **Scanning animation** — bottom sheet slides up with "Reading your photo… → Identifying items… → Almost done…" 3-step progress
3. **Pantry nudge** — after adding items in chat or manually, Zaeli checks pantry and shows a soft note if item is already stocked
4. **Sticky toolbar** on Shopping List — the + Add item / List·Aisle bar no longer scrolls away
5. **Home screen tiles redesigned** — Option C: coloured footer bar on each tile showing screen name + arrow. Order: Calendar (magenta) / Shopping (black) top row, Meals (orange) / To-dos (gold) bottom row
6. **Brief card improvements** — card is now always visible immediately on load, shows "Zaeli is thinking…" with dots while API call runs, then types out with a letter-by-letter typewriter animation
7. **Chat freeze fix** — removed `onContentSizeChange` loop, batched all state updates, capped messages at 60 per channel
8. **Pre-launch tracker** built as persistent interactive widget (20 tasks across 3 priority tiers)
9. **API cost discussion** — ~$0.20-0.30/family/month at normal use, ~$200-300/month at 1,000 families. API key must move server-side before launch.
10. **Post-launch plans agreed** — rebuild HTML mockup to match final product, build marketing site, build knowledge base

---

### Immediate next tasks (in priority order)
1. **Receipts tab** in shopping.tsx — discuss spec first, then build
2. **API usage logging** — Supabase table + wrapper function on all API calls (per-family cost tracking)
3. **Meal Planner screen** — reference: platform-v6 s-meals-plan screen
4. **Travel screen** stub
5. **Kids hub** redesign

---

### Key design decisions made (don't revisit without reason)
- No floating FAB anywhere
- Hamburger menu only navigation (no bottom tab bar visible)
- Tiles use Option C design (coloured footer bar, not top bar or border)
- To-dos colour = Gold `#B8A400` (not green, not yellow)
- Pantry scan: always adds/updates, never deletes, review screen before saving, anyone can scan, only parents can delete
- Shopping List toolbar is sticky (outside ScrollView)
- Brief card shows instantly with "thinking" state, then typewriter animation

---

### Tech reminders
- Import paths from `app/(tabs)/`: `../../lib/supabase`, `../components/NavMenu`
- SafeAreaView always `edges={['top']}`
- Poppins font family for all UI text, DMSerifDisplay for hero titles only
- Always `npx expo start --clear` after copying files

---

Please confirm you've read this and are ready to continue. The first thing I want to do is discuss the Receipts tab spec before we build anything.
