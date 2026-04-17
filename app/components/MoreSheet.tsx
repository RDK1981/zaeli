/**
 * MoreSheet.tsx — Zaeli More sheet
 *
 * The universal navigation sheet, triggered from the hamburger (☰) in each
 * screen's header. Replaces the old FAB More grid.
 *
 * Design: 92% bottom sheet · refined coloured tiles (Option 1) · no upload
 * section (camera + library live in the chat bar).
 *
 * Usage:
 *   <MoreSheet visible={moreOpen} onClose={() => setMoreOpen(false)} />
 *
 * Tapping any item closes the sheet and navigates/fires the relevant action.
 */

import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  Dimensions, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Polyline, Line, Rect, Circle, Path, Polygon } from 'react-native-svg';
import { setPendingChatContext } from '../../lib/navigation-store';

const { height: H } = Dimensions.get('window');

// ── Types ──────────────────────────────────────────────────────────────────
export interface MoreSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called when the user picks an item that requires the parent to handle nav (e.g. open a family channel sheet via Chat context) */
  onAction?: (key: string) => void;
}

// ── Colour tokens (matches Dashboard + module identities) ──────────────────
const C = {
  bg:        '#FAF8F5',
  ink:       '#0A0A0A',
  ink2:      'rgba(10,10,10,0.55)',
  ink3:      'rgba(10,10,10,0.32)',
  border:    'rgba(10,10,10,0.08)',
};

// ── Tile data (label, background, icon colour) ─────────────────────────────
const TILES = {
  // Family channels
  calendar:  { label: 'Calendar',     bg: '#2D3748', fg: '#CBD5E0', textColour: '#FFFFFF' },
  shopping:  { label: 'Shopping',     bg: '#D8CCFF', fg: '#5020C0', textColour: '#0A0A0A' },
  meals:     { label: 'Meals',        bg: '#B8EDD0', fg: '#2D7A52', textColour: '#0A0A0A' },
  radar:     { label: 'Tasks', bg: '#F0DC80', fg: '#8B6914', textColour: '#0A0A0A' },
  notes:     { label: 'Notes',        bg: '#FAC8A8', fg: '#8A3A00', textColour: '#0A0A0A' },
  travel:    { label: 'Travel',       bg: '#A8D8F0', fg: '#0096C7', textColour: '#0A0A0A' },
  // Personal
  myspace:   { label: 'My Space',     bg: '#E0F3FC', fg: '#0A4A6A', textColour: '#0A0A0A' },
  // Modules
  tutor:     { label: 'Tutor',        bg: '#EDE3FF', fg: '#6B35D9', textColour: '#0A0A0A' },
  kids:      { label: 'Kids Hub',     bg: '#D4F5E0', fg: '#0A8A5A', textColour: '#0A0A0A' },
  family:    { label: 'Our Family',   bg: '#FFE0ED', fg: '#D4006A', textColour: '#0A0A0A' },
  budget:    { label: 'Our Budget',   bg: '#CFEEE1', fg: '#059669', textColour: '#0A0A0A' },
  // Nav
  chat:      { label: 'Chat',         bg: '#EDE8FF', fg: '#5020C0', textColour: '#0A0A0A' },
  dashboard: { label: 'Dashboard',    bg: '#FAC8A8', fg: '#8A3A00', textColour: '#0A0A0A' },
  settings:  { label: 'Settings',     bg: 'rgba(107,114,128,0.12)', fg: '#6B7280', textColour: '#0A0A0A' },
};

