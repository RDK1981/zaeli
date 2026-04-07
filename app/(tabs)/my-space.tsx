/**
 * my-space.tsx — My Space · Page 2 in swipe-world
 * Phase 3b Pass 3 — Two-tap Goals · SVG play icons · True 92% sheets
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  StyleSheet, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon, Rect, Line } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// ─── SVG Icons (from index.tsx) ───────────────────────────────────────────────

function IcoPlay({ color = 'rgba(10,10,10,0.55)', size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Polygon points="5 3 19 12 5 21 5 3" />
    </Svg>
  );
}

function IcoPause({ color = 'rgba(10,10,10,0.55)', size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <Line x1="6" y1="4" x2="6" y2="20" />
      <Line x1="18" y1="4" x2="18" y2="20" />
    </Svg>
  );
}

// ─── Dummy data ───────────────────────────────────────────────────────────────

const HEALTH = {
  steps: 6842, goal: 10000, pct: 68, distance: 5.1, calories: 487,
  workouts: [
    { icon: '🏃', name: 'Outdoor Run',   meta: 'Yesterday · 6:34am', stats: ['6.1 km', '38 min', '412 cal'] },
    { icon: '🚴', name: 'Outdoor Cycle', meta: 'Thu 3 Apr · 7:10am',  stats: ['22.4 km', '58 min', '620 cal'] },
  ],
};

const GOALS = [
  { icon: '🏃', name: 'Noosa 10km Run',         meta: '3 May · 4 weeks away', pct: 62, detail: 'Complete the Noosa 10km in under 55 minutes. Race day 3 May — 4 weeks away.' },
  { icon: '📚', name: 'Read 12 books this year', meta: '4 of 12 done',          pct: 33, detail: 'Track your reading goal. 4 books done, 8 to go by end of year.' },
  { icon: '💧', name: 'Drink 2L water daily',    meta: 'Today: 1.2L of 2L',     pct: 60, detail: 'Stay hydrated every day. Currently at 1.2L today — almost there.' },
];

const NOTES = [
  { title: 'Bathroom reno ideas',  preview: 'Hex tiles for floor. Wall-hung vanity. Keep existing window.', updated: '2 days ago' },
  { title: 'Books to read',        preview: 'Clear — James Clear. The Creative Act — Rick Rubin.', updated: '1 week ago' },
  { title: 'Work — Q2 priorities', preview: 'Launch Zaeli beta. Onboarding flow. Stripe. TestFlight.', updated: 'Yesterday' },
];

const WOTD = {
  word: 'ephemeral.',
  phonetic: '/ ɪˈfem.ər.əl / · adjective',
  def: 'Lasting for a very short time. From Greek ephemeros — lasting only a day.',
  eg: '"The ephemeral beauty of cherry blossoms makes them all the more precious."',
};

const ZEN_TRACKS = [
  { name: 'Morning grounding', dur: '5 min · calm' },
  { name: 'Focus flow',        dur: '12 min · focus' },
  { name: 'Let go of the day', dur: '8 min · evening' },
  { name: 'Sleep well',        dur: '10 min · sleep' },
];

const WORDLE_ROWS = [
  [{ l:'C',s:'g'},{l:'R',s:'x'},{l:'A',s:'y'},{l:'N',s:'x'},{l:'E',s:'x'}],
  [{ l:'S',s:'x'},{l:'L',s:'g'},{l:'A',s:'g'},{l:'T',s:'y'},{l:'E',s:'x'}],
  [{ l:'C',s:'c'},{l:'L',s:'c'},{l:'A',s:'c'},{l:'M',s:'c'},{l:'P',s:'c'}],
  [{ l:'', s:'e'},{l:'', s:'e'},{l:'', s:'e'},{l:'', s:'e'},{l:'', s:'e'}],
  [{ l:'', s:'e'},{l:'', s:'e'},{l:'', s:'e'},{l:'', s:'e'},{l:'', s:'e'}],
  [{ l:'', s:'e'},{l:'', s:'e'},{l:'', s:'e'},{l:'', s:'e'},{l:'', s:'e'}],
];
const KB_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['↵','Z','X','C','V','B','N','M','⌫'],
];
const KB_GREEN  = new Set(['C','L','A']);
const KB_YELLOW = new Set(['T']);
const KB_GREY   = new Set(['R','N','E','S','M','P','B','D','F','G','H','I','J','K','O','Q','U','V','W','X','Y','Z']);

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MySpaceScreen() {
  const insets = useSafeAreaInsets();

  // Inline expand
  const [expanded, setExpanded] = useState<string | null>(null);
  // Sheet open — null | 'goals' | 'goal-detail' | 'goal-new' | 'notes' | 'wordle'
  const [sheet, setSheet]       = useState<string | null>(null);
  // Which goal is open in detail sheet
  const [activeGoal, setActiveGoal] = useState<number | null>(null);
  // Zen playing track
  const [zenPlaying, setZenPlaying] = useState(0);

  function toggleInline(card: string) {
    setExpanded(prev => (prev === card ? null : card));
  }

  function openGoalDetail(index: number) {
    setActiveGoal(index);
    setSheet('goal-detail');
  }

  function openNewGoal() {
    setSheet('goal-new');
  }

  function closeSheet() {
    setSheet(null);
    setTimeout(() => setActiveGoal(null), 350);
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.hdr}>
          <Text style={s.logo}>
            z<Text style={s.logoAi}>a</Text>el<Text style={s.logoAi}>i</Text>
          </Text>
          <Text style={s.pageLabel}>My Space</Text>
        </View>

        {/* ── Cards ── */}
        <HealthCard
          expanded={expanded === 'health'}
          onToggle={() => toggleInline('health')}
        />
        <GoalsCard
          expanded={expanded === 'goals'}
          onToggle={() => toggleInline('goals')}
          onGoalTap={openGoalDetail}
          onAddGoal={openNewGoal}
        />
        <WotdCard
          expanded={expanded === 'wotd'}
          onToggle={() => toggleInline('wotd')}
        />
        <NasaCard
          expanded={expanded === 'nasa'}
          onToggle={() => toggleInline('nasa')}
        />
        <ZenCard
          expanded={expanded === 'zen'}
          onToggle={() => toggleInline('zen')}
          zenPlaying={zenPlaying}
          setZenPlaying={setZenPlaying}
        />
        <NotesCard onOpen={() => setSheet('notes')} />
        <WordleCard onOpen={() => setSheet('wordle')} />
      </ScrollView>

      {/* ── 92% Sheets ── */}
      <GoalDetailSheet
        visible={sheet === 'goal-detail'}
        goal={activeGoal !== null ? GOALS[activeGoal] : null}
        onClose={closeSheet}
      />
      <NewGoalSheet
        visible={sheet === 'goal-new'}
        onClose={closeSheet}
      />
      <NotesSheet
        visible={sheet === 'notes'}
        onClose={closeSheet}
      />
      <WordleSheet
        visible={sheet === 'wordle'}
        onClose={closeSheet}
      />
    </View>
  );
}

