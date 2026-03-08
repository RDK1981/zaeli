import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  bg: '#0A0F1E',
  card: '#141929',
  card2: '#1A2235',
  border: '#1E2840',
  blue: '#4A90D9',
  blueLight: 'rgba(74,144,217,0.12)',
  blueBorder: 'rgba(74,144,217,0.25)',
  text: '#FFFFFF',
  text2: 'rgba(255,255,255,0.55)',
  text3: 'rgba(255,255,255,0.28)',
  green: '#1DB87A',
  greenLight: 'rgba(29,184,122,0.12)',
  greenBorder: 'rgba(29,184,122,0.25)',
  orange: '#E8922A',
  orangeLight: 'rgba(232,146,42,0.12)',
  orangeBorder: 'rgba(232,146,42,0.25)',
  purple: '#9B7FD4',
  purpleLight: 'rgba(155,127,212,0.12)',
  purpleBorder: 'rgba(155,127,212,0.25)',
  red: '#D64F3E',
  redLight: 'rgba(214,79,62,0.10)',
  yellow: '#F5C842',
  yellowLight: 'rgba(245,200,66,0.12)',
};

const MISSION_ICONS = ['⭐', '🎯', '📚', '🏃', '🧹', '🍽️', '🛏️', '🐕', '♻️', '🎨', '🏋️', '🌱'];

const MISSION_TEMPLATES = [
  { title: 'Make bed', icon: '🛏️', points: 5, frequency: 'daily' as const },
  { title: 'Brush teeth', icon: '🦷', points: 5, frequency: 'daily' as const },
  { title: 'Tidy bedroom', icon: '🧹', points: 10, frequency: 'daily' as const },
  { title: 'Feed the dog', icon: '🐕', points: 10, frequency: 'daily' as const },
  { title: 'Set the table', icon: '🍽️', points: 5, frequency: 'daily' as const },
  { title: 'Do homework', icon: '📚', points: 15, frequency: 'daily' as const },
  { title: 'Empty dishwasher', icon: '♻️', points: 10, frequency: 'weekly' as const },
  { title: 'Vacuum bedroom', icon: '🌱', points: 15, frequency: 'weekly' as const },
  { title: 'Take out bins', icon: '♻️', points: 15, frequency: 'weekly' as const },
  { title: 'Clean bathroom', icon: '🧹', points: 20, frequency: 'weekly' as const },
];

const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';
const DUMMY_MEMBER_ID = '00000000-0000-0000-0000-000000000002';

interface Mission {
  id: string;
  title: string;
  points: number;
  frequency: 'daily' | 'weekly' | 'once';
  icon?: string;
  assigned_to: string;
  family_id: string;
}

interface Reward {
  id: string;
  title: string;
  points_cost: number;
  family_id: string;
}

function Confetti({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const particles = useRef(
    Array.from({ length: 28 }, (_, i) => ({
      x: new Animated.Value(SCREEN_WIDTH / 2),
      y: new Animated.Value(400),
      opacity: new Animated.Value(1),
      rotate: new Animated.Value(0),
      color: [COLORS.yellow, COLORS.green, COLORS.blue, COLORS.orange, COLORS.purple][i % 5],
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;
    const animations = particles.map((p, i) => {
      p.x.setValue(SCREEN_WIDTH / 2);
      p.y.setValue(400);
      p.opacity.setValue(1);
      p.rotate.setValue(0);
      const angle = (i / particles.length) * Math.PI * 2;
      const distance = 100 + Math.random() * 160;
      return Animated.parallel([
        Animated.timing(p.x, { toValue: SCREEN_WIDTH / 2 + Math.cos(angle) * distance, duration: 1400, useNativeDriver: true }),
        Animated.timing(p.y, { toValue: 400 + Math.sin(angle) * distance - 220, duration: 1400, useNativeDriver: true }),
        Animated.timing(p.opacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
        Animated.timing(p.rotate, { toValue: 720, duration: 1400, useNativeDriver: true }),
      ]);
    });
    Animated.parallel(animations).start(() => onDone());
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, elevation: 9999 }]} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: 14,
            height: 14,
            borderRadius: 4,
            backgroundColor: p.color,
            transform: [
              { translateX: p.x },
              { translateY: p.y },
              { rotate: p.rotate.interpolate({ inputRange: [0, 720], outputRange: ['0deg', '720deg'] }) },
            ],
            opacity: p.opacity,
          }}
        />
      ))}
    </View>
  );
}