// ── Icons ──────────────────────────────────────────────────────────────────
function IcoCalendar({ color }: { color: string }) {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <Rect x={3} y={4} width={18} height={18} rx={2}/><Line x1={16} y1={2} x2={16} y2={6}/><Line x1={8} y1={2} x2={8} y2={6}/><Line x1={3} y1={10} x2={21} y2={10}/>
  </Svg>;
}
function IcoShopping({ color }: { color: string }) {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><Line x1={3} y1={6} x2={21} y2={6}/><Path d="M16 10a4 4 0 01-8 0"/>
  </Svg>;
}
function IcoMeals({ color }: { color: string }) {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 8h1a4 4 0 010 8h-1"/><Path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><Line x1={6} y1={1} x2={6} y2={4}/><Line x1={10} y1={1} x2={10} y2={4}/><Line x1={14} y1={1} x2={14} y2={4}/>
  </Svg>;
}
function IcoRadar({ color }: { color: string }) {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="9 11 12 14 22 4"/><Path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </Svg>;
}
function IcoNotes({ color }: { color: string }) {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><Polyline points="14 2 14 8 20 8"/>
  </Svg>;
}
function IcoTravel({ color }: { color: string }) {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><Circle cx={12} cy={10} r={3}/>
  </Svg>;
}
function IcoMySpace({ color }: { color: string }) {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={12} r={10}/><Path d="M12 6v12M6 12h12"/>
  </Svg>;
}
function IcoTutor({ color }: { color: string }) {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <Rect x={2} y={3} width={20} height={14} rx={2}/><Line x1={8} y1={21} x2={16} y2={21}/><Line x1={12} y1={17} x2={12} y2={21}/>
  </Svg>;
}
function IcoKids({ color }: { color: string }) {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={8} r={4}/><Path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
  </Svg>;
}
function IcoFamily({ color }: { color: string }) {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
  </Svg>;
}
function IcoBudget({ color }: { color: string }) {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={12} r={10}/><Line x1={12} y1={6} x2={12} y2={18}/><Path d="M16 9H10.5a2.5 2.5 0 000 5H13a2.5 2.5 0 010 5H8"/>
  </Svg>;
}
function IcoDashboard({ color }: { color: string }) {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <Rect x={3} y={3} width={7} height={7} rx={1}/><Rect x={14} y={3} width={7} height={7} rx={1}/><Rect x={3} y={14} width={7} height={7} rx={1}/><Rect x={14} y={14} width={7} height={7} rx={1}/>
  </Svg>;
}
function IcoChat({ color }: { color: string }) {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </Svg>;
}
function IcoSettings({ color }: { color: string }) {
  return <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={12} r={3}/><Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09A1.65 1.65 0 0015 4.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9z"/>
  </Svg>;
}

function MoreIcon({ keyId, color }: { keyId: string; color: string }) {
  switch (keyId) {
    case 'calendar':  return <IcoCalendar color={color}/>;
    case 'shopping':  return <IcoShopping color={color}/>;
    case 'meals':     return <IcoMeals color={color}/>;
    case 'radar':     return <IcoRadar color={color}/>;
    case 'notes':     return <IcoNotes color={color}/>;
    case 'travel':    return <IcoTravel color={color}/>;
    case 'myspace':   return <IcoMySpace color={color}/>;
    case 'tutor':     return <IcoTutor color={color}/>;
    case 'kids':      return <IcoKids color={color}/>;
    case 'family':    return <IcoFamily color={color}/>;
    case 'budget':    return <IcoBudget color={color}/>;
    case 'chat':      return <IcoChat color={color}/>;
    case 'dashboard': return <IcoDashboard color={color}/>;
    case 'settings':  return <IcoSettings color={color}/>;
    default:          return null;
  }
}

