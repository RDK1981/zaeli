import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwipeToDelete } from '../components/SwipeToDelete';
import { supabase } from '../../lib/supabase';

const DUMMY_FAMILY_ID  = '00000000-0000-0000-0000-000000000001';
const DUMMY_MEMBER_ID  = '00000000-0000-0000-0000-000000000002';

const C = {
  bg:      '#F7F7F7', card:    '#FFFFFF', card2:   '#F0F0F0',
  border:  '#E0E0E0', text:    '#0A0A0A', text2:   'rgba(0,0,0,0.50)', text3:   'rgba(0,0,0,0.28)',
  green:   '#00C97A', greenL:  'rgba(0,201,122,0.10)', greenB:  'rgba(0,201,122,0.28)',
  orange:  '#FF8C00', orangeL: 'rgba(255,140,0,0.10)', orangeB: 'rgba(255,140,0,0.28)',
  yellow:  '#FFE500', yellowD: '#B8A400', yellowL: 'rgba(255,229,0,0.14)', yellowB: 'rgba(255,229,0,0.35)',
  blue:    '#0057FF', blueL:   'rgba(0,87,255,0.08)',
  purple:  '#9B7FD4', purpleL: 'rgba(155,127,212,0.10)', purpleB: 'rgba(155,127,212,0.28)',
  magenta: '#E0007C', red:     '#FF3B3B', redL:    'rgba(255,59,59,0.08)',
};

// ── TYPES ─────────────────────────────────────────────────────────────
type SubView  = 'jobs' | 'learn' | 'profile';
type JobsTab  = 'jobs' | 'rewards';
type Member   = { id:string; name:string; avatar_emoji:string; colour:string; role?:string };
type Job      = { id:string; title:string; points:number; icon:string; frequency:string; done:boolean; assigned_to?:string; needs_approval?:boolean };
type Reward   = { id:string; title:string; points_cost:number; icon:string };
type TutoringSubject = { name:string; emoji:string; accuracy:number; weak?:string };
type TutoringMode    = 'practice' | 'homework_help' | 'exam_prep' | 'photo_help' | 'reading';
type ChatMessage     = { role:'zaeli'|'child'; text:string; isCorrect?:boolean; pointsAwarded?:number };
type TutoringSession = { subject:string; subjectEmoji:string; mode:TutoringMode; member:Member; bookTitle?:string; bookLevel?:string; bookEmoji?:string };

// ── DUMMY DATA ────────────────────────────────────────────────────────
const DUMMY_MEMBERS: Member[] = [
  { id:DUMMY_MEMBER_ID,               name:'Sarah', avatar_emoji:'🦁', colour:C.green,  role:'child' },
  { id:'00000000-0000-0000-0000-000000000003', name:'Jack',  avatar_emoji:'🐯', colour:C.orange, role:'child' },
];

const DUMMY_JOBS: Job[] = [
  { id:'j1', title:'Make my bed',           points:5,  icon:'🛏️', frequency:'Every morning',   done:false },
  { id:'j2', title:'Set the table',         points:10, icon:'🍽️', frequency:'Weeknights',      done:false },
  { id:'j3', title:'Pack school bag',       points:5,  icon:'🎒', frequency:'School mornings', done:true  },
  { id:'j4', title:'Sweep the kitchen',     points:15, icon:'🧹', frequency:'Weekdays',        done:true  },
  { id:'j5', title:'Feed the dog',          points:5,  icon:'🐕', frequency:'Morning + night', done:true  },
  { id:'j6', title:'Read for 20 minutes',   points:10, icon:'📚', frequency:'Every night',     done:true  },
];

const DUMMY_REWARDS: Reward[] = [
  { id:'r1', title:'Extra screen time',     points_cost:100, icon:'🎮' },
  { id:'r2', title:'Choose Friday dinner',  points_cost:150, icon:'🍕' },
  { id:'r3', title:'Sleepover at friend\'s',points_cost:200, icon:'🏨' },
  { id:'r4', title:'Family outing of choice',points_cost:500,icon:'🎡' },
];

const DUMMY_SUBJECTS: TutoringSubject[] = [
  { name:'Maths',   emoji:'🔢', accuracy:72, weak:'Fractions' },
  { name:'English', emoji:'📖', accuracy:85 },
  { name:'Science', emoji:'🔬', accuracy:60, weak:'Solar system' },
  { name:'History', emoji:'🌏', accuracy:80 },
];

const UNIFORM: Record<string,{label:string;bg:string;color:string}> = {
  Mon: { label:'📘 Regular uniform', bg:C.blueL,   color:C.blue   },
  Tue: { label:'🏃 PE kit',          bg:C.greenL,  color:C.green  },
  Wed: { label:'📚 Library — bring books', bg:C.yellowL, color:C.yellowD },
  Thu: { label:'📘 Regular uniform', bg:C.blueL,   color:C.blue   },
  Fri: { label:'🎨 Art — old clothes ok', bg:C.orangeL, color:C.orange },
};

// ── CONFETTI BURST ────────────────────────────────────────────────────
function ConfettiBurst({ trigger }: { trigger:number }) {
  const anims = useRef(
    Array.from({ length:14 }, () => ({
      x: new Animated.Value(0), y: new Animated.Value(0),
      o: new Animated.Value(0), s: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (!trigger) return;
    const COLS = [C.green, C.yellow, C.magenta, C.blue, C.orange, C.purple, '#fff'];
    anims.forEach((a, i) => {
      const angle = (i / 14) * Math.PI * 2;
      a.x.setValue(0); a.y.setValue(0); a.o.setValue(1); a.s.setValue(1);
      Animated.parallel([
        Animated.timing(a.x, { toValue: Math.cos(angle) * 100, duration:700, useNativeDriver:true }),
        Animated.timing(a.y, { toValue: Math.sin(angle) * 100 - 60, duration:700, useNativeDriver:true }),
        Animated.timing(a.o, { toValue: 0, duration:700, useNativeDriver:true }),
        Animated.timing(a.s, { toValue: 0.2, duration:700, useNativeDriver:true }),
      ]).start();
    });
  }, [trigger]);

  if (!trigger) return null;
  const COLS = [C.green, C.yellow, C.magenta, C.blue, C.orange, C.purple, '#fff'];
  return (
    <View style={{ position:'absolute', top:'45%', left:'50%', zIndex:999 }} pointerEvents="none">
      {anims.map((a, i) => (
        <Animated.View key={i} style={{
          position:'absolute', width:10, height:10, borderRadius:5,
          backgroundColor: COLS[i % COLS.length],
          transform: [{ translateX:a.x }, { translateY:a.y }, { scale:a.s }],
          opacity: a.o,
        }} />
      ))}
    </View>
  );
}

// ── HANDOFF OVERLAY ───────────────────────────────────────────────────
// Shows for 2 seconds when a child ticks a job on the parent's phone
function HandoffOverlay({ member, jobTitle, points, onDone }:
  { member:Member; jobTitle:string; points:number; onDone:()=>void }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue:1, useNativeDriver:true, tension:80, friction:6 }).start();
    const t = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue:0, duration:400, useNativeDriver:true }).start(onDone);
    }, 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[s.handoff, { opacity:fadeAnim, backgroundColor:member.colour }]}>
      <Text style={{ fontSize:72 }}>{member.avatar_emoji}</Text>
      <Animated.View style={{ transform:[{scale:scaleAnim}], alignItems:'center', gap:8 }}>
        <Text style={s.handoffTitle}>Great work,{'\n'}{member.name}! 🎉</Text>
        <Text style={s.handoffSub}>{jobTitle}</Text>
        <View style={s.handoffPts}>
          <Text style={s.handoffPtsTxt}>⭐ +{points} points</Text>
        </View>
        <Text style={s.handoffReturn}>Handing back to parents…</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ── ADD JOB MODAL ─────────────────────────────────────────────────────
