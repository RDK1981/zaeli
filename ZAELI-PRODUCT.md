# ZAELI-PRODUCT.md — Product Vision & Decisions
*Last updated: 2 April 2026 — Calendar sheet full build ✅ Inline card polish ✅ Delete flows ✅ Persistence fixed ✅*

---

## What Zaeli Is

Zaeli is an iOS-first AI family life platform for Australian families with children. A switched-on family assistant that knows your family's life — through conversation, not data entry.

**Tagline:** Less chaos. More family.

---

## Zaeli's Voice (LOCKED)

Sharp, warm, genuinely enthusiastic about this family. Finds the funny angle through delight, not detachment. Energy matches the moment: get-up-and-go in the morning, calm and settled at night.

**Hard rules:** Never 'mate'. Never starts with 'I'. Plain text only. Always ends on a confident offer. Be proportionate. Banned: 'queued up', 'sorted', 'tidy', 'chaos', 'ambush', 'sprint', 'locked in', 'breathing room'.

---

## Target Market

Australian families with children. Priority: dual-income metro couples with primary school-aged kids.
**Revenue:** A$14.99/month family · A$9.99/child/month Tutor · 100% web sales.

---

## Interface Philosophy (LOCKED ✅)

**Everything lives in Home. One conversation. One interface.**

Zaeli is the only navigation. No hamburger, no grid, no tab bar, no channel pages visible to users.

**9 domain pills** always float above chat input: Home · Calendar · Shopping · Meals · To-dos · Notes · Travel · Family · More

**Pill tap** → inline coloured card drops into chat thread + GPT-mini follow-up 400ms later.
**"Full ›"** on any card → 80% bottom sheet for deeper interaction.
**Sheets** = workspaces, not destinations. Max 2 levels. Close on confirm.

Kids Hub + Tutor remain standalone — sustained attention use cases requiring full screen focus.

---

## Design Rules (LOCKED)

- Channel bg = banner + status bar ONLY. Body = `#FAF8F5` warm white.
- No left-border accent strips on any cards — dots, icons, badges only.
- Send button = `#FF4545` coral always.
- Our Family = the only channel with no chat bar.
- **Colour lives ONLY in inline chat card renders. 80% sheets = clean black/grey.**

---

## ══════════════════════════════════
## CALENDAR MODULE (LOCKED ✅ 2 Apr 2026)
## ══════════════════════════════════

### Inline card (COMPLETE ✅)
Dark slate `#3A3D4A` card in chat thread. Shows today/tomorrow events.
Event rows → tap to expand in-place (spring animation). Never opens sheet.
Expanded: title, time, location, avatars, action chips.
Action chips: ✦ Edit with Zaeli · Move time · Add someone · Manual edit · Delete (two-tap)

### Sheet (COMPLETE ✅ 2 Apr 2026)
92% height, opens instantly (data populates async after open).
Three tabs: Today · Tomorrow · Month.
Header: SVG calendar icon + "Calendar" title. X closes sheet, ‹ backs from form.

**Today/Tomorrow:** White event cards, 3px left-border family colour.
Each card: ✦ Edit with Zaeli · Edit · Delete (two-tap confirm inline).
Add event row: left tap = manual form · right button = Zaeli chat.

**Month:** 7-col grid, Mon–Sun. Today = dark slate circle. Selected = coral circle.
Family-colour dots under dates (up to 3 per day). Tap day → events reveal below.
Auto-opens on today with today's events populated.

**Edit/Add form:** All fields (Title · Time · Location · Attendees · Repeat · Reminder).
Zaeli hint bar at top. Delete event button (edit mode only, two-tap confirm).
Save → closes sheet, injects confirmation card + message into chat.

### Card/pill tap behaviour (LOCKED ✅)
- Re-tapping Calendar pill: removes ALL existing calendar cards, appends fresh full-day card at bottom
- After Sonnet tool-call add: injects single-event card + confirmation
- After manual sheet save: closes sheet, injects single-event card + warm confirmation into chat

---

## ══════════════════════════════════
## SHEET DESIGN SYSTEM (LOCKED ✅ 2 Apr 2026)
## ══════════════════════════════════

Apply this pattern to ALL future domain sheets (Shopping, Meals, Todos, Notes, Travel, Family).

