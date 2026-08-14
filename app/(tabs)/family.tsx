/**
 * family.tsx — Our Family (Round B commit 9 rewrite)
 *
 * Full rewrite from the zaeli-v2-our-family-mockup.html design. Replaces
 * the pre-v2 file that had Kids Hub / Tutor / Homework approvals etc —
 * all hidden in v2.
 *
 * v2 model:
 *   • Owner (Rich) — sees full roster + invite controls + per-kid Budget
 *     access toggle + member profile edit + danger zone
 *   • Adult (Anna) — sees read-only roster; only own profile is editable
 *   • Kid — never reaches this screen (guarded by MoreSheet + route redirect)
 *
 * Two views managed internally:
 *   • 'main'   — roster + invites + add-member CTA
 *   • 'member' — profile detail for one selected family member
 *
 * Data: real DB via lib/family-roster.ts (loadRoster + getRoster) and
 * lib/invite-state.ts (Supabase-backed invite_tokens).
 *
 * Deferred to a follow-up backend pass:
 *   • Persisting the kid Budget access toggle (needs new profile column
 *     or per-owner user_preferences entry — see TODO in profile detail).
 *   • Transfer ownership + Delete family (owner-only destructive actions).
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Dimensions, Modal, Alert, Share, Clipboard, StatusBar as RNStatusBar,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';

import { supabase } from '../../lib/supabase';
import { getProfile, waitForProfile } from '../../lib/auth';
import {
  loadRoster, getRoster, type RosterMember,
  updateMemberName, updateMemberColor, removeMember,
  getBudgetAccess, setBudgetAccess, ensureOwnMembership,
} from '../../lib/family-roster';
import {
  loadInvites, getPendingInvites, resendInvite, revokeInvite,
  relTime, type Invite,
} from '../../lib/invite-state';
import { consumeFamilyFrom } from '../../lib/navigation-store';

const { width: W } = Dimensions.get('window');

// ── Palette ─────────────────────────────────────────────────────────────
const BG        = '#FAF8F5';
const INK       = '#0A0A0A';
const INK2      = 'rgba(10,10,10,0.72)';
const INK3      = 'rgba(10,10,10,0.48);';
const INK4      = 'rgba(10,10,10,0.28)';
const LINE      = 'rgba(10,10,10,0.08)';
const CORAL     = '#FF4545';
const CORAL_D   = '#B83333';
const MINT      = '#B8EDD0';
const MINT_T    = '#E6F7EF';
const MINT_D    = '#2D7A52';
const SKY       = '#A8D8F0';
const SKY_T     = '#E8F4FD';
const SKY_D     = '#0A5C80';
const LAV       = '#D8CCFF';
const LAV_T     = '#F0EBFF';
const LAV_D     = '#5020C0';
const PEACH     = '#FAC8A8';
const PEACH_T   = '#FDF1E5';
const PEACH_D   = '#8A3A00';
const GOLD_T    = '#FBF5D6';
const GOLD_D    = '#8B6914';
const MAGENTA   = '#D4006A';

type Screen = 'main' | 'member';

export default function FamilyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ── State ─────────────────────────────────────────────────────────────
  const [view, setView] = useState<Screen>('main');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState<Invite | null>(null);

  // Option C (Aug 27) — persisted kid Budget access. Loaded from
  // profiles.budget_access on mount; writes fire-and-forget via
  // setBudgetAccess(), with optimistic local UI update.
  const [kidBudgetAccess, setKidBudgetAccess] = useState<Record<string, boolean>>({});

  // Option C — inline edit sheets (Name + Colour). Non-null = visible.
  const [editingName, setEditingName] = useState<RosterMember | null>(null);
  const [pickingColorFor, setPickingColorFor] = useState<RosterMember | null>(null);

  // Origin for back button — Settings sometimes links here
  const [fromSettings] = useState(() => consumeFamilyFrom() === 'settings');

  // ── Data load ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const profile = await waitForProfile(5000);
    if (!profile) { setLoading(false); return; }
    setMeId(profile.id);
    await loadRoster(profile.family_id);
    let currentRoster = getRoster();

    // Aug 27 hotfix — auto-heal the signed-in user's family_members row.
    // Andy hit "I don't appear in my own family list" because onboarding
    // filtered out `id === 'me'` from the family_members insert. This
    // ensures every screen that reads family_members can find the signed-in
    // user, and it's idempotent (no-op if row already exists).
    if (!currentRoster.find(m => m.id === profile.id)) {
      const healed = await ensureOwnMembership({
        id: profile.id,
        family_id: profile.family_id,
        name: (profile as any).name,
        colour: (profile as any).colour,
        kind: (profile as any).kind,
      });
      if (healed.created) {
        await loadRoster(profile.family_id);
        currentRoster = getRoster();
      }
    }
    setRoster(currentRoster);
    await loadInvites();
    setInvites(getPendingInvites());
    // Find owner
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, kind')
        .eq('family_id', profile.family_id)
        .eq('kind', 'owner')
        .maybeSingle();
      if (data?.id) setOwnerId(data.id);
    } catch {}
    // Option C — hydrate kid Budget access from profiles.budget_access.
    // Only kids need this; owner/adult always have access.
    try {
      const kids = currentRoster.filter(m => m.role === 'child');
      if (kids.length) {
        const { data: kidProfiles } = await supabase
          .from('profiles')
          .select('id, budget_access')
          .in('id', kids.map(k => k.id));
        const map: Record<string, boolean> = {};
        (kidProfiles ?? []).forEach((p: any) => { map[p.id] = !!p.budget_access; });
        setKidBudgetAccess(map);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Derived ───────────────────────────────────────────────────────────
  // Round B commit 11 — family_members table uses role='parent'|'child';
  // profiles table (separately) uses kind='owner'|'adult'|'kid'. Filter the
  // roster by parent/child, then use ownerId (from profiles.kind='owner')
  // to distinguish the Owner from other Adults at render time.
  const me = roster.find(m => m.id === meId) ?? null;
  const isOwner = meId != null && meId === ownerId;
  const isAdult = !isOwner && me?.role === 'parent';
  const adults = roster.filter(m => m.role === 'parent');
  const kids   = roster.filter(m => m.role === 'child');
  const selected = roster.find(m => m.id === selectedId) ?? null;

  const familyName = 'Family';   // TODO: pull from families.name once wired

  // ── Handlers ──────────────────────────────────────────────────────────
  function goBack() {
    if (view === 'member') { setView('main'); setSelectedId(null); return; }
    if (fromSettings) { router.navigate('/(tabs)/settings' as any); return; }
    router.navigate('/(tabs)/swipe-world' as any);
  }
  function openMember(m: RosterMember) {
    // Only owner can open other members' profiles for edit; adults can only
    // open their own. Kids can't reach this screen at all.
    if (!isOwner && m.id !== meId) return;
    setSelectedId(m.id);
    setView('member');
  }
  function openInvite() {
    router.navigate('/invite' as any);
  }
  async function onCopyLink(inv: Invite) {
    const link = `https://zaeli.app/invite/${inv.token}`;
    try { await Clipboard.setString(link); Alert.alert('Copied', 'Invite link copied to clipboard.'); } catch {}
  }
  async function onResend(inv: Invite) {
    try {
      await resendInvite(inv.token);
      const link = `https://zaeli.app/invite/${inv.token}`;
      await Share.share({ message: `Hey ${inv.name} — reminder your Zaeli invite is here: ${link}` });
    } catch (e:any) { Alert.alert('Resend failed', e?.message ?? 'Unknown error'); }
  }
  async function onRevoke(inv: Invite) {
    Alert.alert(
      'Revoke invite?',
      `${inv.name}'s pending invite will stop working. You can send a fresh one later.`,
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Revoke', style: 'destructive', onPress: async () => {
          try { await revokeInvite(inv.token); setInvites(getPendingInvites()); } catch {}
        }},
      ]
    );
  }
  async function onToggleKidBudget(kidId: string) {
    // Option C (Aug 27) — persisted to profiles.budget_access via the
    // setBudgetAccess helper. Optimistic UI: flip local state first,
    // then fire the DB write; if it fails, revert + alert.
    const prev = !!kidBudgetAccess[kidId];
    const next = !prev;
    setKidBudgetAccess(m => ({ ...m, [kidId]: next }));
    const res = await setBudgetAccess(kidId, next);
    if (!res.ok) {
      setKidBudgetAccess(m => ({ ...m, [kidId]: prev }));
      Alert.alert("Couldn't save", res.error ?? 'Try again in a moment.');
    }
  }

  // Option C — name / colour / remove handlers, wired through the
  // family-roster helpers (which handle Supabase + local cache invalidation).
  async function onSaveName(member: RosterMember, newName: string) {
    const res = await updateMemberName(member.id, newName);
    if (!res.ok) {
      Alert.alert("Couldn't save", res.error ?? 'Try again in a moment.');
      return;
    }
    setEditingName(null);
    // Reload roster from cache (helper already updated it in place).
    setRoster([...getRoster()]);
  }

  async function onSaveColor(member: RosterMember, newColor: string) {
    const res = await updateMemberColor(member.id, newColor);
    if (!res.ok) {
      Alert.alert("Couldn't save", res.error ?? 'Try again in a moment.');
      return;
    }
    setPickingColorFor(null);
    setRoster([...getRoster()]);
  }

  function onRemoveMember(member: RosterMember) {
    Alert.alert(
      `Remove ${member.name} from family?`,
      `${member.name} will lose access to the family app immediately. Their account stays intact — you can re-invite them later if needed.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const res = await removeMember(member.id);
            if (!res.ok) {
              Alert.alert("Couldn't remove", res.error ?? 'Try again in a moment.');
              return;
            }
            // Go back to main view + refresh roster
            setView('main');
            setSelectedId(null);
            setRoster([...getRoster()]);
          },
        },
      ]
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex:1, backgroundColor: BG }} edges={['top']}>
        <RNStatusBar barStyle="dark-content"/>
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color: INK3 }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: BG }} edges={['top']}>
      <RNStatusBar barStyle="dark-content"/>

      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
          <TouchableOpacity onPress={goBack} style={s.back} activeOpacity={0.7}>
            <Text style={{ fontSize:15, color: INK2 }}>‹</Text>
          </TouchableOpacity>
          <Text style={s.wordmark}>z<Text style={{ color: MAGENTA }}>a</Text>el<Text style={{ color: MAGENTA }}>i</Text></Text>
        </View>
        <Text style={s.headerLabel}>{view === 'main' ? 'Our Family' : (selected?.name ?? '')}</Text>
      </View>

      {view === 'main' && (
        <MainView
          roster={roster}
          adults={adults}
          kids={kids}
          invites={invites}
          me={me}
          isOwner={isOwner}
          isAdult={isAdult}
          ownerId={ownerId}
          familyName={familyName}
          onMember={openMember}
          onInvite={openInvite}
          onCopyLink={onCopyLink}
          onResend={onResend}
          onRevoke={onRevoke}
          onShowQR={setShowQR}
          insets={insets}
        />
      )}

      {view === 'member' && selected && (
        <MemberDetailView
          member={selected}
          me={me}
          isOwner={isOwner}
          isMe={selected.id === meId}
          ownerId={ownerId}
          budgetAccess={!!kidBudgetAccess[selected.id]}
          onToggleBudget={() => onToggleKidBudget(selected.id)}
          onInvite={openInvite}
          onBack={goBack}
          onEditName={() => setEditingName(selected)}
          onEditColor={() => setPickingColorFor(selected)}
          onRemove={() => onRemoveMember(selected)}
        />
      )}

      {/* Option C — Edit name sheet */}
      <EditNameSheet
        member={editingName}
        onClose={() => setEditingName(null)}
        onSave={onSaveName}
      />

      {/* Option C — Colour picker sheet */}
      <ColorPickerSheet
        member={pickingColorFor}
        onClose={() => setPickingColorFor(null)}
        onSave={onSaveColor}
      />

      {/* QR modal (for pending invite QR share on same-device tests) */}
      <Modal visible={!!showQR} transparent animationType="fade" onRequestClose={() => setShowQR(null)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', alignItems:'center', justifyContent:'center' }}>
          <View style={{ backgroundColor: 'white', borderRadius:24, padding:24, alignItems:'center', width: 300 }}>
            <Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:18, marginBottom:6 }}>QR for {showQR?.name}</Text>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color: INK3, textAlign:'center', marginBottom:16, lineHeight: 18 }}>
              Scan on the second device to open the invite.
            </Text>
            {showQR && (<QRCode value={`https://zaeli.app/invite/${showQR.token}`} size={220}/>)}
            <TouchableOpacity onPress={() => setShowQR(null)} style={{ marginTop: 18, paddingHorizontal:22, paddingVertical:10, backgroundColor: INK, borderRadius:14 }}>
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:13, color:'white' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Main view (roster + invites) ────────────────────────────────────────
function MainView(p: {
  roster: RosterMember[];
  adults: RosterMember[];
  kids: RosterMember[];
  invites: Invite[];
  me: RosterMember | null;
  isOwner: boolean;
  isAdult: boolean;
  ownerId: string | null;
  familyName: string;
  onMember: (m: RosterMember) => void;
  onInvite: () => void;
  onCopyLink: (i: Invite) => void;
  onResend: (i: Invite) => void;
  onRevoke: (i: Invite) => void;
  onShowQR: (i: Invite) => void;
  insets: { top:number; bottom:number; left:number; right:number };
}) {
  return (
    <ScrollView
      style={{ flex:1 }}
      contentContainerStyle={{ padding: 14, paddingBottom: 40 + p.insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      {/* Family hero */}
      <View style={s.hero}>
        <Text style={s.heroName}>The {p.familyName}</Text>
        <Text style={s.heroMeta}>
          {p.roster.length} {p.roster.length === 1 ? 'member' : 'members'}
          {p.invites.length > 0 ? ` · ${p.invites.length} pending` : ''}
        </Text>
        <View style={{ flexDirection:'row', marginTop: 14 }}>
          {p.roster.slice(0, 6).map(m => (
            <View key={m.id} style={[s.heroAvatar, { backgroundColor: m.color, marginLeft: -6 }]}>
              <Text style={s.heroAvatarText}>{m.name.charAt(0).toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Pending invites — floats above roster with gold accent */}
      {p.invites.length > 0 && p.isOwner && (
        <>
          <Text style={s.secLbl}>Pending invites</Text>
          {p.invites.map(inv => (
            <View key={inv.token} style={s.pendingRow}>
              <View style={[s.pendingAvatar, { backgroundColor: inv.role === 'kid' ? LAV_D : SKY_D }]}>
                <Text style={{ fontSize:13, fontWeight:'800', color:'white' }}>{inv.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex:1, minWidth:0 }}>
                <Text style={s.pendingName} numberOfLines={1}>{inv.name} · {inv.role === 'kid' ? 'Kid' : 'Adult'}</Text>
                <Text style={s.pendingMeta} numberOfLines={1}>
                  Sent {relTime(inv.createdAt)}{inv.phone ? ` · ${inv.phone.slice(-4)}` : ''}
                </Text>
              </View>
              <View style={{ flexDirection:'row', gap: 4 }}>
                <TouchableOpacity onPress={() => p.onCopyLink(inv)} style={s.chip} activeOpacity={0.75}>
                  <Text style={s.chipText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => p.onShowQR(inv)} style={s.chip} activeOpacity={0.75}>
                  <Text style={s.chipText}>QR</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => p.onResend(inv)} style={s.chip} activeOpacity={0.75}>
                  <Text style={s.chipText}>Resend</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => p.onRevoke(inv)} style={s.chip} activeOpacity={0.75}>
                  <Text style={[s.chipText, { color: CORAL }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      {/* Adults */}
      <Text style={s.secLbl}>Adults</Text>
      {p.adults.map(m => (
        <MemberRow
          key={m.id}
          member={m}
          isMe={m.id === p.me?.id}
          isOwnerMember={m.id === p.ownerId}
          canTap={p.isOwner || m.id === p.me?.id}
          onPress={() => p.onMember(m)}
        />
      ))}

      {/* Kids */}
      {p.kids.length > 0 && <Text style={s.secLbl}>Kids</Text>}
      {p.kids.map(m => (
        <MemberRow
          key={m.id}
          member={m}
          isMe={m.id === p.me?.id}
          isOwnerMember={false}
          canTap={p.isOwner || m.id === p.me?.id}
          onPress={() => p.onMember(m)}
        />
      ))}

      {/* Add member CTA — owner only */}
      {p.isOwner ? (
        <TouchableOpacity onPress={p.onInvite} style={s.inviteCta} activeOpacity={0.85}>
          <Text style={s.inviteCtaPlus}>+</Text>
          <Text style={s.inviteCtaLbl}>Add a family member</Text>
          <Text style={s.inviteCtaSub}>Adult or kid — invite via SMS or QR</Text>
        </TouchableOpacity>
      ) : (
        <View style={s.readOnlyNudge}>
          <Text style={s.readOnlyNudgeText}>
            Only <Text style={{ fontWeight: '800', color: INK }}>the owner</Text> can invite or remove family members.{'\n'}
            <Text style={{ fontWeight: '800', color: INK }}>Nudge them if you need someone added.</Text>
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ── Member row ──────────────────────────────────────────────────────────
function MemberRow({ member, isMe, isOwnerMember, canTap, onPress }:{
  member: RosterMember; isMe: boolean; isOwnerMember: boolean; canTap: boolean; onPress: () => void;
}) {
  // Round B commit 11 — family_members.role is 'parent' | 'child'; cross-ref
  // with isOwnerMember (from profiles.kind='owner') to label the Owner row.
  const isKid = member.role === 'child';
  const roleLabel = isOwnerMember ? 'Owner' : isKid ? 'Kid' : 'Adult';
  const rolePillColor = isOwnerMember ? PEACH_D : isKid ? LAV_D : SKY_D;
  const rolePillBg    = isOwnerMember ? PEACH_T : isKid ? LAV_T : SKY_T;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={canTap ? 0.85 : 1}
      style={s.memberRow}
    >
      <View style={[s.memberAvatar, { backgroundColor: member.color }]}>
        <Text style={s.memberAvatarText}>{member.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex:1, minWidth:0 }}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          <Text style={s.memberName} numberOfLines={1}>{member.name}</Text>
          {isMe && (
            <View style={[s.pill, { backgroundColor: 'rgba(10,10,10,0.06)' }]}>
              <Text style={[s.pillText, { color: INK2 }]}>You</Text>
            </View>
          )}
          {!isMe && (
            <View style={[s.pill, { backgroundColor: rolePillBg }]}>
              <Text style={[s.pillText, { color: rolePillColor }]}>{roleLabel}</Text>
            </View>
          )}
        </View>
        <Text style={s.memberMeta} numberOfLines={1}>
          {isKid && member.yearLevel ? `Year ${member.yearLevel}` : roleLabel}
        </Text>
      </View>
      {canTap && <Text style={s.chev}>›</Text>}
    </TouchableOpacity>
  );
}

// ── Member profile detail ──────────────────────────────────────────────
function MemberDetailView(p: {
  member: RosterMember;
  me: RosterMember | null;
  isOwner: boolean;
  isMe: boolean;
  ownerId: string | null;
  budgetAccess: boolean;
  onToggleBudget: () => void;
  onInvite: () => void;
  onBack: () => void;
  onEditName: () => void;
  onEditColor: () => void;
  onRemove: () => void;
}) {
  // Round B commit 11 — family_members.role is 'parent'|'child'; owner is
  // identified separately via profiles.kind='owner' (passed as p.ownerId).
  const isKid = p.member.role === 'child';
  const isAdult = p.member.role === 'parent';
  const isOwnerMember = p.member.id === p.ownerId;
  const canEdit = p.isOwner || p.isMe;

  return (
    <ScrollView
      style={{ flex:1 }}
      contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={s.profileHero}>
        <View style={[s.profileAvatar, { backgroundColor: p.member.color }]}>
          <Text style={s.profileAvatarText}>{p.member.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={s.profileName}>{p.member.name}</Text>
        <View style={{ flexDirection:'row', gap: 6, marginTop: 4 }}>
          <View style={[s.pill, { backgroundColor: isOwnerMember ? PEACH_T : isKid ? LAV_T : SKY_T }]}>
            <Text style={[s.pillText, { color: isOwnerMember ? PEACH_D : isKid ? LAV_D : SKY_D }]}>
              {isOwnerMember ? 'Owner' : isKid ? 'Kid' : 'Adult'}
            </Text>
          </View>
          <View style={[s.pill, { backgroundColor: MINT_T }]}>
            <Text style={[s.pillText, { color: MINT_D }]}>Joined</Text>
          </View>
        </View>
      </View>

      {/* Basics */}
      <Text style={s.secLbl}>Basics</Text>
      <View style={s.rowGroup}>
        {/* Option C — Name is now tappable (owner or self can edit) */}
        {canEdit ? (
          <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={p.onEditName}>
            <Text style={s.rowLbl}>Name</Text>
            <View style={{ flexDirection:'row', alignItems:'center', gap: 6 }}>
              <Text style={s.rowVal}>{p.member.name}</Text>
              <Text style={{ fontSize:14, color: INK3 }}>›</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={s.row}>
            <Text style={s.rowLbl}>Name</Text>
            <Text style={s.rowVal}>{p.member.name}</Text>
          </View>
        )}
        {isKid && p.member.yearLevel && (
          <View style={s.row}>
            <Text style={s.rowLbl}>Year level</Text>
            <Text style={s.rowVal}>Year {p.member.yearLevel}</Text>
          </View>
        )}
        {/* Option C — Colour is now tappable (owner or self can edit) */}
        {canEdit ? (
          <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={p.onEditColor}>
            <Text style={s.rowLbl}>Colour</Text>
            <View style={{ flexDirection:'row', alignItems:'center', gap: 8 }}>
              <View style={{ width:20, height:20, borderRadius:10, backgroundColor: p.member.color, borderWidth: 1, borderColor: 'rgba(10,10,10,0.10)' }}/>
              <Text style={{ fontSize:14, color: INK3 }}>›</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={s.row}>
            <Text style={s.rowLbl}>Colour</Text>
            <View style={{ width:18, height:18, borderRadius:9, backgroundColor: p.member.color }}/>
          </View>
        )}
        {isKid && p.isOwner && !p.isMe && (
          <View style={s.row}>
            <Text style={s.rowLbl}>Reset PIN</Text>
            <TouchableOpacity onPress={() => Alert.alert('Reset PIN', `${p.member.name} will get a fresh PIN. They'll need to use it next sign-in.`)}>
              <Text style={[s.rowVal, { color: SKY_D, fontWeight: '700' }]}>Send new PIN →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Access (kids only) */}
      {isKid && (
        <>
          <Text style={s.secLbl}>Access</Text>
          <View style={s.rowGroup}>
            <View style={s.row}>
              <View style={{ flex:1 }}>
                <Text style={s.rowLbl}>Home &amp; Chat</Text>
                <Text style={s.rowSubLbl}>Calendar · Shopping · Reminders</Text>
              </View>
              <View style={[s.pill, { backgroundColor: MINT_T }]}>
                <Text style={[s.pillText, { color: MINT_D }]}>Always on</Text>
              </View>
            </View>
            <View style={s.row}>
              <View style={{ flex:1 }}>
                <Text style={s.rowLbl}>Our Budget</Text>
                <Text style={s.rowSubLbl}>Sees family finances</Text>
              </View>
              {p.isOwner ? (
                <TouchableOpacity onPress={p.onToggleBudget} activeOpacity={0.7}>
                  <View style={[s.toggle, p.budgetAccess ? s.toggleOn : null]}>
                    <View style={[s.toggleDot, p.budgetAccess ? s.toggleDotOn : null]}/>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={[s.pill, { backgroundColor: 'rgba(10,10,10,0.06)' }]}>
                  <Text style={[s.pillText, { color: INK2, opacity: 0.6 }]}>
                    {p.budgetAccess ? 'On' : 'Off'}
                  </Text>
                </View>
              )}
            </View>
            <View style={s.row}>
              <View style={{ flex:1 }}>
                <Text style={s.rowLbl}>Manage members</Text>
                <Text style={s.rowSubLbl}>Owner-only</Text>
              </View>
              <View style={[s.pill, { backgroundColor: 'rgba(10,10,10,0.06)' }]}>
                <Text style={[s.pillText, { color: INK2, opacity: 0.6 }]}>Off</Text>
              </View>
            </View>
          </View>

          {p.budgetAccess && p.isOwner && (
            <View style={s.confirmBanner}>
              <Text style={s.confirmBannerText}>
                <Text style={{ fontWeight:'800', color: INK }}>{p.member.name} can now open Our Budget.</Text>
                {' '}They'll see income, expenses, and savings — same as you.
              </Text>
            </View>
          )}
        </>
      )}

      {/* Access (adults) */}
      {isAdult && !p.isMe && (
        <>
          <Text style={s.secLbl}>Access</Text>
          <View style={s.rowGroup}>
            <View style={s.row}>
              <View style={{ flex:1 }}>
                <Text style={s.rowLbl}>Everything</Text>
                <Text style={s.rowSubLbl}>Full family app — same as you</Text>
              </View>
              <View style={[s.pill, { backgroundColor: MINT_T }]}>
                <Text style={[s.pillText, { color: MINT_D }]}>Yes</Text>
              </View>
            </View>
            {!isOwnerMember && (
              <View style={s.row}>
                <View style={{ flex:1 }}>
                  <Text style={s.rowLbl}>Manage members</Text>
                  <Text style={s.rowSubLbl}>Owner-only</Text>
                </View>
                <View style={[s.pill, { backgroundColor: 'rgba(10,10,10,0.06)' }]}>
                  <Text style={[s.pillText, { color: INK2, opacity: 0.6 }]}>No</Text>
                </View>
              </View>
            )}
          </View>
        </>
      )}

      {/* Danger — owner can remove others (except self). Option C wired to
          the real remove_family_member RPC — deletes family_members row +
          nulls profiles.family_id (revokes RLS access to all family data). */}
      {canEdit && !p.isMe && p.isOwner && (
        <TouchableOpacity
          style={s.dangerRow}
          onPress={p.onRemove}
          activeOpacity={0.75}
        >
          <Text style={s.dangerRowText}>Remove {p.member.name} from family</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ── Option C — Edit name sheet (inline text input modal) ────────────────
function EditNameSheet(p: {
  member: RosterMember | null;
  onClose: () => void;
  onSave: (member: RosterMember, newName: string) => void;
}) {
  const [value, setValue] = useState('');
  useEffect(() => {
    if (p.member) setValue(p.member.name);
  }, [p.member?.id]);

  if (!p.member) return null;
  const member = p.member;
  const trimmed = value.trim();
  const dirty = trimmed !== member.name;
  const valid = trimmed.length > 0 && trimmed.length <= 40;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={p.onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={p.onClose}
          style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', alignItems:'center', justifyContent:'center', padding: 20 }}
        >
          <TouchableOpacity activeOpacity={1} style={{ backgroundColor:'white', borderRadius:20, padding:22, width:'100%', maxWidth: 340 }}>
            <Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:18, color: INK, marginBottom: 4 }}>Edit name</Text>
            <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color: INK3, marginBottom: 16 }}>Used across the family app — calendar, brief, chat.</Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder="Name"
              placeholderTextColor={INK4}
              maxLength={40}
              autoFocus
              style={{
                borderWidth:1, borderColor:'rgba(10,10,10,0.14)', borderRadius:12,
                paddingHorizontal:14, paddingVertical:12,
                fontFamily:'Poppins_600SemiBold', fontSize:16, color: INK,
                backgroundColor: BG,
              }}
            />
            <View style={{ flexDirection:'row', gap: 10, marginTop: 18, justifyContent:'flex-end' }}>
              <TouchableOpacity onPress={p.onClose} style={{ paddingHorizontal:18, paddingVertical:10, borderRadius:12, backgroundColor:'rgba(10,10,10,0.06)' }}>
                <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color: INK2 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!dirty || !valid}
                onPress={() => p.onSave(member, trimmed)}
                style={{
                  paddingHorizontal:20, paddingVertical:10, borderRadius:12,
                  backgroundColor: (dirty && valid) ? INK : 'rgba(10,10,10,0.18)',
                }}
              >
                <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color:'white' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Option C — Colour picker sheet ──────────────────────────────────────
// Palette matches the canonical family channel colours + a few extras
// covering the range without becoming overwhelming.
const COLOR_PALETTE: { name: string; value: string }[] = [
  { name: 'Blue',    value: '#4D8BFF' },
  { name: 'Coral',   value: '#FF7B6B' },
  { name: 'Purple',  value: '#A855F7' },
  { name: 'Green',   value: '#22C55E' },
  { name: 'Amber',   value: '#F59E0B' },
  { name: 'Magenta', value: '#D4006A' },
  { name: 'Teal',    value: '#06B6D4' },
  { name: 'Slate',   value: '#64748B' },
];

function ColorPickerSheet(p: {
  member: RosterMember | null;
  onClose: () => void;
  onSave: (member: RosterMember, newColor: string) => void;
}) {
  const [picked, setPicked] = useState<string>('');
  useEffect(() => {
    if (p.member) setPicked(p.member.color);
  }, [p.member?.id]);

  if (!p.member) return null;
  const member = p.member;
  const dirty = picked.toLowerCase() !== member.color.toLowerCase();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={p.onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={p.onClose}
        style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', alignItems:'center', justifyContent:'center', padding: 20 }}
      >
        <TouchableOpacity activeOpacity={1} style={{ backgroundColor:'white', borderRadius:20, padding:22, width:'100%', maxWidth: 340 }}>
          <Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize:18, color: INK, marginBottom: 4 }}>Pick a colour</Text>
          <Text style={{ fontFamily:'Poppins_400Regular', fontSize:12, color: INK3, marginBottom: 16 }}>Used in calendar avatars, family list, and chat mentions.</Text>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap: 12, justifyContent:'center' }}>
            {COLOR_PALETTE.map(c => {
              const isPicked = picked.toLowerCase() === c.value.toLowerCase();
              return (
                <TouchableOpacity
                  key={c.value}
                  onPress={() => setPicked(c.value)}
                  activeOpacity={0.7}
                  style={{
                    width: 54, height: 54, borderRadius: 27,
                    backgroundColor: c.value,
                    borderWidth: isPicked ? 3 : 0,
                    borderColor: INK,
                    alignItems:'center', justifyContent:'center',
                  }}
                >
                  {isPicked && (
                    <Text style={{ fontFamily:'Poppins_800ExtraBold', fontSize: 22, color:'white' }}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ flexDirection:'row', gap: 10, marginTop: 22, justifyContent:'flex-end' }}>
            <TouchableOpacity onPress={p.onClose} style={{ paddingHorizontal:18, paddingVertical:10, borderRadius:12, backgroundColor:'rgba(10,10,10,0.06)' }}>
              <Text style={{ fontFamily:'Poppins_600SemiBold', fontSize:14, color: INK2 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!dirty}
              onPress={() => p.onSave(member, picked)}
              style={{
                paddingHorizontal:20, paddingVertical:10, borderRadius:12,
                backgroundColor: dirty ? INK : 'rgba(10,10,10,0.18)',
              }}
            >
              <Text style={{ fontFamily:'Poppins_700Bold', fontSize:14, color:'white' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingHorizontal:14, paddingBottom:12,
  },
  back: {
    width:32, height:32, borderRadius:10, backgroundColor:'rgba(10,10,10,0.05)',
    alignItems:'center', justifyContent:'center',
  },
  wordmark: { fontFamily:'Poppins_800ExtraBold', fontSize:26, letterSpacing:-1, color: INK },
  headerLabel: { fontFamily:'Poppins_700Bold', fontSize:17, color: INK2 },

  // Hero
  hero: {
    backgroundColor: '#FFE0ED', borderRadius: 20, padding: 18, marginBottom: 16,
  },
  heroName: { fontFamily:'Poppins_800ExtraBold', fontSize:20, color: INK, letterSpacing:-0.4 },
  heroMeta: { fontFamily:'Poppins_600SemiBold', fontSize:12, color: MAGENTA, marginTop: 4 },
  heroAvatar: {
    width:34, height:34, borderRadius:17, borderWidth:2, borderColor:'white',
    alignItems:'center', justifyContent:'center',
  },
  heroAvatarText: { fontFamily:'Poppins_800ExtraBold', fontSize:13, color:'white' },

  // Section label
  secLbl: {
    fontFamily:'Poppins_800ExtraBold', fontSize:10, letterSpacing:0.6, color: INK3,
    textTransform:'uppercase', marginTop: 14, marginBottom: 8, paddingLeft: 4,
  },

  // Member row
  memberRow: {
    flexDirection:'row', alignItems:'center', gap: 12,
    backgroundColor: 'white', padding: 12, borderRadius: 14,
    marginBottom: 6, minHeight: 60,
  },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems:'center', justifyContent:'center', flexShrink: 0,
  },
  memberAvatarText: { fontFamily:'Poppins_800ExtraBold', fontSize:15, color:'white' },
  memberName: { fontFamily:'Poppins_700Bold', fontSize:15, color: INK },
  memberMeta: { fontFamily:'Poppins_400Regular', fontSize:11, color: INK3, marginTop: 2 },
  chev: { fontSize:16, color: INK4 },

  // Pill (small role badges)
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pillText: { fontFamily:'Poppins_700Bold', fontSize:10, letterSpacing:0.3 },

  // Pending invite
  pendingRow: {
    flexDirection:'row', alignItems:'center', gap: 10,
    backgroundColor: GOLD_T, padding: 12, borderRadius: 14, marginBottom: 6,
  },
  pendingAvatar: {
    width: 34, height: 34, borderRadius: 17,
    alignItems:'center', justifyContent:'center', flexShrink: 0,
  },
  pendingName: { fontFamily:'Poppins_700Bold', fontSize:13, color: GOLD_D },
  pendingMeta: { fontFamily:'Poppins_400Regular', fontSize:10, color: GOLD_D, opacity: 0.8, marginTop: 2 },
  chip: {
    backgroundColor: 'white', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 4,
  },
  chipText: { fontFamily:'Poppins_700Bold', fontSize: 9, color: GOLD_D, letterSpacing: 0.3 },

  // Add-member CTA (owner)
  inviteCta: {
    backgroundColor: 'white', borderWidth: 1.5, borderColor: MAGENTA, borderStyle:'dashed',
    borderRadius: 14, padding: 16, alignItems:'center', marginTop: 8,
  },
  inviteCtaPlus: { fontFamily:'Poppins_800ExtraBold', fontSize: 22, color: MAGENTA },
  inviteCtaLbl: { fontFamily:'Poppins_700Bold', fontSize:13, color: MAGENTA, marginTop: 4 },
  inviteCtaSub: { fontFamily:'Poppins_400Regular', fontSize:10, color: INK3, marginTop: 2 },

  // Read-only nudge (adult view)
  readOnlyNudge: {
    marginTop: 20, padding: 14, alignItems:'center',
  },
  readOnlyNudgeText: {
    fontFamily:'Poppins_400Regular', fontSize:11, color: INK3,
    textAlign:'center', lineHeight: 17,
  },

  // Profile hero
  profileHero: {
    backgroundColor: 'white', borderRadius: 20, padding: 18, alignItems:'center', marginBottom: 14,
  },
  profileAvatar: {
    width: 70, height: 70, borderRadius: 35,
    alignItems:'center', justifyContent:'center', marginBottom: 10,
  },
  profileAvatarText: { fontFamily:'Poppins_800ExtraBold', fontSize:26, color:'white' },
  profileName: { fontFamily:'Poppins_800ExtraBold', fontSize:20, color: INK, letterSpacing:-0.4 },

  // Row group + row
  rowGroup: {
    backgroundColor: 'white', borderRadius: 14, overflow:'hidden', marginBottom: 14,
  },
  row: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: LINE,
    minHeight: 48,
  },
  rowLbl: { fontFamily:'Poppins_600SemiBold', fontSize:13, color: INK },
  rowSubLbl: { fontFamily:'Poppins_400Regular', fontSize:11, color: INK3, marginTop: 2 },
  rowVal: { fontFamily:'Poppins_400Regular', fontSize:12, color: INK3 },

  // Toggle
  toggle: {
    width: 34, height: 20, borderRadius: 10, backgroundColor: 'rgba(10,10,10,0.15)',
    position: 'relative',
  },
  toggleOn: { backgroundColor: MINT_D },
  toggleDot: {
    position:'absolute', top: 2, left: 2, width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'white',
  },
  toggleDotOn: { left: 16 },

  // Confirm banner (kid budget on)
  confirmBanner: {
    backgroundColor: MINT_T, borderRadius: 12, padding: 12, marginBottom: 14,
  },
  confirmBannerText: {
    fontFamily:'Poppins_400Regular', fontSize:11, color: MINT_D, lineHeight: 17,
  },

  // Danger row (remove member)
  dangerRow: {
    backgroundColor: 'white', borderRadius: 14, padding: 14, marginTop: 20, alignItems:'center',
  },
  dangerRowText: {
    fontFamily:'Poppins_700Bold', fontSize: 13, color: CORAL,
  },
});