function AnimatedPoints({ value }: { value: number }) {
  const animVal = useRef(new Animated.Value(value)).current;
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    Animated.timing(animVal, { toValue: value, duration: 600, useNativeDriver: false }).start();
    animVal.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => animVal.removeAllListeners();
  }, [value]);

  return <Text style={styles.pointsValue}>{display}</Text>;
}

function MissionCard({ mission, completed, onComplete }: {
  mission: Mission; completed: boolean; onComplete: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (completed) return;
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.04, duration: 120, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onComplete();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={completed ? 1 : 0.8}>
      <Animated.View style={[
        styles.missionCard,
        { transform: [{ scale: scaleAnim }] },
        completed && styles.missionCardDone,
      ]}>
        <View style={[styles.missionIconWrap, completed && styles.missionIconWrapDone]}>
          <Text style={styles.missionIconText}>{mission.icon || '⭐'}</Text>
        </View>
        <View style={styles.missionInfo}>
          <Text style={[styles.missionTitle, completed && styles.missionTitleDone]}>
            {mission.title}
          </Text>
          <Text style={styles.missionPts}>⭐ {mission.points} points</Text>
        </View>
        <View style={[styles.missionTick, completed && styles.missionTickDone]}>
          {completed
            ? <Text style={styles.missionTickIcon}>✓</Text>
            : <Text style={styles.missionTickEmpty}> </Text>
          }
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function TasksScreen() {
  const [view, setView] = useState<'child' | 'parent'>('child');
  const [Tasks, setTasks] = useState<Mission[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [totalPoints, setTotalPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [addMissionModal, setAddMissionModal] = useState(false);
  const [addRewardModal, setAddRewardModal] = useState(false);
  const [newMission, setNewMission] = useState({
    title: '',
    points: '10',
    frequency: 'daily' as Mission['frequency'],
    icon: '⭐',
  });
  const [newReward, setNewReward] = useState({ title: '', points_cost: '100' });
  const [showTemplates, setShowTemplates] = useState(true);

  const streakScale = useRef(new Animated.Value(1)).current;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [TasksRes, rewardsRes, completionsRes] = await Promise.all([
      supabase.from('Tasks').select('*').eq('family_id', DUMMY_FAMILY_ID),
      supabase.from('rewards').select('*').eq('family_id', DUMMY_FAMILY_ID),
      supabase.from('mission_completions').select('*').eq('member_id', DUMMY_MEMBER_ID),
    ]);

    if (TasksRes.data) setTasks(TasksRes.data);
    if (rewardsRes.data) setRewards(rewardsRes.data);

    if (completionsRes.data) {
      const today = new Date().toISOString().split('T')[0];
      const todayCompleted = completionsRes.data
        .filter(c => c.period_start === today && c.status === 'completed')
        .map(c => c.mission_id);
      setCompletedIds(new Set(todayCompleted));

      const pts = completionsRes.data
        .filter(c => c.status === 'completed')
        .reduce((sum, c) => sum + (c.points_earned || 0), 0);
      setTotalPoints(pts);

      const dates = [...new Set(completionsRes.data
        .filter(c => c.status === 'completed')
        .map(c => c.period_start))]
        .sort().reverse();
      let s = 0;
      const d = new Date();
      for (const date of dates) {
        const expected = d.toISOString().split('T')[0];
        if (date === expected) { s++; d.setDate(d.getDate() - 1); }
        else break;
      }
      setStreak(s);
    }
    setLoading(false);
  };

  const completeMission = async (mission: Mission) => {
    if (completedIds.has(mission.id)) return;
    setCompletedIds(prev => new Set([...prev, mission.id]));
    setTotalPoints(prev => prev + mission.points);

    Animated.sequence([
      Animated.timing(streakScale, { toValue: 1.4, duration: 150, useNativeDriver: true }),
      Animated.timing(streakScale, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    setConfettiVisible(true);

    const today = new Date().toISOString().split('T')[0];
    await supabase.from('mission_completions').insert({
      mission_id: mission.id,
      member_id: DUMMY_MEMBER_ID,
      status: 'completed',
      points_earned: mission.points,
      period_start: today,
      completed_at: new Date().toISOString(),
    });
  };

  const openAddModal = (prefill?: Partial<typeof newMission>) => {
    setNewMission({
      title: prefill?.title || '',
      points: prefill?.points || '10',
      frequency: prefill?.frequency || 'daily',
      icon: prefill?.icon || '⭐',
    });
    setShowTemplates(!prefill?.title);
    setAddMissionModal(true);
  };

  const addMission = async () => {
    if (!newMission.title.trim()) return;
    const { error } = await supabase.from('Tasks').insert({
      family_id: DUMMY_FAMILY_ID,
      assigned_to: DUMMY_MEMBER_ID,
      title: newMission.title.trim(),
      points: parseInt(newMission.points) || 10,
      frequency: newMission.frequency,
      icon: newMission.icon,
    }).select();
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setAddMissionModal(false);
      setNewMission({ title: '', points: '10', frequency: 'daily', icon: '⭐' });
      loadData();
    }
  };

  const deleteMission = async (id: string) => {
    Alert.alert('Delete mission?', 'This will remove the mission and all its history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('Tasks').delete().eq('id', id);
        loadData();
      }},
    ]);
  };

  const addReward = async () => {
    if (!newReward.title.trim()) return;
    const { error } = await supabase.from('rewards').insert({
      family_id: DUMMY_FAMILY_ID,
      title: newReward.title.trim(),
      points_cost: parseInt(newReward.points_cost) || 100,
    }).select();
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setAddRewardModal(false);
      setNewReward({ title: '', points_cost: '100' });
      loadData();
    }
  };

  const claimReward = async (reward: Reward) => {
    if (totalPoints < reward.points_cost) {
      Alert.alert('Not enough points', `You need ${reward.points_cost - totalPoints} more points for this reward.`);
      return;
    }
    Alert.alert('Claim reward? 🎁', `Claim "${reward.title}" for ${reward.points_cost} points? Your points will reset to zero.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Claim! 🎉', onPress: async () => {
        await supabase.from('reward_redemptions').insert({
          reward_id: reward.id,
          member_id: DUMMY_MEMBER_ID,
          status: 'pending',
        });
        // Reset points by marking all completions as redeemed
        await supabase.from('mission_completions')
          .update({ status: 'overridden', override_note: 'Points redeemed for reward' })
          .eq('member_id', DUMMY_MEMBER_ID)
          .eq('status', 'completed');
        setTotalPoints(0);
        setConfettiVisible(true);
        Alert.alert('🎉 Reward claimed!', 'Your parent has been notified. Your points have been reset.');
        loadData();
      }},
    ]);
  };

  const nextReward = [...rewards].sort((a, b) => a.points_cost - b.points_cost)
    .find(r => r.points_cost > totalPoints);
  const rewardProgress = nextReward
    ? Math.min((totalPoints / nextReward.points_cost) * 100, 100)
    : 100;

  // TODAY count = all Tasks completed today vs all Tasks (not just daily)
  const todayCompletedCount = completedIds.size;
  const totalMissionCount = Tasks.length;

  const todayTasks = Tasks.filter(m => m.frequency === 'daily');
  const weeklyTasks = Tasks.filter(m => m.frequency === 'weekly');
  const onceTasks = Tasks.filter(m => m.frequency === 'once');

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <View style={styles.centred}><ActivityIndicator color={COLORS.blue} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <Confetti visible={confettiVisible} onDone={() => setConfettiVisible(false)} />

      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'child' && styles.toggleBtnActive]}
          onPress={() => setView('child')}
        >
          <Text style={[styles.toggleBtnText, view === 'child' && styles.toggleBtnTextActive]}>⭐ My Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'parent' && styles.toggleBtnActive]}
          onPress={() => setView('parent')}
        >
          <Text style={[styles.toggleBtnText, view === 'parent' && styles.toggleBtnTextActive]}>👤 Parent View</Text>
        </TouchableOpacity>
      </View>

      {view === 'child' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarEmoji}>🦁</Text>
              </View>
              <View style={styles.heroInfo}>
                <Text style={styles.heroName}>Sarah</Text>
                <Animated.View style={[styles.streakBadge, { transform: [{ scale: streakScale }] }]}>
                  <Text style={styles.streakText}>🔥 {streak} day streak</Text>
                </Animated.View>
              </View>
            </View>

            <View style={styles.pointsRow}>
              <View style={styles.pointsBlock}>
                <Text style={styles.pointsLabel}>TOTAL POINTS</Text>
                <View style={styles.pointsValueRow}>
                  <Text style={styles.pointsStar}>⭐</Text>
                  <AnimatedPoints value={totalPoints} />
                </View>
              </View>
              <View style={styles.pointsDivider} />
              <View style={styles.pointsBlock}>
                <Text style={styles.pointsLabel}>TODAY</Text>
                <View style={styles.pointsValueRow}>
                  <Text style={styles.pointsStar}>✅</Text>
                  <Text style={styles.pointsValue}>{todayCompletedCount}/{totalMissionCount}</Text>
                </View>
              </View>
            </View>

            {nextReward && (
              <View style={styles.rewardProgress}>
                <View style={styles.rewardProgressTop}>
                  <Text style={styles.rewardProgressLabel}>Next reward</Text>
                  <Text style={styles.rewardProgressName}>{nextReward.title}</Text>
                </View>
                <View style={styles.rewardProgressBar}>
                  <View style={[styles.rewardProgressFill, { width: `${rewardProgress}%` as any }]} />
                </View>
                <Text style={styles.rewardProgressPts}>
                  {nextReward.points_cost - totalPoints} pts to go ✨
                </Text>
              </View>
            )}

            {/* Claimable rewards */}
            {rewards.filter(r => r.points_cost <= totalPoints).map(reward => (
              <TouchableOpacity key={reward.id} style={styles.claimableReward} onPress={() => claimReward(reward)}>
                <Text style={styles.claimableIcon}>🎁</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.claimableTitle}>{reward.title}</Text>
                  <Text style={styles.claimableSub}>Tap to claim! ✨</Text>
                </View>
                <View style={styles.claimableBtn}>
                  <Text style={styles.claimableBtnText}>Claim</Text>
                </View>
              </TouchableOpacity>
            ))}

            {rewards.length === 0 && (
              <View style={styles.noRewardHint}>
                <Text style={styles.noRewardText}>Ask a parent to add a reward 🎁</Text>
              </View>
            )}
          </View>

          {todayTasks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔁 Daily</Text>
              {todayTasks.map(mission => (
                <MissionCard key={mission.id} mission={mission} completed={completedIds.has(mission.id)} onComplete={() => completeMission(mission)} />
              ))}
            </View>
          )}

          {weeklyTasks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📅 Weekly</Text>
              {weeklyTasks.map(mission => (
                <MissionCard key={mission.id} mission={mission} completed={completedIds.has(mission.id)} onComplete={() => completeMission(mission)} />
              ))}
            </View>
          )}

          {onceTasks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1️⃣ One-off</Text>
              {onceTasks.map(mission => (
                <MissionCard key={mission.id} mission={mission} completed={completedIds.has(mission.id)} onComplete={() => completeMission(mission)} />
              ))}
            </View>
          )}

          {Tasks.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>⚡</Text>
              <Text style={styles.emptyTitle}>No Tasks yet</Text>
              <Text style={styles.emptySubtitle}>Ask a parent to add some Tasks for you</Text>
            </View>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>

      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.parentTitle}>Tasks</Text>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Tasks</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => openAddModal()}>
                <Text style={styles.addBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {Tasks.length === 0 ? (
              <View style={[styles.emptyState, { marginTop: 8 }]}>
                <Text style={styles.emptyIcon}>⚡</Text>
                <Text style={styles.emptyTitle}>No Tasks yet</Text>
                <Text style={styles.emptySubtitle}>Add your first mission below</Text>
              </View>
            ) : (
              Tasks.map(mission => (
                <View key={mission.id} style={styles.parentMissionRow}>
                  <View style={styles.parentMissionIcon}>
                    <Text style={{ fontSize: 20 }}>{mission.icon || '⭐'}</Text>
                  </View>
                  <View style={styles.parentMissionInfo}>
                    <Text style={styles.parentMissionTitle}>{mission.title}</Text>
                    <Text style={styles.parentMissionMeta}>{mission.frequency} · {mission.points} pts</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => openAddModal({
                      title: mission.title,
                      points: String(mission.points),
                      frequency: mission.frequency,
                      icon: mission.icon,
                    })}
                    style={styles.duplicateBtn}
                  >
                    <Text style={styles.duplicateBtnText}>⧉</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteMission(mission.id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Rewards</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setAddRewardModal(true)}>
                <Text style={styles.addBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>
            {rewards.length === 0 ? (
              <View style={[styles.emptyState, { marginTop: 8 }]}>
                <Text style={styles.emptyIcon}>🎁</Text>
                <Text style={styles.emptyTitle}>No rewards yet</Text>
                <Text style={styles.emptySubtitle}>Add something to motivate the kids</Text>
              </View>
            ) : (
              rewards.map(reward => (
                <View key={reward.id} style={styles.rewardRow}>
                  <Text style={styles.rewardRowIcon}>🎁</Text>
                  <View style={styles.rewardRowInfo}>
                    <Text style={styles.rewardRowTitle}>{reward.title}</Text>
                    <Text style={styles.rewardRowPts}>⭐ {reward.points_cost} points</Text>
                  </View>
                </View>
              ))
            )}
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Add Mission Modal */}
      <Modal visible={addMissionModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.modalCard} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {newMission.title ? 'Edit & Add Mission' : 'New Mission'}
              </Text>

              {/* Templates */}
              {showTemplates && (
                <>
                  <Text style={styles.modalLabel}>Quick Add</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    {MISSION_TEMPLATES.map((t, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.templateChip}
                        onPress={() => {
                          setNewMission({ title: t.title, points: String(t.points), frequency: t.frequency, icon: t.icon });
                          setShowTemplates(false);
                        }}
                      >
                        <Text style={styles.templateIcon}>{t.icon}</Text>
                        <Text style={styles.templateTitle}>{t.title}</Text>
                        <Text style={styles.templatePts}>{t.points}pts</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={styles.modalDivider} />
                </>
              )}

              <Text style={styles.modalLabel}>Mission name</Text>
              <TextInput
                style={styles.modalInput}
                value={newMission.title}
                onChangeText={t => setNewMission(p => ({ ...p, title: t }))}
                placeholder="e.g. Make your bed"
                placeholderTextColor={COLORS.text3}
              />
              <Text style={styles.modalLabel}>Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                {MISSION_ICONS.map(icon => (
                  <TouchableOpacity
                    key={icon}
                    style={[styles.iconOption, newMission.icon === icon && styles.iconOptionActive]}
                    onPress={() => setNewMission(p => ({ ...p, icon }))}
                  >
                    <Text style={{ fontSize: 22 }}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.modalLabel}>Points</Text>
              <TextInput
                style={styles.modalInput}
                value={newMission.points}
                onChangeText={t => setNewMission(p => ({ ...p, points: t }))}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor={COLORS.text3}
              />
              <Text style={styles.modalLabel}>Frequency</Text>
              <View style={styles.freqRow}>
                {(['daily', 'weekly', 'once'] as const).map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.freqBtn, newMission.frequency === f && styles.freqBtnActive]}
                    onPress={() => setNewMission(p => ({ ...p, frequency: f }))}
                  >
                    <Text style={[styles.freqBtnText, newMission.frequency === f && styles.freqBtnTextActive]}>
                      {f === 'daily' ? '🔁 Daily' : f === 'weekly' ? '📅 Weekly' : '1️⃣ Once'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setAddMissionModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSave} onPress={addMission}>
                  <Text style={styles.modalSaveText}>Add Mission</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Reward Modal */}
      <Modal visible={addRewardModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>New Reward</Text>
              <Text style={styles.modalLabel}>Reward name</Text>
              <TextInput
                style={styles.modalInput}
                value={newReward.title}
                onChangeText={t => setNewReward(p => ({ ...p, title: t }))}
                placeholder="e.g. Movie night 🎬"
                placeholderTextColor={COLORS.text3}
                autoFocus
              />
              <Text style={styles.modalLabel}>Points needed</Text>
              <TextInput
                style={styles.modalInput}
                value={newReward.points_cost}
                onChangeText={t => setNewReward(p => ({ ...p, points_cost: t }))}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor={COLORS.text3}
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setAddRewardModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSave} onPress={addReward}>
                  <Text style={styles.modalSaveText}>Add Reward</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  viewToggle: { flexDirection: 'row', marginHorizontal: 20, marginTop: 12, marginBottom: 4, backgroundColor: COLORS.card, borderRadius: 14, padding: 4, borderWidth: 1.5, borderColor: COLORS.border },
  toggleBtn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: COLORS.blueLight },
  toggleBtnText: { fontSize: 13, color: COLORS.text2, fontWeight: '500' },
  toggleBtnTextActive: { color: COLORS.blue },
  heroCard: { backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.blueBorder, borderRadius: 20, padding: 20, marginBottom: 20, marginTop: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  avatarWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.yellowLight, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 36 },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 28, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3, marginBottom: 6 },
  streakBadge: { backgroundColor: COLORS.orangeLight, borderWidth: 1, borderColor: COLORS.orangeBorder, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
  streakText: { fontSize: 12, color: COLORS.orange, fontWeight: '600' },
  pointsRow: { flexDirection: 'row', backgroundColor: COLORS.card2, borderRadius: 14, padding: 16, marginBottom: 16, gap: 16 },
  pointsBlock: { flex: 1, alignItems: 'center' },
  pointsDivider: { width: 1, backgroundColor: COLORS.border },
  pointsLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: COLORS.text3, textTransform: 'uppercase', marginBottom: 6 },
  pointsValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pointsStar: { fontSize: 18 },
  pointsValue: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  rewardProgress: { backgroundColor: COLORS.card2, borderRadius: 14, padding: 14, marginBottom: 10 },
  rewardProgressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rewardProgressLabel: { fontSize: 11, color: COLORS.text3, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8 },
  rewardProgressName: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  rewardProgressBar: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  rewardProgressFill: { height: '100%', backgroundColor: COLORS.purple, borderRadius: 4 },
  rewardProgressPts: { fontSize: 12, color: COLORS.purple, fontWeight: '500', textAlign: 'right' },
  claimableReward: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.greenLight, borderWidth: 1.5, borderColor: COLORS.greenBorder, borderRadius: 14, padding: 14, marginTop: 8, gap: 12 },
  claimableIcon: { fontSize: 28 },
  claimableTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  claimableSub: { fontSize: 12, color: COLORS.green },
  claimableBtn: { backgroundColor: COLORS.green, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  claimableBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  noRewardHint: { backgroundColor: COLORS.card2, borderRadius: 12, padding: 12, alignItems: 'center' },
  noRewardText: { fontSize: 13, color: COLORS.text2 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text2, letterSpacing: 0.5, marginBottom: 10 },
  addBtn: { backgroundColor: COLORS.blueLight, borderWidth: 1, borderColor: COLORS.blueBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { fontSize: 12, color: COLORS.blue, fontWeight: '600' },
  missionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 16, padding: 14, marginBottom: 8, gap: 12 },
  missionCardDone: { backgroundColor: COLORS.greenLight, borderColor: COLORS.greenBorder },
  missionIconWrap: { width: 44, height: 44, borderRadius: 13, backgroundColor: COLORS.card2, alignItems: 'center', justifyContent: 'center' },
  missionIconWrapDone: { backgroundColor: COLORS.greenLight },
  missionIconText: { fontSize: 22 },
  missionInfo: { flex: 1 },
  missionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  missionTitleDone: { color: COLORS.text3, textDecorationLine: 'line-through' },
  missionPts: { fontSize: 12, color: COLORS.text2 },
  missionTick: { width: 28, height: 28, borderRadius: 9, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  missionTickDone: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  missionTickIcon: { fontSize: 14, color: '#fff', fontWeight: '700' },
  missionTickEmpty: { fontSize: 14 },
  parentTitle: { fontSize: 32, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5, marginBottom: 16 },
  parentMissionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
  parentMissionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.card2, alignItems: 'center', justifyContent: 'center' },
  parentMissionInfo: { flex: 1 },
  parentMissionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  parentMissionMeta: { fontSize: 12, color: COLORS.text2 },
  duplicateBtn: { padding: 6, marginRight: 4 },
  duplicateBtnText: { fontSize: 18, color: COLORS.blue },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 16, color: COLORS.text3 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
  rewardRowIcon: { fontSize: 22 },
  rewardRowInfo: { flex: 1 },
  rewardRowTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 3 },
  rewardRowPts: { fontSize: 12, color: COLORS.purple },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 4 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 14, color: COLORS.text2, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1.5, borderColor: COLORS.border, padding: 28, paddingBottom: 48, maxHeight: '90%' },
  modalTitle: { fontSize: 26, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  modalLabel: { fontSize: 11, fontWeight: '700', color: COLORS.text3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 14 },
  modalInput: { backgroundColor: COLORS.card2, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, padding: 14, fontSize: 15, color: COLORS.text },
  modalDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  templateChip: { backgroundColor: COLORS.card2, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14, padding: 12, marginRight: 8, alignItems: 'center', minWidth: 80 },
  templateIcon: { fontSize: 24, marginBottom: 4 },
  templateTitle: { fontSize: 11, fontWeight: '600', color: COLORS.text, textAlign: 'center', marginBottom: 2 },
  templatePts: { fontSize: 10, color: COLORS.text3 },
  iconOption: { width: 48, height: 48, borderRadius: 13, backgroundColor: COLORS.card2, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  iconOptionActive: { borderColor: COLORS.blue, backgroundColor: COLORS.blueLight },
  freqRow: { flexDirection: 'row', gap: 8 },
  freqBtn: { flex: 1, backgroundColor: COLORS.card2, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, padding: 11, alignItems: 'center' },
  freqBtnActive: { borderColor: COLORS.blueBorder, backgroundColor: COLORS.blueLight },
  freqBtnText: { fontSize: 12, color: COLORS.text2, fontWeight: '500' },
  freqBtnTextActive: { color: COLORS.blue },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 24 },
  modalCancel: { flex: 1, backgroundColor: COLORS.card2, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14, padding: 15, alignItems: 'center' },
  modalCancelText: { fontSize: 15, color: COLORS.text2, fontWeight: '500' },
  modalSave: { flex: 2, backgroundColor: COLORS.blue, borderRadius: 14, padding: 15, alignItems: 'center' },
  modalSaveText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});