```
Height: 92%
Background: #FAF8F5
Border radius top: 24px
Internal structure (top to bottom):
  1. Handle bar (36×4px, rgba(0,0,0,0.12), centered, marginTop:10)
  2. Header row (paddingH:16, paddingV:12, borderBottom rgba(0,0,0,0.08))
     - Domain icon + title (Poppins_700Bold 18px)
     - X/‹ button (32×32, borderRadius:9, rgba(0,0,0,0.07) bg)
  3. Tab switcher (rgba(0,0,0,0.06) bg, borderRadius:22, padding:3, marginH:14, marginTop:12, marginBottom:6)
     - Tab: flex:1, paddingVertical:10, borderRadius:19
     - Active: #0A0A0A bg, white, Poppins_700Bold 13px
     - Inactive: transparent, rgba(0,0,0,0.40)
  4. Content wrapper: View flex:1 (CRITICAL — prevents void area)
  5. ScrollView: flex:1, padding:16, paddingBottom:50, keyboardShouldPersistTaps:'handled'

Backdrop: TouchableOpacity flex:1 (NOT Pressable — Pressable blocks scroll)
Sheet panel: plain View (NOT Pressable — same reason)
SafeAreaView: edges:['bottom'], flex:1

Open instantly: setSheetOpen(true) BEFORE any await
Fetch data: async after open, setState as arrives
```

### Event/item cards in sheets
```
backgroundColor: '#fff'
borderRadius: 14
marginBottom: 10
padding: 14
borderLeftWidth: 3, borderLeftColor: domain/member colour
Title: Poppins_700Bold 17px #0A0A0A
Meta: Poppins_400Regular 13px rgba(0,0,0,0.45)
Avatars: 26×26, borderRadius:13
Action buttons:
  Primary (Zaeli): rgba(168,216,240,0.18) bg + border rgba(168,216,240,0.45), borderRadius:10, pV:7 pH:12
    font: Poppins_600SemiBold 13px rgba(0,0,0,0.55)
  Secondary (manual): rgba(0,0,0,0.06) bg, same sizing
  Delete: rgba(0,0,0,0.04) bg (inactive) → rgba(220,38,38,0.12) red (confirm)
  Always two-tap delete pattern
```

### Form fields in sheets
```
Section labels: Poppins_700Bold 11px rgba(0,0,0,0.40) uppercase letterSpacing:0.8
Text inputs: '#fff' bg, borderRadius:12, borderWidth:1, rgba(0,0,0,0.10), pH:14 pV:12
  font: Poppins_400Regular 17px
Toggle pill groups (Repeat/Reminder):
  borderWidth:1.5, borderRadius:22, pV:8 pH:16
  Active: #0A0A0A bg + white text
  Inactive: '#fff' bg + rgba(0,0,0,0.12) border + rgba(0,0,0,0.55) text
  font: Poppins_600SemiBold 14px
Attendee avatars: 44×44, borderRadius:22, selected has borderWidth:2.5 #0A0A0A ring
Save button: flex:2, pV:16, borderRadius:14, #3A3D4A bg, Poppins_700Bold 15px white
Cancel: flex:1, pV:16, borderRadius:14, rgba(0,0,0,0.06) bg
```

### Add row (at bottom of list in any tab)
```
borderWidth:1.5, borderStyle:'dashed', borderColor:rgba(0,0,0,0.12)
borderRadius:14, padding:14, marginTop:4
Left (TouchableOpacity): opens manual form · font: Poppins_600SemiBold 15px rgba(0,0,0,0.35)
Right button (✦ Add with Zaeli): rgba(168,216,240,0.18) + border rgba(168,216,240,0.45)
  borderRadius:10, pV:7 pH:12, font: Poppins_600SemiBold 13px rgba(0,0,0,0.50)
```

---

## ══════════════════════════════════
## DELETE PATTERNS (LOCKED ✅ 2 Apr 2026)
## ══════════════════════════════════

Always two-tap to prevent accidents. Three locations:

1. **Inline card expanded chip:** Delete → Confirm delete (chip turns red)
2. **Sheet event card:** Delete button → Confirm delete button inline in card
3. **Sheet edit form:** "Delete event" text (soft red) → confirmation row with "Keep it" + "Yes, delete event"

After delete: refresh sheet/card/feed as appropriate. Never navigate away unexpectedly.

---

## ══════════════════════════════════
## INLINE CARD BEHAVIOUR (LOCKED ✅ 2 Apr 2026)
## ══════════════════════════════════