// ─── Health Card ──────────────────────────────────────────────────────────────

function HealthCard({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const remaining = HEALTH.goal - HEALTH.steps;
  return (
    <TouchableOpacity style={[s.card, s.cardSlate]} activeOpacity={0.88} onPress={onToggle}>
      <Text style={s.ghost}>6K</Text>
      <View style={s.row}>
        <Text style={[s.headlineLt, { flex: 1 }]}>{HEALTH.steps.toLocaleString()} steps{'\n'}so far today.</Text>
        <Text style={s.healthPct}>{HEALTH.pct}%</Text>
      </View>
      <View style={s.barWrap}>
        <View style={[s.barFill, { width: `${HEALTH.pct}%` as any }]} />
      </View>
      <Text style={s.barFoot}>{remaining.toLocaleString()} to go · goal {HEALTH.goal.toLocaleString()}</Text>

      {expanded && (
        <>
          <View style={s.divider} />
          <View style={[s.hstatRow, { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' }]}>
            <Text style={s.hstatIcon}>🚶</Text>
            <View style={s.hstatLabel}>
              <Text style={s.hstatName}>Walk + Run distance</Text>
              <Text style={s.hstatMeta}>Today</Text>
            </View>
            <Text style={s.hstatVal}>{HEALTH.distance} <Text style={s.hstatUnit}>km</Text></Text>
          </View>
          <View style={s.hstatRow}>
            <Text style={s.hstatIcon}>🔥</Text>
            <View style={s.hstatLabel}>
              <Text style={s.hstatName}>Active calories</Text>
              <Text style={s.hstatMeta}>Today</Text>
            </View>
            <Text style={s.hstatVal}>{HEALTH.calories} <Text style={s.hstatUnit}>cal</Text></Text>
          </View>
          {HEALTH.workouts.map((w, i) => (
            <View key={i} style={s.workout}>
              <Text style={s.woIcon}>{w.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.woName}>{w.name}</Text>
                <Text style={s.woMeta}>{w.meta}</Text>
                <View style={s.woStats}>
                  {w.stats.map((stat, j) => <Text key={j} style={s.woStat}>{stat}</Text>)}
                </View>
              </View>
            </View>
          ))}
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Goals Card (tap 1 = inline, tap 2 = sheet) ───────────────────────────────

function GoalsCard({ expanded, onToggle, onGoalTap, onAddGoal }: {
  expanded: boolean;
  onToggle: () => void;
  onGoalTap: (index: number) => void;
  onAddGoal: () => void;
}) {
  return (
    <TouchableOpacity style={[s.card, s.cardGold]} activeOpacity={0.88} onPress={onToggle}>
      <Text style={s.headlineDk}>Three goals{'\n'}to work toward.</Text>

      {!expanded && (
        <Text style={s.tapHintDk}>Running · reading · hydration</Text>
      )}

      {expanded && (
        <>
          <View style={[s.divider, { backgroundColor: 'rgba(0,0,0,0.12)', opacity: 1 }]} />

          {GOALS.map((g, i) => (
            <TouchableOpacity
              key={i}
              style={[
                s.goalRow,
                i < GOALS.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(10,10,10,0.08)' },
              ]}
              activeOpacity={0.75}
              onPress={e => { e.stopPropagation(); onGoalTap(i); }}
            >
              <Text style={s.goalIcon}>{g.icon}</Text>
              <View style={s.goalBody}>
                <Text style={s.goalName}>{g.name}</Text>
                <Text style={s.goalMeta}>{g.meta}</Text>
                <View style={s.goalBarWrap}>
                  <View style={[s.goalBarFill, { width: `${g.pct}%` as any }]} />
                </View>
              </View>
              <Text style={s.goalPct}>{g.pct}% ›</Text>
            </TouchableOpacity>
          ))}

          {/* Add goal button */}
          <TouchableOpacity
            style={s.addGoalBtn}
            activeOpacity={0.75}
            onPress={e => { e.stopPropagation(); onAddGoal(); }}
          >
            <Text style={s.addGoalTxt}>+ Add goal</Text>
          </TouchableOpacity>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── WotD Card ────────────────────────────────────────────────────────────────

function WotdCard({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={[s.card, s.cardSage]} activeOpacity={0.88} onPress={onToggle}>
      <Text style={s.cardLabel}>Word of the Day</Text>
      <Text style={s.wotdWord}>{WOTD.word}</Text>
      <Text style={s.tapHintWotd}>{WOTD.phonetic}</Text>
      {expanded && (
        <>
          <View style={[s.divider, { backgroundColor: 'rgba(107,53,217,0.25)', opacity: 1 }]} />
          <Text style={s.wotdDef}>{WOTD.def}</Text>
          <Text style={s.wotdEg}>{WOTD.eg}</Text>
          {/* SVG play button — matches index.tsx IcoPlay */}
          <TouchableOpacity
            style={s.wotdPlay}
            activeOpacity={0.75}
            onPress={e => e.stopPropagation()}
          >
            <IcoPlay color="#6B35D9" size={14} />
            <Text style={s.wotdPlayTxt}>Play pronunciation</Text>
          </TouchableOpacity>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── NASA Card ────────────────────────────────────────────────────────────────

function NasaCard({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={[s.card, s.cardSlate, { padding: 0, overflow: 'hidden' }]} activeOpacity={0.88} onPress={onToggle}>
      <View style={s.nasaImg}>
        <Text style={s.nasaImgTxt}>✦</Text>
      </View>
      <View style={{ padding: 22, paddingTop: 14 }}>
        <Text style={s.cardLabelLt}>NASA · Astronomy Picture of the Day</Text>
        <Text style={s.headlineLt}>Saturn's rings,{'\n'}today.</Text>
        {!expanded && <Text style={s.tapHintLt}>Tap to read the full story</Text>}
        {expanded && (
          <>
            <View style={s.divider} />
            <Text style={s.nasaDesc}>NASA's Cassini spacecraft captured this final mosaic of Saturn before its planned atmospheric dive in September 2017 — from 1.09 million kilometres away.</Text>
            <Text style={s.nasaLink}>View full image →</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Zen Card ─────────────────────────────────────────────────────────────────

function ZenCard({ expanded, onToggle, zenPlaying, setZenPlaying }: {
  expanded: boolean; onToggle: () => void;
  zenPlaying: number; setZenPlaying: (i: number) => void;
}) {
  return (
    <TouchableOpacity style={[s.card, s.cardPeach]} activeOpacity={0.88} onPress={onToggle}>
      <Text style={s.headlineDk}>Four meditations{'\n'}ready for you.</Text>
      {!expanded && <Text style={s.tapHintDk}>Calm · focus · evening · sleep</Text>}
      {expanded && (
        <>
          <View style={[s.divider, { backgroundColor: 'rgba(0,0,0,0.10)', opacity: 1 }]} />
          {ZEN_TRACKS.map((t, i) => (
            <TouchableOpacity
              key={i}
              style={[
                s.zenTrack,
                i < ZEN_TRACKS.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(10,10,10,0.08)' },
              ]}
              activeOpacity={0.75}
              onPress={e => { e.stopPropagation(); setZenPlaying(i); }}
            >
              {/* SVG play/pause icon */}
              <View style={[s.zenBtn, zenPlaying === i && s.zenBtnOn]}>
                {zenPlaying === i
                  ? <IcoPause color={zenPlaying === i ? '#fff' : 'rgba(10,10,10,0.55)'} size={13} />
                  : <IcoPlay  color="rgba(10,10,10,0.55)" size={13} />
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.zenName}>{t.name}</Text>
                <Text style={s.zenDur}>{t.dur}</Text>
              </View>
              {zenPlaying === i && (
                <View style={s.zenProg}>
                  <View style={[s.zenProgFill, { width: '35%' }]} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Notes Card ───────────────────────────────────────────────────────────────

function NotesCard({ onOpen }: { onOpen: () => void }) {
  return (
    <TouchableOpacity style={[s.card, s.cardLav]} activeOpacity={0.88} onPress={onOpen}>
      <Text style={s.ghost}>3</Text>
      <Text style={s.headlineLt}>Three notes{'\n'}on the go.</Text>
      <Text style={s.tapHintLav}>Reno · books · work</Text>
    </TouchableOpacity>
  );
}

// ─── Wordle Card ──────────────────────────────────────────────────────────────

function WordleCard({ onOpen }: { onOpen: () => void }) {
  return (
    <TouchableOpacity style={[s.card, s.cardGold]} activeOpacity={0.88} onPress={onOpen}>
      <View style={s.row}>
        <Text style={[s.headlineDk, { flex: 1 }]}>12-day streak.{'\n'}Keep it going.</Text>
        <Text style={{ fontSize: 28, marginTop: 2, flexShrink: 0 }}>🔥</Text>
      </View>
      <Text style={s.tapHintDk}>Today's Wordle · 3 tries left</Text>
    </TouchableOpacity>
  );
}

// ─── Sheet base component ─────────────────────────────────────────────────────

function Sheet({ visible, onClose, title, subtitle, children }: {
  visible: boolean; onClose: () => void;
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.sheetWrap} activeOpacity={1} onPress={() => {}}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHdr}>
            <View>
              <Text style={s.sheetTitle}>{title}</Text>
              {subtitle ? <Text style={s.sheetSubtitle}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity style={s.sheetClose} onPress={onClose}>
              <Text style={s.sheetCloseTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          {children}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Goal Detail Sheet ────────────────────────────────────────────────────────

function GoalDetailSheet({ visible, goal, onClose }: {
  visible: boolean;
  goal: typeof GOALS[0] | null;
  onClose: () => void;
}) {
  if (!goal) return null;
  return (
    <Sheet visible={visible} onClose={onClose} title={`${goal.icon}  ${goal.name}`} subtitle={goal.meta}>
      <ScrollView style={s.sheetBody} showsVerticalScrollIndicator={false}>
        <View style={s.goalSheetBarWrap}>
          <View style={[s.goalSheetBarFill, { width: `${goal.pct}%` as any }]} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text style={s.goalSheetPctLabel}>{goal.pct}% complete</Text>
          <Text style={s.goalSheetPct}>{goal.pct}%</Text>
        </View>
        <Text style={s.goalSheetDetail}>{goal.detail}</Text>
        <View style={s.zaeliBox}>
          <Text style={s.zaeliBoxLbl}>Zaeli says</Text>
          <Text style={s.zaeliBoxTxt}>Your {goal.name} is coming along well. Want help building a dedicated plan to hit your target?</Text>
        </View>
        <TouchableOpacity style={s.zaeliCta}>
          <Text style={s.zaeliCtaTxt}>✦ Work on this with Zaeli</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Sheet>
  );
}

// ─── New Goal Sheet ───────────────────────────────────────────────────────────

function NewGoalSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="New Goal">
      <ScrollView style={s.sheetBody} showsVerticalScrollIndicator={false}>
        <Text style={s.newGoalHint}>Tell Zaeli what you want to work toward and she'll help you set it up.</Text>
        <TouchableOpacity style={s.zaeliCta}>
          <Text style={s.zaeliCtaTxt}>✦ Start a new goal with Zaeli</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </Sheet>
  );
}

// ─── Notes Sheet ──────────────────────────────────────────────────────────────

function NotesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title="📝  Notes">
      <ScrollView style={s.sheetBody} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={s.noteNewBtn}>
          <Text style={s.noteNewTxt}>+ New note</Text>
        </TouchableOpacity>
        {NOTES.map((n, i) => (
          <TouchableOpacity key={i} style={s.noteCard} activeOpacity={0.80}>
            <Text style={s.noteCardTitle}>{n.title}</Text>
            <Text style={s.noteCardPreview}>{n.preview}</Text>
            <Text style={s.noteCardMeta}>Updated {n.updated}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </Sheet>
  );
}

// ─── Wordle Sheet ─────────────────────────────────────────────────────────────

function WordleSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const tileColor:     Record<string,string> = { g:'#6AAA64', y:'#C9B458', x:'#787C7E', e:'transparent', c:'transparent' };
  const tileBorder:    Record<string,string> = { g:'transparent', y:'transparent', x:'transparent', e:'rgba(10,10,10,0.16)', c:'rgba(10,10,10,0.38)' };
  const tileTextColor: Record<string,string> = { g:'#fff', y:'#fff', x:'#fff', e:'transparent', c:'#0A0A0A' };

  function kbColor(letter: string) {
    if (KB_GREEN.has(letter))  return { bg: '#6AAA64', txt: '#fff' };
    if (KB_YELLOW.has(letter)) return { bg: '#C9B458', txt: '#fff' };
    if (KB_GREY.has(letter))   return { bg: 'rgba(10,10,10,0.22)', txt: 'rgba(10,10,10,0.35)' };
    return { bg: 'rgba(10,10,10,0.10)', txt: '#0A0A0A' };
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Wordle" subtitle="🔥 12-day streak">
      <ScrollView
        style={s.sheetBody}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}
      >
        {/* Grid */}
        <View style={s.wlGrid}>
          {WORDLE_ROWS.map((row, ri) => (
            <View key={ri} style={s.wlRow}>
              {row.map((cell, ci) => (
                <View key={ci} style={[s.wlTile, { backgroundColor: tileColor[cell.s], borderColor: tileBorder[cell.s] }]}>
                  <Text style={[s.wlTileTxt, { color: tileTextColor[cell.s] }]}>{cell.l}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Keyboard */}
        <View style={s.wlKb}>
          {KB_ROWS.map((row, ri) => (
            <View key={ri} style={s.wlKbRow}>
              {row.map((k, ki) => {
                const col = kbColor(k);
                const isWide = k === '↵' || k === '⌫';
                return (
                  <TouchableOpacity
                    key={ki}
                    style={[s.wlKey, isWide && s.wlKeyWide, { backgroundColor: col.bg }]}
                    activeOpacity={0.70}
                  >
                    <Text style={[s.wlKeyTxt, { color: col.txt }]}>{k}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </Sheet>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#FAF8F5' },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 14, gap: 10, paddingBottom: 130 },

  // Header
  hdr:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, paddingBottom: 10, paddingTop: 4 },
  logo:      { fontFamily: 'Poppins_800ExtraBold', fontSize: 36, color: '#0A0A0A', letterSpacing: -1.5, lineHeight: 42 },
  logoAi:    { color: '#A8D8F0' },
  pageLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: 'rgba(10,10,10,0.42)' },

  // Card base
  card:      { borderRadius: 22, padding: 22, overflow: 'hidden', position: 'relative' },
  cardSlate: { backgroundColor: '#3A3D4A' },
  cardGold:  { backgroundColor: '#F0DC80' },
  cardSage:  { backgroundColor: '#E8F4E8' },
  cardPeach: { backgroundColor: '#FAC8A8' },
  cardLav:   { backgroundColor: '#D8CCFF' },

  // Headlines
  headlineLt: { fontFamily: 'Poppins_700Bold', fontSize: 24, letterSpacing: -0.5, lineHeight: 30, color: '#fff' },
  headlineDk: { fontFamily: 'Poppins_700Bold', fontSize: 24, letterSpacing: -0.5, lineHeight: 30, color: '#1A1A1A' },

  // Labels & hints
  cardLabel:   { fontFamily: 'Poppins_700Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: 'rgba(107,53,217,0.45)', marginBottom: 4 },
  cardLabelLt: { fontFamily: 'Poppins_700Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: 'rgba(255,255,255,0.35)', marginBottom: 6 },
  tapHintDk:   { fontFamily: 'Poppins_500Medium', fontSize: 13, color: 'rgba(0,0,0,0.22)', marginTop: 10 },
  tapHintLt:   { fontFamily: 'Poppins_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.40)', marginTop: 10 },
  tapHintWotd: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: 'rgba(107,53,217,0.45)', marginTop: 4 },
  tapHintLav:  { fontFamily: 'Poppins_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 10 },

  row:     { flexDirection: 'row', alignItems: 'flex-start' },
  divider: { height: 1, marginVertical: 12, backgroundColor: 'rgba(255,255,255,0.15)' },

  // Ghost
  ghost: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 88, color: 'rgba(255,255,255,0.07)', position: 'absolute', right: -8, top: -18, lineHeight: 96 },

  // Health
  healthPct: { fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: '#A8D8F0', marginLeft: 8, marginTop: 2, flexShrink: 0 },
  barWrap:   { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 6, height: 7, overflow: 'hidden', marginTop: 12, marginBottom: 4 },
  barFill:   { height: '100%', borderRadius: 6, backgroundColor: '#A8D8F0' },
  barFoot:   { fontFamily: 'Poppins_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.28)', textAlign: 'right' },
  hstatRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  hstatIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  hstatLabel:{ flex: 1 },
  hstatName: { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: 'rgba(255,255,255,0.90)' },
  hstatMeta: { fontFamily: 'Poppins_400Regular',  fontSize: 13, color: 'rgba(255,255,255,0.40)' },
  hstatVal:  { fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#fff', flexShrink: 0 },
  hstatUnit: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.40)' },
  workout:   { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 12, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  woIcon:    { fontSize: 20, flexShrink: 0 },
  woName:    { fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#fff' },
  woMeta:    { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.40)', marginTop: 2 },
  woStats:   { flexDirection: 'row', gap: 8, marginTop: 4 },
  woStat:    { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: 'rgba(168,216,240,0.85)' },

  // Goals card
  goalRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  goalIcon:   { fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 },
  goalBody:   { flex: 1 },
  goalName:   { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: '#0A0A0A' },
  goalMeta:   { fontFamily: 'Poppins_400Regular',  fontSize: 13, color: 'rgba(10,10,10,0.42)' },
  goalBarWrap:{ height: 3, borderRadius: 2, backgroundColor: 'rgba(10,10,10,0.10)', marginTop: 5, overflow: 'hidden' },
  goalBarFill:{ height: '100%', borderRadius: 2, backgroundColor: '#FF4545' },
  goalPct:    { fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#FF4545', flexShrink: 0 },
  addGoalBtn: { marginTop: 14, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  addGoalTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: 'rgba(10,10,10,0.55)' },

  // WotD
  wotdWord:    { fontFamily: 'Poppins_700Bold', fontSize: 26, color: '#6B35D9', fontStyle: 'italic', letterSpacing: -0.5, lineHeight: 32 },
  wotdDef:     { fontFamily: 'Poppins_400Regular', fontSize: 16, color: 'rgba(10,10,10,0.55)', lineHeight: 22 },
  wotdEg:      { fontFamily: 'Poppins_400Regular', fontSize: 16, color: 'rgba(10,10,10,0.38)', fontStyle: 'italic', lineHeight: 22, marginTop: 6 },
  wotdPlay:    { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginTop: 12, backgroundColor: 'rgba(107,53,217,0.10)', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10 },
  wotdPlayTxt: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#6B35D9' },

  // NASA
  nasaImg:    { width: '100%', height: 130, backgroundColor: '#0D0D22', alignItems: 'center', justifyContent: 'center' },
  nasaImgTxt: { fontSize: 48, color: 'rgba(168,216,240,0.45)' },
  nasaDesc:   { fontFamily: 'Poppins_400Regular', fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 22, marginTop: 4 },
  nasaLink:   { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#A8D8F0', marginTop: 10 },

  // Zen
  zenTrack:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  zenBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(10,10,10,0.10)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  zenBtnOn:    { backgroundColor: 'rgba(10,10,10,0.70)' },
  zenName:     { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: '#0A0A0A' },
  zenDur:      { fontFamily: 'Poppins_400Regular',  fontSize: 13, color: 'rgba(10,10,10,0.42)' },
  zenProg:     { width: 56, height: 3, backgroundColor: 'rgba(10,10,10,0.12)', borderRadius: 2, overflow: 'hidden', flexShrink: 0 },
  zenProgFill: { height: '100%', backgroundColor: 'rgba(10,10,10,0.55)', borderRadius: 2 },

  // ── Sheet base — true 92% height, matches platform standard ──
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    backgroundColor: '#FAF8F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: H * 0.92,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(10,10,10,0.14)',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  sheetHdr: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(10,10,10,0.07)',
  },
  sheetTitle:    { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#0A0A0A' },
  sheetSubtitle: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: 'rgba(10,10,10,0.42)', marginTop: 2 },
  sheetClose:    { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(10,10,10,0.07)', alignItems: 'center', justifyContent: 'center' },
  sheetCloseTxt: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: 'rgba(10,10,10,0.45)' },
  sheetBody:     { paddingHorizontal: 20, paddingTop: 16, flex: 1 },

  // Goal detail sheet
  goalSheetBarWrap:  { height: 6, borderRadius: 3, backgroundColor: 'rgba(10,10,10,0.08)', overflow: 'hidden', marginBottom: 8, marginTop: 4 },
  goalSheetBarFill:  { height: '100%', borderRadius: 3, backgroundColor: '#FF4545' },
  goalSheetPctLabel: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(10,10,10,0.40)' },
  goalSheetPct:      { fontFamily: 'Poppins_700Bold', fontSize: 17, color: '#FF4545' },
  goalSheetDetail:   { fontFamily: 'Poppins_400Regular', fontSize: 16, color: 'rgba(10,10,10,0.55)', lineHeight: 23, marginBottom: 20 },
  zaeliBox:          { backgroundColor: 'rgba(10,10,10,0.04)', borderRadius: 14, padding: 16, marginBottom: 14 },
  zaeliBoxLbl:       { fontFamily: 'Poppins_700Bold', fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(10,10,10,0.28)', marginBottom: 6 },
  zaeliBoxTxt:       { fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#0A0A0A', lineHeight: 22 },
  zaeliCta:          { backgroundColor: '#FF4545', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  zaeliCtaTxt:       { fontFamily: 'Poppins_700Bold', fontSize: 15, color: '#fff' },

  // New goal sheet
  newGoalHint: { fontFamily: 'Poppins_400Regular', fontSize: 16, color: 'rgba(10,10,10,0.50)', lineHeight: 23, marginBottom: 24 },

  // Notes sheet
  noteNewBtn:      { backgroundColor: 'rgba(80,32,192,0.07)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(80,32,192,0.25)', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 14 },
  noteNewTxt:      { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#5020C0' },
  noteCard:        { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(10,10,10,0.07)', borderRadius: 14, padding: 16, marginBottom: 10 },
  noteCardTitle:   { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: '#0A0A0A', marginBottom: 4 },
  noteCardPreview: { fontFamily: 'Poppins_400Regular',  fontSize: 14, color: 'rgba(10,10,10,0.45)', lineHeight: 20 },
  noteCardMeta:    { fontFamily: 'Poppins_400Regular',  fontSize: 12, color: 'rgba(10,10,10,0.28)', marginTop: 6 },

  // Wordle sheet
  wlGrid:    { marginTop: 8, gap: 5 },
  wlRow:     { flexDirection: 'row', gap: 5 },
  wlTile:    { width: 52, height: 52, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  wlTileTxt: { fontFamily: 'Poppins_800ExtraBold', fontSize: 20, letterSpacing: 1 },
  wlKb:      { marginTop: 20, gap: 6, width: '100%', paddingHorizontal: 4 },
  wlKbRow:   { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  wlKey:     { minWidth: 30, height: 42, borderRadius: 7, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', flex: 1, maxWidth: 38 },
  wlKeyWide: { maxWidth: 54, minWidth: 44 },
  wlKeyTxt:  { fontFamily: 'Poppins_700Bold', fontSize: 13 },
});