function AddJobModal({ visible, onClose, onSaved, members }:
  { visible:boolean; onClose:()=>void; onSaved:()=>void; members:Member[] }) {
  const [title,  setTitle]  = useState('');
  const [pts,    setPts]    = useState('10');
  const [icon,   setIcon]   = useState('⭐');
  const [freq,   setFreq]   = useState('daily');
  const [assign, setAssign] = useState('');
  const ICONS = ['🛏️','🧹','🍽️','🎒','📚','🐕','🗑️','🧺','🛁','🚗','💧','🌱'];

  const save = async () => {
    if (!title.trim()) return;
    await supabase.from('missions').insert({
      family_id: DUMMY_FAMILY_ID, title: title.trim(),
      points: parseInt(pts)||10, icon, frequency:freq,
      assigned_to: assign || null,
    });
    setTitle(''); setPts('10'); setIcon('⭐'); setAssign('');
    onSaved(); onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={s.modalTitle}>New Job</Text>
          <TouchableOpacity onPress={save} disabled={!title.trim()}>
            <Text style={[s.modalSave, !title.trim() && { opacity:0.35 }]}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ padding:22 }} keyboardShouldPersistTaps="handled">
          <Text style={s.fieldLbl}>Job title</Text>
          <TextInput style={s.input} value={title} onChangeText={setTitle}
            placeholder="e.g. Make my bed" placeholderTextColor={C.text3} autoFocus />

          <Text style={s.fieldLbl}>Points</Text>
          <TextInput style={s.input} value={pts} onChangeText={setPts}
            keyboardType="number-pad" placeholder="10" placeholderTextColor={C.text3} />

          <Text style={s.fieldLbl}>Frequency</Text>
          <View style={{ flexDirection:'row', gap:8, marginBottom:20 }}>
            {['daily','weekly','once'].map(f => (
              <TouchableOpacity key={f} style={[s.freqBtn, freq===f && s.freqBtnOn]} onPress={() => setFreq(f)}>
                <Text style={[s.freqBtnTxt, freq===f && { color:'#fff' }]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.fieldLbl}>Assign to</Text>
          <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap', marginBottom:20 }}>
            <TouchableOpacity style={[s.assignBtn, assign==='' && s.assignBtnOn]} onPress={() => setAssign('')}>
              <Text style={[s.assignBtnTxt, assign==='' && { color:'#fff' }]}>Everyone</Text>
            </TouchableOpacity>
            {members.filter(m => m.role==='child').map(m => (
              <TouchableOpacity key={m.id} style={[s.assignBtn, assign===m.id && { backgroundColor:m.colour, borderColor:m.colour }]}
                onPress={() => setAssign(m.id)}>
                <Text style={[s.assignBtnTxt, assign===m.id && { color:'#fff' }]}>{m.avatar_emoji} {m.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.fieldLbl}>Icon</Text>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
            {ICONS.map(ic => (
              <TouchableOpacity key={ic} style={[s.iconBtn, icon===ic && s.iconBtnOn]} onPress={() => setIcon(ic)}>
                <Text style={{ fontSize:22 }}>{ic}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════
// JOBS + REWARDS VIEW (toggled)
// ══════════════════════════════════════════════════════════════════════
function JobsRewardsView({ member, jobs, rewards, totalPoints, onTickJob, onDeleteJob, onAddJob, isParentView = false }:
  { member:Member; jobs:Job[]; rewards:Reward[]; totalPoints:number; onTickJob:(job:Job)=>void; onDeleteJob?:(id:string)=>void; onAddJob?:()=>void; isParentView?:boolean }) {
  const [tab, setTab] = useState<JobsTab>('jobs');

  const myJobs    = jobs.filter(j => !j.assigned_to || j.assigned_to === member.id);
  const doneJobs  = myJobs.filter(j => j.done);
  const todoJobs  = myJobs.filter(j => !j.done);
  const progress  = myJobs.length > 0 ? doneJobs.length / myJobs.length : 0;
  const todayPts  = doneJobs.reduce((sum, j) => sum + j.points, 0);

  return (
    <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:120 }}>

      {/* Jobs / Rewards toggle + Add button */}
      <View style={{ flexDirection:'row', alignItems:'center', marginHorizontal:16, marginTop:10, marginBottom:4, gap:8 }}>
        <View style={[s.jrToggle, { flex:1, marginHorizontal:0, marginBottom:0 }]}>
          <TouchableOpacity style={[s.jrBtn, tab==='jobs' && { backgroundColor:member.colour }]} onPress={() => setTab('jobs')}>
            <Text style={[s.jrBtnTxt, tab==='jobs' && { color:'#fff' }]}>💼 Jobs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.jrBtn, tab==='rewards' && { backgroundColor:member.colour }]} onPress={() => setTab('rewards')}>
            <Text style={[s.jrBtnTxt, tab==='rewards' && { color:'#fff' }]}>🎁 Rewards</Text>
          </TouchableOpacity>
        </View>
        {onAddJob && (
          <TouchableOpacity style={[s.addJobBtn, { backgroundColor: tab==='jobs' ? member.colour : C.orange }]}
            onPress={onAddJob}>
            <Text style={s.addJobBtnTxt}>{tab==='jobs' ? '+ Job' : '+ Reward'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {tab === 'jobs' && (
        <>
          {/* Progress bar */}
          <View style={{ paddingHorizontal:18, paddingTop:10, paddingBottom:6 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
              <Text style={{ fontSize:13, fontWeight:'700', color:C.text2 }}>Today's progress</Text>
              <Text style={{ fontSize:13, fontWeight:'700', color:member.colour }}>
                {doneJobs.length} of {myJobs.length} done{doneJobs.length === myJobs.length && myJobs.length > 0 ? ' 🎉' : ''}
              </Text>
            </View>
            <View style={s.progTrack}>
              <View style={[s.progFill, { width:`${progress * 100}%` as any, backgroundColor:member.colour }]} />
            </View>
            <Text style={{ fontSize:12, color:C.text3, marginTop:5 }}>⭐ +{todayPts} pts earned today</Text>
          </View>

          {todoJobs.length > 0 && (
            <>
              <Text style={s.sectionLbl}>Still to do</Text>
              {todoJobs.map(job => (
                <SwipeToDelete key={job.id}
                  onDelete={() => onDeleteJob?.(job.id)}
                  accentColour={member.colour}
                  deleteLabel="Remove" deleteEmoji="🗑️"
                  enabled={isParentView && !!onDeleteJob}
                  style={{ marginHorizontal:16, marginBottom:8 }}>
                  <TouchableOpacity style={[s.jobCard, { marginHorizontal:0, marginBottom:0 }]}
                    onPress={() => onTickJob(job)} activeOpacity={0.75}>
                    <View style={[s.jobIcon, { backgroundColor: member.colour + '18' }]}>
                      <Text style={{ fontSize:22 }}>{job.icon || '⭐'}</Text>
                    </View>
                    <View style={{ flex:1 }}>
                      <Text style={s.jobTitle}>{job.title}</Text>
                      <Text style={[s.jobPts, { color:member.colour }]}>⭐ {job.points} points</Text>
                      <Text style={s.jobFreq}>{job.frequency}</Text>
                    </View>
                    <View style={s.jobCheck} />
                  </TouchableOpacity>
                </SwipeToDelete>
              ))}
            </>
          )}

          {doneJobs.length > 0 && (
            <>
              <Text style={s.sectionLbl}>Completed today ✓</Text>
              {doneJobs.map(job => (
                <SwipeToDelete key={job.id}
                  onDelete={() => onDeleteJob?.(job.id)}
                  accentColour={C.red}
                  deleteLabel="Remove" deleteEmoji="🗑️"
                  enabled={isParentView && !!onDeleteJob}
                  style={{ marginHorizontal:16, marginBottom:8 }}>
                  <TouchableOpacity style={[s.jobCard, { opacity:0.55, marginHorizontal:0, marginBottom:0 }]}
                    onPress={() => onTickJob(job)} activeOpacity={0.75}>
                    <View style={[s.jobIcon, { backgroundColor:C.greenL }]}>
                      <Text style={{ fontSize:22 }}>{job.icon || '⭐'}</Text>
                    </View>
                    <View style={{ flex:1 }}>
                      <Text style={[s.jobTitle, { textDecorationLine:'line-through', color:C.text3, fontWeight:'400' }]}>{job.title}</Text>
                      <Text style={[s.jobPts, { color:C.text3 }]}>⭐ {job.points} pts</Text>
                    </View>
                    <View style={[s.jobCheck, { backgroundColor:C.green, borderColor:C.green }]}>
                      <Text style={{ color:'#fff', fontSize:13, fontWeight:'700' }}>✓</Text>
                    </View>
                  </TouchableOpacity>
                </SwipeToDelete>
              ))}
            </>
          )}

          {myJobs.length === 0 && (
            <Text style={s.emptyTxt}>No jobs assigned yet</Text>
          )}
        </>
      )}

      {tab === 'rewards' && (
        <>
          {/* Points balance */}
          <View style={[s.ptsBalance, { borderColor: member.colour + '40' }]}>
            <Text style={{ fontSize:32 }}>⭐</Text>
            <View style={{ flex:1 }}>
              <Text style={[s.ptsBalanceVal, { color:member.colour }]}>{totalPoints} points</Text>
              <Text style={s.ptsBalanceSub}>to spend in the reward store</Text>
            </View>
          </View>

          <Text style={s.sectionLbl}>Reward Store</Text>
          {rewards.map(reward => {
            const canAfford = totalPoints >= reward.points_cost;
            return (
              <View key={reward.id} style={s.rewardCard}>
                <View style={[s.rewardIcon, { backgroundColor: canAfford ? C.yellowL : C.card2 }]}>
                  <Text style={{ fontSize:24 }}>{reward.icon}</Text>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={s.rewardName}>{reward.title}</Text>
                  <Text style={[s.rewardCost, { color: canAfford ? C.yellowD : C.text3 }]}>
                    ⭐ {reward.points_cost} points
                  </Text>
                  {!canAfford && (
                    <Text style={{ fontSize:11, color:C.text3, marginTop:1 }}>
                      Need {reward.points_cost - totalPoints} more
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[s.claimBtn, { backgroundColor: canAfford ? C.yellow : C.card2 }]}
                  disabled={!canAfford}>
                  <Text style={[s.claimBtnTxt, { color: canAfford ? '#000' : C.text3 }]}>
                    {canAfford ? 'Claim!' : 'Soon'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

// ── LEARN VIEW ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════
// TUTORING SESSION SCREEN
// ══════════════════════════════════════════════════════════════════════
const ANTHROPIC_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
const API_HEADERS = {
  'Content-Type': 'application/json',
  'x-api-key': ANTHROPIC_KEY,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
};

const MODE_CONFIG: Record<TutoringMode,{label:string;emoji:string;prompt:string}> = {
  practice:      { label:'Practice',      emoji:'📝', prompt:'Ask the child a practice question appropriate for their year level. Be encouraging and warm.' },
  homework_help: { label:'Homework Help', emoji:'📚', prompt:'Help the child with their homework by asking guiding questions. Never give the answer directly — guide them to it.' },
  exam_prep:     { label:'Exam Prep',     emoji:'🎯', prompt:'Quiz the child with exam-style questions. Give specific feedback on each answer.' },
  photo_help:    { label:'Photo Help',    emoji:'📷', prompt:'The child has taken a photo of their homework. Read the question carefully and guide them step by step without giving the answer.' },
  reading:       { label:'Read to Zaeli', emoji:'📖', prompt:'The child is reading aloud to you. You will receive transcriptions of what they read. Give warm short encouragement, gently note any mispronounced or skipped words, and ask a simple comprehension question after every 2-3 turns. Award [CORRECT:10] for good fluency or a correct comprehension answer. Keep responses to 2 sentences max.' },
};

function PointsBurst({ points, onDone }: { points:number; onDone:()=>void }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue:1, useNativeDriver:true, tension:80, friction:5 }),
      Animated.delay(800),
      Animated.timing(opacity, { toValue:0, duration:300, useNativeDriver:true }),
    ]).start(onDone);
  }, []);
  return (
    <Animated.View style={[ts.pointsBurst, { transform:[{scale}], opacity }]}>
      <Text style={ts.pointsBurstTxt}>⭐ +{points} pts!</Text>
    </Animated.View>
  );
}

function TutoringSessionScreen({ session, onBack }:
  { session:TutoringSession; onBack:(ptsEarned:number)=>void }) {

  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [speaking,   setSpeaking]   = useState(false);
  const [totalPts,   setTotalPts]   = useState(0);
  const [burstPts,   setBurstPts]   = useState<number|null>(null);
  const [photoB64,   setPhotoB64]   = useState<string|null>(null);
  const [photoSent,  setPhotoSent]  = useState(false);
  const [qCount,     setQCount]     = useState(0);
  const [correctCount,setCorrectCount] = useState(0);
  // Reading mode state
  const [recording,    setRecording]    = useState<Audio.Recording|null>(null);
  const [isRecording,  setIsRecording]  = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [bookScanned,  setBookScanned]  = useState(!!session.bookTitle);
  const scrollRef = useRef<ScrollView>(null);
  const modeConfig = MODE_CONFIG[session.mode];

  // Start session with opening message from Zaeli
  useEffect(() => {
    startSession();
    return () => { Speech.stop(); };
  }, []);

  const startSession = async () => {
    setLoading(true);
    try {
      let openingPrompt = '';
      if (session.mode === 'reading') {
        if (session.bookTitle) {
          openingPrompt = `Greet ${session.member.name} warmly. Tell them you're excited to hear them read "${session.bookTitle}". Tell them to press the red mic button when ready to start reading. Keep it to 2 sentences and use their name.`;
        } else {
          openingPrompt = `Greet ${session.member.name} warmly and tell them to scan their book cover first using the 📷 button so you know which book they're reading. 1 sentence.`;
        }
      } else if (session.mode === 'photo_help') {
        openingPrompt = `Greet ${session.member.name} warmly (1 sentence), tell them to take a photo of their question.`;
      } else {
        openingPrompt = `Greet ${session.member.name} warmly (1 sentence) and ask your first ${session.subject} question for Year 5.`;
      }

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 200,
          system: buildSystemPrompt(),
          messages: [{ role:'user', content: openingPrompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "Hey! Ready to learn? Let's go! 🎓";
      addZaeliMessage(text);
      if (session.mode === 'reading') speakMessage(text);
    } catch {
      addZaeliMessage(`Hey ${session.member.name}! Ready to do some ${session.subject}? Let's go! 🎓`);
    }
    setLoading(false);
  };

  const buildSystemPrompt = () => `
You are Zaeli, a warm and encouraging AI tutor for children.
You are helping ${session.member.name}, a ${session.mode === 'reading' ? 'Year 1-2' : 'Year 5'} student.
${session.mode === 'reading' && session.bookTitle ? `Book being read: "${session.bookTitle}" ${session.bookEmoji||'📖'}${session.bookLevel ? ` (Reading level: ${session.bookLevel})` : ''}` : `Subject: ${session.subject}`}
Mode: ${modeConfig.prompt}
Rules:
- NEVER give the answer directly. Always guide with hints and questions.
- Keep responses SHORT — max 2-3 sentences for a child.
- Be warm, use encouragement like "Great reading!" or "Wonderful!"
- When the child reads well or answers correctly, award points by including [CORRECT:N] where N is 5-15.
- When incorrect, give a helpful hint, include [HINT] in your response.
- Use simple language appropriate for a young child.
- Occasionally use emojis to keep it fun 🌟
${session.mode === 'reading' ? '- After every 2-3 reading turns, ask ONE simple comprehension question about what was just read.' : ''}
`;

  const addZaeliMessage = (text:string, isCorrect?:boolean, pts?:number) => {
    setMessages(p => [...p, { role:'zaeli', text, isCorrect, pointsAwarded:pts }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 100);
  };

  const sendMessage = async (userText:string, imageB64?:string) => {
    if (!userText.trim() && !imageB64) return;
    setInput('');
    setLoading(true);

    const userMsg: ChatMessage = { role:'child', text: imageB64 ? '📷 [Photo sent]' : userText };
    setMessages(p => [...p, userMsg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated:true }), 100);

    try {
      // Build conversation history for Claude
      const history = messages.map(m => ({
        role: m.role === 'zaeli' ? 'assistant' : 'user',
        content: m.text.replace(/\[CORRECT:\d+\]/g,'').replace(/\[HINT\]/g,''),
      }));

      // Build user content — text or image
      const userContent = imageB64
        ? [
            { type:'image', source:{ type:'base64', media_type:'image/jpeg', data:imageB64 } },
            { type:'text',  text: userText || "Can you help me with this question?" },
          ]
        : userText;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          system: buildSystemPrompt(),
          messages: [
            ...history,
            { role:'user', content: userContent },
          ],
        }),
      });

      const data = await res.json();
      let responseText = data.content?.[0]?.text || "Hmm, let me think about that...";

      // Parse correct answer markers
      const correctMatch = responseText.match(/\[CORRECT:(\d+)\]/);
      let pts = 0;
      let isCorrect = false;

      if (correctMatch) {
        pts = parseInt(correctMatch[1]);
        isCorrect = true;
        responseText = responseText.replace(/\[CORRECT:\d+\]/g, '');
        setTotalPts(p => p + pts);
        setBurstPts(pts);
        setCorrectCount(p => p + 1);
        // Save to supabase
        await supabase.from('tutoring_sessions').insert({
          family_id: DUMMY_FAMILY_ID,
          member_id: session.member.id,
          subject: session.subject,
          year_level: 5,
          mode: session.mode,
          points_earned: pts,
          questions_answered: 1,
          correct_count: 1,
        });
      }

      responseText = responseText.replace(/\[HINT\]/g, '').trim();
      setQCount(p => p + 1);
      addZaeliMessage(responseText, isCorrect, pts > 0 ? pts : undefined);

    } catch {
      addZaeliMessage("Oops, I lost my train of thought! Try again? 😅");
    }
    setLoading(false);
  };

  const speakMessage = (text:string) => {
    Speech.stop();
    setSpeaking(true);
    Speech.speak(text, {
      language: 'en-AU',
      pitch: 1.1,
      rate: 0.9,
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setPhotoB64(result.assets[0].base64);
      setPhotoSent(true);
      await sendMessage("Please help me with this question.", result.assets[0].base64);
    }
  };

  // ── BOOK SCAN ──
  const scanBookCover = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setLoading(true);
      addZaeliMessage("Let me look at that book... 📖");
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: API_HEADERS,
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 150,
            messages: [{
              role: 'user',
              content: [
                { type:'image', source:{ type:'base64', media_type:'image/jpeg', data:result.assets[0].base64 } },
                { type:'text', text: `This is a children's book cover. Tell me: 1) the book title, 2) the author, 3) approximate reading level (e.g. "Level 2", "Ages 5-7"). Respond in JSON only: {"title":"...","author":"...","level":"...","emoji":"..."}` },
              ],
            }],
          }),
        });
        const data = await res.json();
        const raw = data.content?.[0]?.text || '{}';
        const clean = raw.replace(/```json|```/g,'').trim();
        const bookInfo = JSON.parse(clean);

        // Update session with book info (via a state trick — rebuild the greeting)
        session.bookTitle = bookInfo.title || 'your book';
        session.bookEmoji = bookInfo.emoji || '📖';
        session.bookLevel = bookInfo.level || '';
        setBookScanned(true);

        const greet = `I found it! "${bookInfo.title}" by ${bookInfo.author} 📖 ${bookInfo.emoji||''} Ready when you are ${session.member.name} — press the mic and start reading! 🎙️`;
        addZaeliMessage(greet);
        speakMessage(greet);
      } catch {
        addZaeliMessage("I couldn't quite make that out — but that's okay! Just start reading and I'll follow along 😊");
        setBookScanned(true);
      }
      setLoading(false);
    }
  };

  // ── AUDIO RECORDING ──
  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
    } catch (e) {
      addZaeliMessage("Hmm, I couldn't access the microphone. Check your permissions! 🎙️");
    }
  };

  const stopAndTranscribe = async () => {
    if (!recording) return;
    setIsRecording(false);
    setTranscribing(true);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) { setTranscribing(false); return; }

      // Send to Whisper API
      const formData = new FormData();
      formData.append('file', { uri, type:'audio/m4a', name:'reading.m4a' } as any);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY || ''}` },
        body: formData,
      });

      const whisperData = await whisperRes.json();
      const transcription = whisperData.text || '';

      setTranscribing(false);

      if (transcription.trim()) {
        await sendMessage(`[Reading aloud]: ${transcription}`);
      } else {
        addZaeliMessage("I didn't quite catch that — try reading a little louder! 🔊");
      }
    } catch {
      setTranscribing(false);
      addZaeliMessage("Something went wrong with the recording. Try again! 😊");
    }
  };

  const lastZaeliMsg = [...messages].reverse().find(m => m.role === 'zaeli');

  return (
    <SafeAreaView style={[ts.safe, { backgroundColor:'#0D0D1A' }]} edges={['top']}>
      <StatusBar style="light" />

      {/* Points burst animation */}
      {burstPts !== null && (
        <PointsBurst points={burstPts} onDone={() => setBurstPts(null)} />
      )}

      {/* Header */}
      <View style={ts.header}>
        <TouchableOpacity onPress={() => { Speech.stop(); onBack(totalPts); }} style={ts.backBtn}>
          <Text style={ts.backTxt}>‹ Back</Text>
        </TouchableOpacity>
        <View style={ts.headerMid}>
          <Text style={ts.headerSubject}>{session.subjectEmoji} {session.subject}</Text>
          <Text style={ts.headerMode}>{modeConfig.emoji} {modeConfig.label}</Text>
        </View>
        <View style={ts.headerPts}>
          <Text style={ts.headerPtsTxt}>⭐ {totalPts}</Text>
        </View>
      </View>

      {/* Stats bar */}
      <View style={ts.statsBar}>
        <View style={ts.statChip}>
          <Text style={ts.statChipTxt}>📝 {qCount} answered</Text>
        </View>
        <View style={[ts.statChip, { backgroundColor: correctCount > 0 ? C.greenL : 'rgba(255,255,255,0.06)' }]}>
          <Text style={[ts.statChipTxt, correctCount > 0 && { color:C.green }]}>✓ {correctCount} correct</Text>
        </View>
        {speaking && (
          <View style={[ts.statChip, { backgroundColor:'rgba(155,127,212,0.2)' }]}>
            <Text style={[ts.statChipTxt, { color:C.purple }]}>🔊 Speaking…</Text>
          </View>
        )}
      </View>

      {/* Chat messages */}
      <ScrollView ref={scrollRef} style={ts.chatScroll}
        contentContainerStyle={{ padding:16, paddingBottom:20, gap:12 }}
        showsVerticalScrollIndicator={false}>

        {messages.map((msg, i) => (
          <View key={i} style={[ts.msgRow, msg.role==='child' && ts.msgRowRight]}>
            {msg.role === 'zaeli' && (
              <View style={ts.zaeliAvatar}><Text style={{ fontSize:18 }}>✦</Text></View>
            )}
            <View style={[
              ts.bubble,
              msg.role === 'zaeli' ? ts.bubbleZaeli : ts.bubbleChild,
              msg.isCorrect && ts.bubbleCorrect,
            ]}>
              <Text style={[
                ts.bubbleTxt,
                msg.role === 'child' && ts.bubbleTxtChild,
                msg.isCorrect && { color:'#fff' },
              ]}>{msg.text}</Text>
              {msg.pointsAwarded && (
                <Text style={ts.bubblePts}>⭐ +{msg.pointsAwarded} pts</Text>
              )}
              {msg.role === 'zaeli' && (
                <TouchableOpacity style={ts.speakBtn} onPress={() => speakMessage(msg.text)}>
                  <Text style={ts.speakBtnTxt}>🔊</Text>
                </TouchableOpacity>
              )}
            </View>
            {msg.role === 'child' && (
              <View style={[ts.zaeliAvatar, { backgroundColor: C.purple + '22' }]}>
                <Text style={{ fontSize:18 }}>{session.member.avatar_emoji}</Text>
              </View>
            )}
          </View>
        ))}

        {loading && (
          <View style={ts.msgRow}>
            <View style={ts.zaeliAvatar}><Text style={{ fontSize:18 }}>✦</Text></View>
            <View style={ts.bubbleZaeli}>
              <View style={ts.typingDots}>
                {[0,1,2].map(i => <TypingDot key={i} delay={i * 150} />)}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input bar — reading mode vs normal */}
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}>
        {session.mode === 'reading' ? (
          // Reading mode — big mic button + optional book scan
          <View style={ts.readingBar}>
            {!bookScanned ? (
              // Step 1: scan the book
              <TouchableOpacity style={ts.scanBookBtn} onPress={scanBookCover} disabled={loading}>
                <Text style={{ fontSize:32 }}>📷</Text>
                <Text style={ts.scanBookTxt}>Scan book cover</Text>
                <Text style={ts.scanBookSub}>So Zaeli knows which book you're reading</Text>
              </TouchableOpacity>
            ) : (
              // Step 2: mic to read
              <View style={ts.micArea}>
                {session.bookTitle && (
                  <Text style={ts.readingBookTitle}>📖 {session.bookTitle}</Text>
                )}
                <TouchableOpacity
                  style={[ts.micBtn, isRecording && ts.micBtnActive]}
                  onPress={isRecording ? stopAndTranscribe : startRecording}
                  disabled={loading || transcribing}>
                  <Text style={{ fontSize:36 }}>{isRecording ? '⏹' : '🎙️'}</Text>
                </TouchableOpacity>
                <Text style={ts.micHint}>
                  {transcribing ? 'Zaeli is listening...' :
                   isRecording  ? 'Reading... tap to stop' :
                   'Tap mic to read aloud'}
                </Text>
                {/* Also allow typing */}
                <TouchableOpacity style={ts.typeInstead}
                  onPress={() => {}}>
                  <Text style={ts.typeInsteadTxt}>or type your answer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          // Normal mode — text input
          <View style={ts.inputBar}>
            {/* Photo button */}
            <TouchableOpacity style={ts.inputAction} onPress={pickPhoto}>
              <Text style={{ fontSize:22 }}>📷</Text>
            </TouchableOpacity>

            <TextInput
              style={ts.inputField}
              value={input}
              onChangeText={setInput}
              placeholder={`Answer ${session.member.name}…`}
              placeholderTextColor="rgba(255,255,255,0.25)"
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(input)}
            />

            {/* Speak last message */}
            {lastZaeliMsg && (
              <TouchableOpacity style={ts.inputAction} onPress={() => speakMessage(lastZaeliMsg.text)}>
                <Text style={{ fontSize:22 }}>🔊</Text>
              </TouchableOpacity>
            )}

            {/* Send */}
            <TouchableOpacity
              style={[ts.sendBtn, (!input.trim() || loading) && { opacity:0.4 }]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || loading}>
              <Text style={ts.sendBtnTxt}>→</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Animated typing dot
function TypingDot({ delay }: { delay:number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue:1, duration:300, useNativeDriver:true }),
        Animated.timing(anim, { toValue:0, duration:300, useNativeDriver:true }),
        Animated.delay(600 - delay),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[ts.dot, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange:[0,1], outputRange:[0,-4] }) }],
    }]} />
  );
}

// ── LEARN VIEW (subject selector hub) ────────────────────────────────
function LearnView({ member }: { member:Member }) {
  const [activeSession, setActiveSession] = useState<TutoringSession|null>(null);
  const [sessionPtsTotal, setSessionPtsTotal] = useState(0);

  if (activeSession) {
    return (
      <TutoringSessionScreen
        session={activeSession}
        onBack={(pts) => {
          setSessionPtsTotal(p => p + pts);
          setActiveSession(null);
        }}
      />
    );
  }

  const startSession = (subject:TutoringSubject, mode:TutoringMode) => {
    setActiveSession({ subject:subject.name, subjectEmoji:subject.emoji, mode, member });
  };

  return (
    <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:40 }}>
      {/* Tutor hero */}
      <View style={s.learnHero}>
        <View style={s.learnHeroGlow} />
        <Text style={s.learnHeroLbl}>ZAELI TUTORING</Text>
        <Text style={s.learnHeroTitle}>Ready to learn,{'\n'}{member.name}? 🎓</Text>
        <View style={{ flexDirection:'row', gap:10 }}>
          <TouchableOpacity style={s.learnBtnPrim}
            onPress={() => startSession(DUMMY_SUBJECTS[0], 'practice')}>
            <Text style={s.learnBtnPrimTxt}>📝 Start Practice</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.learnBtnSec}
            onPress={() => startSession(DUMMY_SUBJECTS[0], 'photo_help')}>
            <Text style={s.learnBtnSecTxt}>📷 Photo Help</Text>
          </TouchableOpacity>
        </View>
        {sessionPtsTotal > 0 && (
          <View style={{ marginTop:12, backgroundColor:'rgba(255,229,0,0.18)', borderRadius:12, paddingHorizontal:14, paddingVertical:7, alignSelf:'flex-start' }}>
            <Text style={{ fontSize:13, fontWeight:'700', color:C.yellow }}>⭐ +{sessionPtsTotal} pts earned today!</Text>
          </View>
        )}
      </View>

      {/* Read to Zaeli — featured card */}
      <Text style={s.sectionLbl}>Reading</Text>
      <TouchableOpacity style={[ts.modeCard, { marginHorizontal:16, backgroundColor:'#1A1030', borderColor:C.purpleB, gap:14 }]}
        onPress={() => startSession({ name:'Reading', emoji:'📖', accuracy:80 }, 'reading')} activeOpacity={0.8}>
        <Text style={{ fontSize:30 }}>📖</Text>
        <View style={{ flex:1 }}>
          <Text style={[ts.modeTitle, { color:'#fff' }]}>Read to Zaeli</Text>
          <Text style={[ts.modeSub, { color:C.purple }]}>Scan your book · read aloud · get feedback</Text>
        </View>
        <View style={{ backgroundColor:C.purple, borderRadius:14, paddingHorizontal:10, paddingVertical:4 }}>
          <Text style={{ fontSize:11, fontWeight:'700', color:'#fff' }}>🎙️ Voice</Text>
        </View>
      </TouchableOpacity>

      {/* Mode cards */}
      <Text style={s.sectionLbl}>Other modes</Text>
      <View style={{ paddingHorizontal:16, gap:8 }}>
        {(Object.entries(MODE_CONFIG).filter(([m]) => m !== 'reading') as [TutoringMode, typeof MODE_CONFIG[TutoringMode]][]).map(([mode, cfg]) => (
          <TouchableOpacity key={mode} style={ts.modeCard}
            onPress={() => startSession(DUMMY_SUBJECTS[0], mode)} activeOpacity={0.8}>
            <Text style={{ fontSize:26 }}>{cfg.emoji}</Text>
            <View style={{ flex:1 }}>
              <Text style={ts.modeTitle}>{cfg.label}</Text>
              <Text style={ts.modeSub} numberOfLines={1}>{cfg.prompt.split('.')[0]}</Text>
            </View>
            <Text style={{ fontSize:18, color:C.text3 }}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Subjects */}
      <Text style={s.sectionLbl}>Tap a subject to practise</Text>
      <View style={{ flexDirection:'row', flexWrap:'wrap', paddingHorizontal:14, gap:8 }}>
        {DUMMY_SUBJECTS.map(sub => (
          <TouchableOpacity key={sub.name} style={s.subjectCard}
            onPress={() => startSession(sub, 'practice')} activeOpacity={0.8}>
            <Text style={{ fontSize:26 }}>{sub.emoji}</Text>
            <Text style={s.subjectName}>{sub.name}</Text>
            <View style={s.subjectBar}>
              <View style={[s.subjectBarFill, {
                width:`${sub.accuracy}%` as any,
                backgroundColor: sub.accuracy >= 80 ? C.green : sub.accuracy >= 65 ? C.blue : C.orange,
              }]} />
            </View>
            <Text style={s.subjectMeta}>{sub.accuracy}% accuracy</Text>
            {sub.weak && <Text style={s.subjectWeak}>⚠ {sub.weak}</Text>}
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[s.subjectCard, { backgroundColor:C.card2, borderStyle:'dashed' as const, alignItems:'center', justifyContent:'center' }]}>
          <Text style={{ fontSize:22, color:C.text3 }}>+</Text>
          <Text style={{ fontSize:12, fontWeight:'700', color:C.text3 }}>Add subject</Text>
        </TouchableOpacity>
      </View>

      {/* Week summary */}
      <Text style={s.sectionLbl}>This Week</Text>
      <View style={[s.weekSummary, { borderColor:C.purpleB }]}>
        <Text style={[s.weekSummaryTitle, { color:C.purple }]}>📊 Week summary</Text>
        <Text style={s.weekSummaryTxt}>24 questions answered · 75% correct · ⭐ 95 pts earned this week</Text>
      </View>
    </ScrollView>
  );
}

// ── PROFILE VIEW ──────────────────────────────────────────────────────
function ProfileView({ member }: { member:Member }) {
  const days = ['Mon','Tue','Wed','Thu','Fri'];
  return (
    <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:40 }}>
      {/* Avatar + name */}
      <View style={s.profHdr}>
        <View style={[s.profAv, { backgroundColor: member.colour + '22' }]}>
          <Text style={{ fontSize:36 }}>{member.avatar_emoji}</Text>
        </View>
        <View style={{ flex:1 }}>
          <Text style={s.profName}>{member.name} Smith</Text>
          <Text style={s.profRole}>Age 10 · Year 5</Text>
        </View>
        <TouchableOpacity style={s.editBtn}><Text style={s.editBtnTxt}>Edit</Text></TouchableOpacity>
      </View>

      <Text style={s.sectionLbl}>School Info</Text>
      <View style={s.infoCard}>
        {[
          ['School',    "St Joseph's Primary"],
          ['Year',      'Year 5B'],
          ['Teacher',   'Ms Johnson · Room 14'],
          ['Start',     '8:45am'],
          ['Finish',    '3:00pm'],
        ].map(([k,v],i,arr) => (
          <View key={k} style={[s.infoRow, i===arr.length-1 && { borderBottomWidth:0 }]}>
            <Text style={s.infoKey}>{k}</Text>
            <Text style={s.infoVal}>{v}</Text>
          </View>
        ))}
      </View>

      <Text style={s.sectionLbl}>Uniform Schedule</Text>
      <View style={s.infoCard}>
        {days.map((day, i) => {
          const u = UNIFORM[day];
          return (
            <View key={day} style={[s.infoRow, i===days.length-1 && { borderBottomWidth:0 }]}>
              <Text style={[s.infoKey, { width:32 }]}>{day}</Text>
              <View style={[s.uniformBadge, { backgroundColor:u.bg }]}>
                <Text style={[s.uniformBadgeTxt, { color:u.color }]}>{u.label}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <Text style={s.sectionLbl}>Medical & Emergency</Text>
      <View style={s.infoCard}>
        {[
          ['Allergies', '⚠️ Penicillin', true],
          ['Medicare',  'Saved in wallet', false],
          ['Doctor',    'Dr. Patel · 07 3123 4567', false],
        ].map(([k,v,warn],i,arr) => (
          <View key={k as string} style={[s.infoRow, i===arr.length-1 && { borderBottomWidth:0 }]}>
            <Text style={s.infoKey}>{k}</Text>
            <Text style={[s.infoVal, warn && { color:C.red }]}>{v}</Text>
          </View>
        ))}
      </View>

      <Text style={s.sectionLbl}>Device Access</Text>
      <View style={s.infoCard}>
        <View style={[s.infoRow, { borderBottomWidth:0 }]}>
          <Text style={s.infoKey}>Own device</Text>
          <View style={[s.deviceBadge, { backgroundColor:C.greenL }]}>
            <Text style={[s.deviceBadgeTxt, { color:C.green }]}>✓ Uses parent phone</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN KIDS SCREEN
// ══════════════════════════════════════════════════════════════════════
export default function KidsScreen() {
  const [members, setMembers]           = useState<Member[]>(DUMMY_MEMBERS);
  const [selectedId, setSelectedId]     = useState(DUMMY_MEMBER_ID);
  const [jobs, setJobs]                 = useState<Job[]>(DUMMY_JOBS);
  const [rewards, setRewards]           = useState<Reward[]>(DUMMY_REWARDS);
  const [subView, setSubView]           = useState<SubView>('jobs');
  const [confetti, setConfetti]         = useState(0);
  const [handoff, setHandoff]           = useState<{ job:Job; member:Member } | null>(null);
  const [addJobVisible, setAddJobVisible] = useState(false);

  const selectedMember = members.find(m => m.id === selectedId) || members[0];
  const totalPoints    = 340; // TODO: fetch from DB

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [memRes, jobRes, rewRes] = await Promise.all([
      supabase.from('family_members').select('*').eq('family_id', DUMMY_FAMILY_ID),
      supabase.from('missions').select('*').eq('family_id', DUMMY_FAMILY_ID),
      supabase.from('rewards').select('*').eq('family_id', DUMMY_FAMILY_ID),
    ]);
    if (memRes.data && memRes.data.length > 0) setMembers(memRes.data as Member[]);
    if (jobRes.data && jobRes.data.length > 0) {
      setJobs(jobRes.data.map((j: any) => ({ ...j, done: j.completed_today || false })));
    }
    if (rewRes.data && rewRes.data.length > 0) setRewards(rewRes.data as Reward[]);
  };

  const tickJob = useCallback(async (job: Job) => {
    if (job.done) {
      // untick
      setJobs(p => p.map(j => j.id === job.id ? { ...j, done:false } : j));
      return;
    }
    // tick — show handoff moment
    setJobs(p => p.map(j => j.id === job.id ? { ...j, done:true } : j));
    setConfetti(c => c + 1);
    setHandoff({ job, member: selectedMember });
    await supabase.from('mission_completions').insert({
      mission_id: job.id, member_id: selectedId,
      status:'pending', points_earned: job.points,
    });
  }, [selectedMember, selectedId]);

  const childMembers = members.filter(m => m.role === 'child' || !m.role?.includes('parent'));

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style={subView === 'learn' ? 'light' : 'dark'} />

      {/* Handoff overlay */}
      {handoff && (
        <HandoffOverlay
          member={handoff.member}
          jobTitle={handoff.job.title}
          points={handoff.job.points}
          onDone={() => setHandoff(null)}
        />
      )}

      <ConfettiBurst trigger={confetti} />

      {/* Add Job Modal */}
      <AddJobModal
        visible={addJobVisible}
        onClose={() => setAddJobVisible(false)}
        onSaved={loadData}
        members={members}
      />

      {/* Header — compact when in Learn mode */}
      {subView === 'learn' ? (
        // Learn mode: minimal dark header
        <View style={[s.header, { backgroundColor:'#0D0D1A', borderBottomColor:'rgba(255,255,255,0.07)' }]}>
          <Text style={[s.title, { color:'#fff' }]}>Learn</Text>
          {/* Child switcher pills — top right */}
          <View style={s.switcherInline}>
            {childMembers.map(m => (
              <TouchableOpacity key={m.id}
                style={[s.switcherPill, selectedId === m.id && { backgroundColor: m.colour }]}
                onPress={() => setSelectedId(m.id)}>
                <Text style={{ fontSize:15 }}>{m.avatar_emoji}</Text>
                {selectedId === m.id && <Text style={s.switcherPillName}>{m.name}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        // Normal mode: white header with child switcher pills top-right
        <View style={s.header}>
          <Text style={s.title}>Kids</Text>
          <View style={s.switcherInline}>
            {childMembers.map(m => (
              <TouchableOpacity key={m.id}
                style={[s.switcherPill, selectedId === m.id && { backgroundColor: m.colour }]}
                onPress={() => setSelectedId(m.id)}>
                <Text style={{ fontSize:15 }}>{m.avatar_emoji}</Text>
                {selectedId === m.id && <Text style={s.switcherPillName}>{m.name}</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.switcherPill, { backgroundColor:C.card2 }]}>
              <Text style={{ fontSize:15, color:C.text3 }}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Hero card + subnav — hidden in Learn mode for full focus */}
      {subView !== 'learn' && (
        <>
          {/* Child hero card */}
          <View style={[s.heroCard, { backgroundColor: selectedMember.colour }]}>
            <View style={s.heroGlow} />
            <View style={s.heroTop}>
              <View style={[s.heroAv, { backgroundColor:'rgba(255,255,255,0.18)' }]}>
                <Text style={{ fontSize:30 }}>{selectedMember.avatar_emoji}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={s.heroName}>{selectedMember.name}</Text>
                <Text style={s.heroRole}>Year 5 · St Joseph's</Text>
                <View style={s.streakBadge}>
                  <Text style={{ fontSize:12 }}>🔥</Text>
                  <Text style={s.streakTxt}>6 day streak!</Text>
                </View>
              </View>
            </View>
            <View style={s.heroStats}>
              <View style={s.heroStat}><Text style={s.heroStatV}>⭐ {totalPoints}</Text><Text style={s.heroStatL}>Total pts</Text></View>
              <View style={s.heroStat}>
                <Text style={s.heroStatV}>{jobs.filter(j => j.done).length}/{jobs.length}</Text>
                <Text style={s.heroStatL}>Jobs today</Text>
              </View>
              <View style={s.heroStat}><Text style={s.heroStatV}>🎁 2</Text><Text style={s.heroStatL}>Rewards</Text></View>
            </View>
          </View>

          {/* Sub-nav */}
          <View style={s.subnav}>
            {([['jobs','💼 Jobs & Rewards'],['learn','🎓 Learn'],['profile','👤 Profile']] as [SubView,string][]).map(([v, label]) => (
              <TouchableOpacity key={v} style={[s.subnavBtn, subView===v && { backgroundColor: selectedMember.colour }]}
                onPress={() => setSubView(v)}>
                <Text style={[s.subnavBtnTxt, subView===v && { color:'#fff' }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Learn tab button when in learn mode — sits below header */}
      {subView === 'learn' && (
        <View style={[s.subnav, { backgroundColor:'#0D0D1A', borderBottomColor:'rgba(255,255,255,0.07)' }]}>
          {([['jobs','💼 Jobs'],['learn','🎓 Learn'],['profile','👤 Profile']] as [SubView,string][]).map(([v, label]) => (
            <TouchableOpacity key={v}
              style={[s.subnavBtn, subView===v && { backgroundColor: C.purple }]}
              onPress={() => setSubView(v)}>
              <Text style={[s.subnavBtnTxt, { color: subView===v ? '#fff' : 'rgba(255,255,255,0.4)' }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Sub-views */}
      {subView === 'jobs' && (
        <JobsRewardsView
          member={selectedMember}
          jobs={jobs}
          rewards={rewards}
          totalPoints={totalPoints}
          onTickJob={tickJob}
          onAddJob={() => setAddJobVisible(true)}
        />
      )}
      {subView === 'learn'   && <LearnView   member={selectedMember} />}
      {subView === 'profile' && <ProfileView member={selectedMember} />}
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex:1, backgroundColor:C.bg },

  // header
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:22, paddingTop:14, paddingBottom:8 },
  title:  { fontFamily:'DMSerifDisplay_400Regular', fontSize:34, color:C.text },
  addJobBtn: { paddingHorizontal:14, paddingVertical:8, borderRadius:20 },
  addJobBtnTxt:{ fontSize:13, fontWeight:'700', color:'#fff', fontFamily:'Poppins_700Bold' },

  // inline child switcher in header
  switcherInline:   { flexDirection:'row', alignItems:'center', gap:6 },
  switcherPill:     { flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:10, paddingVertical:6, borderRadius:20, backgroundColor:C.card2 },
  switcherPillName: { fontSize:12, fontWeight:'700', color:'#fff', fontFamily:'Poppins_700Bold' },

  // child switcher
  switcher:    { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingBottom:10, gap:8 },
  childAvWrap: { alignItems:'center', gap:3, padding:6, borderRadius:16, borderWidth:2, borderColor:'transparent' },
  childAv:     { fontSize:30 },
  childAvName: { fontSize:10, fontWeight:'700', color:C.text3, fontFamily:'Poppins_700Bold' },
  childAddBtn: { width:40, height:40, borderRadius:13, backgroundColor:C.card2, borderWidth:1.5, borderColor:C.border, borderStyle:'dashed' as const, alignItems:'center', justifyContent:'center', marginLeft:4 },

  // hero card
  heroCard:    { marginHorizontal:16, borderRadius:24, padding:18, overflow:'hidden', position:'relative', marginBottom:0 },
  heroGlow:    { position:'absolute', top:-30, right:-30, width:110, height:110, borderRadius:55, backgroundColor:'rgba(255,255,255,0.09)' },
  heroTop:     { flexDirection:'row', alignItems:'center', gap:12, marginBottom:14 },
  heroAv:      { width:54, height:54, borderRadius:18, alignItems:'center', justifyContent:'center', flexShrink:0 },
  heroName:    { fontFamily:'DMSerifDisplay_400Regular', fontSize:26, color:'#fff' },
  heroRole:    { fontSize:12, color:'rgba(255,255,255,0.65)', marginTop:1 },
  streakBadge: { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:'rgba(255,140,0,0.28)', borderRadius:22, paddingHorizontal:10, paddingVertical:3, marginTop:5, alignSelf:'flex-start' },
  streakTxt:   { fontSize:11, fontWeight:'700', color:'#FF8C00' },
  heroStats:   { flexDirection:'row', gap:8 },
  heroStat:    { flex:1, backgroundColor:'rgba(255,255,255,0.13)', borderRadius:14, padding:10, alignItems:'center' },
  heroStatV:   { fontSize:17, fontWeight:'800', color:'#fff' },
  heroStatL:   { fontSize:9, color:'rgba(255,255,255,0.58)', textTransform:'uppercase', letterSpacing:0.6, marginTop:2 },

  // sub-nav
  subnav:    { flexDirection:'row', marginHorizontal:16, marginVertical:10, backgroundColor:C.card2, borderRadius:14, padding:3 },
  subnavBtn: { flex:1, paddingVertical:10, borderRadius:11, alignItems:'center' },
  subnavBtnTxt: { fontSize:11, fontWeight:'700', color:C.text2, fontFamily:'Poppins_700Bold', textAlign:'center' },

  // jobs/rewards toggle
  jrToggle: { flexDirection:'row', marginHorizontal:16, marginBottom:4, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:14, padding:3 },
  jrBtn:    { flex:1, paddingVertical:10, borderRadius:11, alignItems:'center' },
  jrBtnTxt: { fontSize:13, fontWeight:'700', color:C.text2, fontFamily:'Poppins_700Bold' },

  // progress
  progTrack: { height:7, backgroundColor:C.border, borderRadius:4, overflow:'hidden' },
  progFill:  { height:'100%' as any, borderRadius:4 },

  // job card
  jobCard:  { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:16, paddingVertical:14, paddingHorizontal:14 },
  jobIcon:  { width:44, height:44, borderRadius:14, alignItems:'center', justifyContent:'center', flexShrink:0 },
  jobTitle: { fontSize:15, fontWeight:'700', color:C.text },
  jobPts:   { fontSize:12, fontWeight:'700', marginTop:2 },
  jobFreq:  { fontSize:11, color:C.text3, marginTop:1 },
  jobCheck: { width:30, height:30, borderRadius:10, borderWidth:2, borderColor:C.border, flexShrink:0, marginLeft:'auto' as any, alignItems:'center', justifyContent:'center' },

  // rewards
  ptsBalance:    { flexDirection:'row', alignItems:'center', gap:12, marginHorizontal:16, marginTop:10, marginBottom:4, backgroundColor:C.card, borderWidth:2, borderRadius:18, padding:16 },
  ptsBalanceVal: { fontSize:22, fontWeight:'800' },
  ptsBalanceSub: { fontSize:12, color:C.text3, marginTop:2 },
  rewardCard:    { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:16, padding:14, marginHorizontal:16, marginBottom:8 },
  rewardIcon:    { width:46, height:46, borderRadius:14, alignItems:'center', justifyContent:'center', flexShrink:0 },
  rewardName:    { fontSize:15, fontWeight:'700', color:C.text },
  rewardCost:    { fontSize:12, fontWeight:'700', marginTop:2 },
  claimBtn:      { borderRadius:14, paddingHorizontal:14, paddingVertical:10, flexShrink:0 },
  claimBtnTxt:   { fontSize:13, fontWeight:'700', fontFamily:'Poppins_700Bold' },

  // learn
  learnHero:      { margin:16, marginTop:8, backgroundColor:'#5B3FA0', borderRadius:22, padding:20, overflow:'hidden', position:'relative' },
  learnHeroGlow:  { position:'absolute', top:-25, right:-25, width:90, height:90, borderRadius:45, backgroundColor:'rgba(255,255,255,0.07)' },
  learnHeroLbl:   { fontSize:10, fontWeight:'700', color:'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:6, fontFamily:'Poppins_700Bold' },
  learnHeroTitle: { fontFamily:'DMSerifDisplay_400Regular', fontSize:22, color:'#fff', marginBottom:14, lineHeight:27 },
  learnBtnPrim:   { backgroundColor:'#fff', borderRadius:14, paddingHorizontal:18, paddingVertical:12 },
  learnBtnPrimTxt:{ fontSize:13, fontWeight:'700', color:'#5B3FA0', fontFamily:'Poppins_700Bold' },
  learnBtnSec:    { backgroundColor:'rgba(255,255,255,0.18)', borderRadius:14, paddingHorizontal:16, paddingVertical:12 },
  learnBtnSecTxt: { fontSize:13, fontWeight:'700', color:'#fff', fontFamily:'Poppins_700Bold' },
  subjectCard:    { width:'47%', backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:16, padding:14, gap:6 },
  subjectName:    { fontSize:14, fontWeight:'700', color:C.text },
  subjectBar:     { height:5, backgroundColor:C.border, borderRadius:3, overflow:'hidden' },
  subjectBarFill: { height:'100%' as any, borderRadius:3 },
  subjectMeta:    { fontSize:10, color:C.text3 },
  subjectWeak:    { fontSize:10, fontWeight:'700', color:C.orange, backgroundColor:C.orangeL, borderRadius:6, paddingHorizontal:7, paddingVertical:2, alignSelf:'flex-start' },
  weekSummary:    { marginHorizontal:16, backgroundColor:C.purpleL, borderWidth:1.5, borderRadius:16, padding:14 },
  weekSummaryTitle:{ fontSize:13, fontWeight:'700', fontFamily:'Poppins_700Bold', marginBottom:5 },
  weekSummaryTxt: { fontSize:13, color:C.text2, lineHeight:20 },

  // profile
  profHdr:  { flexDirection:'row', alignItems:'center', gap:14, paddingHorizontal:18, paddingTop:10, paddingBottom:6 },
  profAv:   { width:60, height:60, borderRadius:20, alignItems:'center', justifyContent:'center', flexShrink:0 },
  profName: { fontFamily:'DMSerifDisplay_400Regular', fontSize:24, color:C.text },
  profRole: { fontSize:12, color:C.text3, marginTop:2 },
  editBtn:  { marginLeft:'auto' as any, backgroundColor:C.card2, borderRadius:12, paddingHorizontal:14, paddingVertical:8 },
  editBtnTxt:{ fontSize:12, fontWeight:'700', color:C.text2, fontFamily:'Poppins_700Bold' },
  infoCard: { backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:18, marginHorizontal:16, marginBottom:10, overflow:'hidden' },
  infoRow:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:13, borderBottomWidth:1, borderBottomColor:C.border },
  infoKey:  { fontSize:11, fontWeight:'700', color:C.text3, textTransform:'uppercase', letterSpacing:0.7, width:70, flexShrink:0, fontFamily:'Poppins_700Bold' },
  infoVal:  { fontSize:13, fontWeight:'600', color:C.text, flex:1, textAlign:'right' },
  uniformBadge:    { borderRadius:8, paddingHorizontal:10, paddingVertical:4 },
  uniformBadgeTxt: { fontSize:12, fontWeight:'700', fontFamily:'Poppins_700Bold' },
  deviceBadge:     { borderRadius:8, paddingHorizontal:10, paddingVertical:4 },
  deviceBadgeTxt:  { fontSize:12, fontWeight:'700', fontFamily:'Poppins_700Bold' },

  // handoff
  handoff:      { position:'absolute', inset:0, zIndex:50, alignItems:'center', justifyContent:'center', gap:16, borderRadius:0 },
  handoffTitle: { fontFamily:'DMSerifDisplay_400Regular', fontSize:32, color:'#fff', textAlign:'center', lineHeight:38 },
  handoffSub:   { fontSize:15, color:'rgba(255,255,255,0.78)', textAlign:'center' },
  handoffPts:   { backgroundColor:'rgba(255,255,255,0.22)', borderRadius:22, paddingHorizontal:22, paddingVertical:10 },
  handoffPtsTxt:{ fontSize:16, fontWeight:'700', color:'#fff', fontFamily:'Poppins_700Bold' },
  handoffReturn:{ fontSize:13, color:'rgba(255,255,255,0.55)' },

  // shared
  sectionLbl: { fontSize:10, fontWeight:'700', color:C.text3, textTransform:'uppercase', letterSpacing:1.2, paddingHorizontal:18, paddingTop:14, paddingBottom:7, fontFamily:'Poppins_700Bold' },
  emptyTxt:   { fontSize:15, color:C.text3, textAlign:'center', marginTop:50, fontStyle:'italic' },

  // add job modal
  modalHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:18, borderBottomWidth:1.5, borderBottomColor:C.border, backgroundColor:C.card },
  modalTitle:  { fontSize:17, fontWeight:'700', color:C.text, fontFamily:'Poppins_700Bold' },
  modalCancel: { fontSize:16, color:C.text2 },
  modalSave:   { fontSize:17, fontWeight:'700', color:C.green, fontFamily:'Poppins_700Bold' },
  fieldLbl:    { fontSize:12, fontWeight:'700', color:C.text2, marginBottom:8, textTransform:'uppercase', letterSpacing:0.8, fontFamily:'Poppins_700Bold' },
  input:       { backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:14, padding:16, fontSize:17, color:C.text, marginBottom:20 },
  freqBtn:     { paddingHorizontal:18, paddingVertical:10, borderRadius:22, borderWidth:1.5, borderColor:C.border, backgroundColor:C.card },
  freqBtnOn:   { backgroundColor:C.green, borderColor:C.green },
  freqBtnTxt:  { fontSize:13, fontWeight:'700', color:C.text2, fontFamily:'Poppins_700Bold' },
  assignBtn:   { paddingHorizontal:16, paddingVertical:9, borderRadius:22, borderWidth:1.5, borderColor:C.border, backgroundColor:C.card },
  assignBtnOn: { backgroundColor:C.green, borderColor:C.green },
  assignBtnTxt:{ fontSize:13, fontWeight:'700', color:C.text2, fontFamily:'Poppins_700Bold' },
  iconBtn:     { width:48, height:48, borderRadius:14, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, alignItems:'center', justifyContent:'center' },
  iconBtnOn:   { backgroundColor:C.greenL, borderColor:C.greenB },
});

// ══════════════════════════════════════════════════════════════════════
// TUTORING SESSION STYLES
// ══════════════════════════════════════════════════════════════════════
const ts = StyleSheet.create({
  safe:         { flex:1, backgroundColor:'#0D0D1A' },

  // header
  header:       { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1, borderBottomColor:'rgba(255,255,255,0.07)' },
  backBtn:      { paddingRight:12, paddingVertical:4 },
  backTxt:      { fontSize:16, color:'rgba(255,255,255,0.6)', fontWeight:'600' },
  headerMid:    { flex:1, alignItems:'center' },
  headerSubject:{ fontSize:15, fontWeight:'700', color:'#fff', fontFamily:'Poppins_700Bold' },
  headerMode:   { fontSize:11, color:'rgba(255,255,255,0.45)', marginTop:2 },
  headerPts:    { backgroundColor:'rgba(255,229,0,0.15)', borderRadius:20, paddingHorizontal:12, paddingVertical:5 },
  headerPtsTxt: { fontSize:13, fontWeight:'700', color:C.yellow, fontFamily:'Poppins_700Bold' },

  // stats
  statsBar:     { flexDirection:'row', gap:8, paddingHorizontal:16, paddingVertical:8 },
  statChip:     { backgroundColor:'rgba(255,255,255,0.06)', borderRadius:20, paddingHorizontal:12, paddingVertical:5 },
  statChipTxt:  { fontSize:12, color:'rgba(255,255,255,0.5)', fontWeight:'600' },

  // chat
  chatScroll:   { flex:1 },
  msgRow:       { flexDirection:'row', alignItems:'flex-end', gap:8 },
  msgRowRight:  { flexDirection:'row-reverse' },
  zaeliAvatar:  { width:34, height:34, borderRadius:17, backgroundColor:'rgba(155,127,212,0.25)', alignItems:'center', justifyContent:'center', flexShrink:0 },
  bubble:       { maxWidth:'78%', borderRadius:18, padding:14, gap:6 },
  bubbleZaeli:  { backgroundColor:'rgba(255,255,255,0.07)', borderBottomLeftRadius:4 },
  bubbleChild:  { backgroundColor:C.purple, borderBottomRightRadius:4 },
  bubbleCorrect:{ backgroundColor:C.green },
  bubbleTxt:    { fontSize:15, color:'rgba(255,255,255,0.9)', lineHeight:22 },
  bubbleTxtChild:{ color:'#fff' },
  bubblePts:    { fontSize:12, fontWeight:'700', color:'rgba(255,255,255,0.7)' },
  speakBtn:     { alignSelf:'flex-end', marginTop:4 },
  speakBtnTxt:  { fontSize:16 },

  // typing dots
  typingDots:   { flexDirection:'row', gap:5, paddingVertical:4, paddingHorizontal:2 },
  dot:          { width:8, height:8, borderRadius:4, backgroundColor:'rgba(255,255,255,0.4)' },

  // input
  inputBar:     { flexDirection:'row', alignItems:'flex-end', gap:8, padding:12, borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.07)', backgroundColor:'#0D0D1A' },
  inputAction:  { width:44, height:44, borderRadius:22, backgroundColor:'rgba(255,255,255,0.06)', alignItems:'center', justifyContent:'center' },
  inputField:   { flex:1, backgroundColor:'rgba(255,255,255,0.07)', borderRadius:22, paddingHorizontal:16, paddingVertical:10, fontSize:15, color:'#fff', maxHeight:100 },
  sendBtn:      { width:44, height:44, borderRadius:22, backgroundColor:C.purple, alignItems:'center', justifyContent:'center' },
  sendBtnTxt:   { fontSize:20, color:'#fff', fontWeight:'700' },

  // points burst
  pointsBurst:  { position:'absolute', top:'40%', alignSelf:'center', zIndex:100, backgroundColor:C.green, borderRadius:30, paddingHorizontal:24, paddingVertical:12 },
  pointsBurstTxt:{ fontSize:20, fontWeight:'700', color:'#fff', fontFamily:'Poppins_700Bold' },

  // mode cards (on hub)
  modeCard:     { flexDirection:'row', alignItems:'center', gap:14, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:16, padding:14 },
  modeTitle:    { fontSize:15, fontWeight:'700', color:C.text, fontFamily:'Poppins_700Bold' },
  modeSub:      { fontSize:12, color:C.text2, marginTop:2 },

  // reading mode
  readingBar:       { backgroundColor:'#0D0D1A', borderTopWidth:1, borderTopColor:'rgba(255,255,255,0.07)', paddingBottom:20 },
  scanBookBtn:      { alignItems:'center', justifyContent:'center', gap:8, paddingVertical:28, paddingHorizontal:24, margin:16, borderRadius:20, borderWidth:2, borderColor:'rgba(255,255,255,0.15)', borderStyle:'dashed' as const },
  scanBookTxt:      { fontSize:16, fontWeight:'700', color:'#fff', fontFamily:'Poppins_700Bold' },
  scanBookSub:      { fontSize:12, color:'rgba(255,255,255,0.4)', textAlign:'center' },
  micArea:          { alignItems:'center', paddingVertical:20, gap:12 },
  readingBookTitle: { fontSize:13, fontWeight:'700', color:'rgba(255,255,255,0.5)' },
  micBtn:           { width:80, height:80, borderRadius:40, backgroundColor:'rgba(155,127,212,0.25)', borderWidth:2, borderColor:C.purple, alignItems:'center', justifyContent:'center' },
  micBtnActive:     { backgroundColor:'rgba(255,59,59,0.3)', borderColor:'#FF3B3B', transform:[{ scale:1.1 }] },
  micHint:          { fontSize:13, color:'rgba(255,255,255,0.45)' },
  typeInstead:      { paddingVertical:6 },
  typeInsteadTxt:   { fontSize:12, color:'rgba(255,255,255,0.3)', textDecorationLine:'underline' },
});