**Pill tap → fresh full-day card at bottom (always):**
All previous calendar inline cards removed. Fresh card appended at bottom.
Previous `_isPillFollowUp` Zaeli message replaced with fresh loading one.
activePill clears after 800ms enabling immediate re-tap.

**After tool-call add/edit:**
Single-event confirmation card injected above Zaeli confirmation text.
Warm confirmation: "[Event] locked in for [day] at [time]."

**After manual sheet save:**
Sheet closes. Single-event card + warm Zaeli message injected at bottom of chat.
Quick replies: 'Add another' · 'See full calendar' · 'Set a reminder'

**Persistence on reload:**
Only `isBrief` messages restored. No cards, no conversation.
`generateBrief` skips if persisted messages exist (no stacking).
Card always re-generates fresh on pill tap.

---

## ══════════════════════════════════
## HOME CHANNEL (LOCKED ✅)
## ══════════════════════════════════

### Cold open sequence
1. Zaeli brief (DM Serif 26px) — live data fetch, formula-driven, max 2 sentences
2. "Today's overview" toggle — auto-opens 200ms after brief
3. Card stagger: Calendar 0ms → Weather+Shopping 150ms → Actions 300ms → Dinner 450ms
4. 900ms after brief → post-card Zaeli follow-up + 3 chips in chat thread
5. Domain pill bar always floating

### Brief formula (NON-NEGOTIABLE — 160 max tokens)
EXACTLY 2 SHORT sentences. Name the person. Most urgent first. Confirm one win.

---

## ══════════════════════════════════
## EVENT TIME CONTRACT (LOCKED ✅)
## ══════════════════════════════════

**Store bare local datetime. Raw string parse. No timezone suffix. Ever.**

✅ `"2026-04-01T16:00:00"` stored → raw parse reads 16 → shows 4:00 pm
❌ `"2026-04-01T16:00:00+10:00"` stored → Supabase converts to UTC → wrong time

---

## ══════════════════════════════════
## SHOPPING / PANTRY (LOCKED ✅)
## ══════════════════════════════════

Three tabs: List · Pantry · Spend — one shared chat.

### Pantry — Last Bought model (LOCKED ✅)
Stock bars removed. Shows "last bought [date]" per item.
Photo scan logs items as purchased (not stock levels).
Receipts = primary data source.

---

## Pre-Launch Checklist
- [x] Home — single interface complete (brief + stagger + pills + post-card)
- [x] Calendar inline card complete + polish (expand, delete, manual edit)
- [x] Calendar sheet complete (Today/Tomorrow/Month, edit form, delete, add)
- [x] Calendar complete + time fix
- [x] Shopping rebuild complete
- [x] Meals rebuild complete
- [x] Domain pill bar (SVG Option D, 9 pills, palette active colours)
- [x] Pantry last-bought model
- [x] API logging + admin dashboard
- [x] Chat persistence (home, shopping, calendar, meals) — load/save fixed
- [x] Event time contract locked (raw parse, no +10:00)
- [x] Inline card interaction patterns locked (pill tap, confirmation cards, persistence)
- [x] Delete patterns locked (two-tap, three locations)
- [x] Sheet design system locked (apply to all future sheets)
- [ ] **Shopping sheet** ← NEXT
- [ ] **Meals sheet** ← NEXT
- [ ] Create reminders Supabase table
- [ ] Todos + Reminders build
- [ ] Kids Hub build
- [ ] Our Family build (sheet-based)
- [ ] Notes build
- [ ] Tutor rebuild
- [ ] Travel design + build
- [ ] EAS build · TestFlight for Anna
- [ ] Real auth · Remove dev toggle
- [ ] Website + Stripe + onboarding
- [ ] Settings module
- [ ] Timezone full fix (pre-launch requirement)
- [ ] Wire weather to real user location

---

## Key Product Moments

**The brief** — Two sentences. Specific. Named. Earns its place every morning.
**The pill tap** — One tap, live data, Zaeli follows up. Never navigated away.
**The all-done moment** — Everything sorted. "Enjoy the evening." Feels like a reward.
**"Zaeli noticed"** — Unprompted flags. Trust. Word of mouth.
**Sheets as workspaces** — Deeper work without losing conversation underneath.
**Persistent conversation** — Leave and come back, brief restores. 24hr memory.