// ── Component ──────────────────────────────────────────────────────────────
export default function MoreSheet({ visible, onClose, onAction }: MoreSheetProps) {
  const router = useRouter();

  // Guard against phantom backdrop taps right after the sheet opens
  const canCloseRef = React.useRef(false);
  React.useEffect(() => {
    if (visible) {
      console.log('[more] sheet visible=true, guard active');
      canCloseRef.current = false;
      const t = setTimeout(() => {
        canCloseRef.current = true;
        console.log('[more] guard lifted (400ms elapsed)');
      }, 400);
      return () => clearTimeout(t);
    }
  }, [visible]);

  function safeClose() {
    console.log('[more] safeClose called, canClose:', canCloseRef.current);
    if (!canCloseRef.current) { console.log('[more] safeClose → swallowed'); return; }
    onClose();
  }

  function wrappedOnClose() {
    console.log('[more] onClose fired (X button or request)');
    onClose();
  }

  function handleItem(key: string) {
    console.log('[more] tile tapped:', key);
    // CRITICAL ORDER — when parent passes onAction, we MUST call it SYNCHRONOUSLY first
    // so the parent can clear any refs (like sheetBeforeMoreRef) before we call onClose.
    // If we call onClose() first, the parent's close handler reads the stale ref and
    // may try to restore the origin sheet, overriding the nav we're about to do.
    if (onAction) {
      onAction(key);
      onClose();
      return;
    }
    // No onAction provided — use default routing after close animation completes
    onClose();
    setTimeout(() => {
      // Default handling — route directly where possible
      const screens: Record<string, string> = {
        myspace:   '/(tabs)/my-space',
        tutor:     '/(tabs)/tutor',
        kids:      '/(tabs)/kids',
        family:    '/(tabs)/family',
        settings:  '/(tabs)/settings',
      };
      if (screens[key]) {
        router.navigate(screens[key] as any);
        return;
      }
      if (key === 'budget') {
        Alert.alert('Our Budget', 'Coming soon — bank feed integration on the way.');
        return;
      }
      if (key === 'chat') {
        // From a standalone route → return to swipe-world (opens on Chat)
        router.navigate('/(tabs)/swipe-world' as any);
        return;
      }
      if (key === 'dashboard') {
        // From a standalone route → go to swipe-world + scroll to Dashboard via pending context
        setPendingChatContext({ type: 'goto_dashboard' as any } as any);
        router.navigate('/(tabs)/swipe-world' as any);
        return;
      }
      // Channels — set chat context and go to chat
      const channelContext: Record<string, any> = {
        calendar:  { type: 'calendar_sheet', event: { tab: 'today' } },
        shopping:  { type: 'shopping_sheet' },
        meals:     { type: 'meals_sheet' },
        radar:     { type: 'notes_tasks_sheet', tab: 'tasks' },
        notes:     { type: 'notes_tasks_sheet', tab: 'notes' },
        travel:    { type: 'add_event' }, // placeholder until Travel sheet built
      };
      if (channelContext[key]) {
        setPendingChatContext(channelContext[key]);
        router.navigate('/(tabs)/swipe-world' as any);
      }
    }, 180);
  }

  // ── Render ─────────────────────────────────────────────────────────────
  function Tile({
    keyId, size = 'small',
  }: {
    keyId: keyof typeof TILES;
    size?: 'small' | 'wide' | 'row';
  }) {
    const tile = TILES[keyId];
    return (
      <TouchableOpacity
        onPress={() => handleItem(keyId)}
        activeOpacity={0.82}
        style={[
          st.tile,
          size === 'wide' && st.tileWide,
          size === 'row' && st.tileRow,
          { backgroundColor: tile.bg },
        ]}
      >
        <View style={size === 'row' ? st.tileRowIcon : st.tileIcon}>
          <MoreIcon keyId={keyId} color={tile.fg}/>
        </View>
        <Text style={[st.tileLabel, { color: tile.textColour }]} numberOfLines={2}>
          {tile.label}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { console.log('[more] Modal.onRequestClose fired'); onClose(); }}>
      <TouchableOpacity
        style={st.backdrop}
        activeOpacity={1}
        onPress={safeClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={st.sheet}
        >
          <View style={st.handle}/>
          <View style={st.header}>
            <Text style={st.title}>More</Text>
            <TouchableOpacity onPress={wrappedOnClose} style={st.closeBtn} activeOpacity={0.7}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="rgba(10,10,10,0.55)" strokeWidth={2.5} strokeLinecap="round">
                <Line x1={6} y1={6} x2={18} y2={18}/>
                <Line x1={18} y1={6} x2={6} y2={18}/>
              </Svg>
            </TouchableOpacity>
          </View>

          <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={st.sectionLabel}>NAVIGATE</Text>
            <View style={st.grid2}>
              <Tile keyId="chat"/>
              <Tile keyId="dashboard"/>
            </View>

            <Text style={st.sectionLabel}>FAMILY CHANNELS</Text>
            <View style={st.grid3}>
              <Tile keyId="calendar"/>
              <Tile keyId="shopping"/>
              <Tile keyId="meals"/>
              <Tile keyId="radar"/>
              <Tile keyId="notes"/>
              <Tile keyId="travel"/>
            </View>

            <Text style={st.sectionLabel}>PERSONAL</Text>
            <View style={st.grid2}>
              <Tile keyId="myspace"/>
              <Tile keyId="budget"/>
            </View>

            <Text style={st.sectionLabel}>MODULES</Text>
            <View style={st.grid2}>
              <Tile keyId="tutor"/>
              <Tile keyId="kids"/>
            </View>

            <Text style={st.sectionLabel}>ACCOUNT</Text>
            <View style={st.grid2}>
              <Tile keyId="family"/>
              <Tile keyId="settings"/>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  backdrop:      { flex: 1, backgroundColor: 'rgba(10,10,10,0.40)', justifyContent: 'flex-end' },
  sheet:         {
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: H * 0.92,
    overflow: 'hidden',
  },
  handle:        { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(10,10,10,0.14)', alignSelf: 'center', marginTop: 10 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 },
  title:         { fontFamily: 'Poppins_800ExtraBold', fontSize: 28, color: C.ink, letterSpacing: -0.5 },
  closeBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(10,10,10,0.06)', alignItems: 'center', justifyContent: 'center' },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  sectionLabel:  { fontFamily: 'Poppins_700Bold', fontSize: 11, color: C.ink3, letterSpacing: 0.9, textTransform: 'uppercase', marginTop: 18, marginBottom: 10, paddingLeft: 4 },

  grid3:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid2:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  tile:          {
    flexBasis: '31%',
    flexGrow: 1,
    minHeight: 96,
    borderRadius: 18,
    padding: 14,
    justifyContent: 'space-between',
  },
  tileWide:      {
    flexBasis: '100%',
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  tileRow:       {
    flexBasis: '48%',
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  tileIcon:      { width: 34, height: 34, alignItems: 'flex-start', justifyContent: 'flex-start', marginBottom: 6 },
  tileRowIcon:   { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  tileLabel:     { fontFamily: 'Poppins_800ExtraBold', fontSize: 17, letterSpacing: -0.2, lineHeight: 21 },
});
