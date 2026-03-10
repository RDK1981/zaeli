import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Modal,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwipeToDelete } from '../components/SwipeToDelete';
import { supabase } from '../../lib/supabase';

const DUMMY_FAMILY_ID = '00000000-0000-0000-0000-000000000001';

const C = {
  bg:      '#F7F7F7', card:    '#FFFFFF', card2:   '#F0F0F0',
  border:  '#E0E0E0', text:    '#0A0A0A', text2:   'rgba(0,0,0,0.50)', text3:   'rgba(0,0,0,0.28)',
  green:   '#00C97A', greenL:  'rgba(0,201,122,0.10)', greenB:  'rgba(0,201,122,0.28)',
  orange:  '#FF8C00', orangeL: 'rgba(255,140,0,0.10)', orangeB: 'rgba(255,140,0,0.28)',
  yellow:  '#FFE500', yellowD: '#B8A400', yellowL: 'rgba(255,229,0,0.14)', yellowB: 'rgba(255,229,0,0.35)',
  blue:    '#0057FF', blueL:   'rgba(0,87,255,0.08)',  blueB:   'rgba(0,87,255,0.22)',
  purple:  '#9B7FD4', purpleL: 'rgba(155,127,212,0.10)', purpleB: 'rgba(155,127,212,0.28)',
  magenta: '#E0007C', magentaL:'rgba(224,0,124,0.08)',
  red:     '#FF3B3B', redL:    'rgba(255,59,59,0.08)',
  teal:    '#00BFBF', tealL:   'rgba(0,191,191,0.10)', tealB:   'rgba(0,191,191,0.28)',
  dark:    '#0A0A0A', darkL:   'rgba(10,10,10,0.06)',
};

type MorePage = 'hub' | 'jobs_rewards' | 'family' | 'todo' | 'notes';
type JRTab    = 'jobs' | 'rewards';
type Job      = { id:string; title:string; points:number; icon:string; frequency:string; assigned_to?:string };
type Reward   = { id:string; title:string; points_cost:number; icon:string };
type Member   = { id:string; name:string; avatar_emoji:string; colour:string; role?:string };
type Approval = { id:string; member:string; avatar:string; job:string; pts:number; minsAgo:number; type:'job'|'reward' };

const DUMMY_MEMBERS: Member[] = [
  { id:'00000000-0000-0000-0000-000000000002', name:'Sarah', avatar_emoji:'🦁', colour:C.green,  role:'child' },
  { id:'00000000-0000-0000-0000-000000000003', name:'Jack',  avatar_emoji:'🐯', colour:C.orange, role:'child' },
  { id:'00000000-0000-0000-0000-000000000004', name:'Mum',   avatar_emoji:'👩', colour:C.blue,   role:'parent' },
  { id:'00000000-0000-0000-0000-000000000005', name:'Dad',   avatar_emoji:'👨', colour:C.dark,   role:'parent' },
];

const DUMMY_JOBS: Job[] = [
  { id:'j1', title:'Make my bed',         points:5,  icon:'🛏️', frequency:'Every morning',   assigned_to:'both' },
  { id:'j2', title:'Sweep the kitchen',   points:15, icon:'🧹', frequency:'Weekdays',         assigned_to:'sarah' },
  { id:'j3', title:'Take out the bins',   points:15, icon:'🗑️', frequency:'Tue + Fri',        assigned_to:'jack'  },
  { id:'j4', title:'Feed the dog',        points:5,  icon:'🐕', frequency:'Morning + night',  assigned_to:'both'  },
  { id:'j5', title:'Set table for dinner',points:10, icon:'🍽️', frequency:'Weeknights',       assigned_to:'both'  },
  { id:'j6', title:'Read for 20 minutes', points:10, icon:'📚', frequency:'Every night',      assigned_to:'sarah' },
];

const DUMMY_REWARDS: Reward[] = [
  { id:'r1', title:'Extra screen time',      points_cost:100, icon:'🎮' },
  { id:'r2', title:"Choose Friday dinner",   points_cost:150, icon:'🍕' },
  { id:'r3', title:"Sleepover at friend's",  points_cost:200, icon:'🏨' },
  { id:'r4', title:'Family outing of choice',points_cost:500, icon:'🎡' },
];

const DUMMY_APPROVALS: Approval[] = [
  { id:'a1', member:'Sarah', avatar:'🦁', job:'Swept the kitchen',  pts:15, minsAgo:10, type:'job' },
  { id:'a2', member:'Jack',  avatar:'🐯', job:'Made his bed',       pts:5,  minsAgo:60, type:'job' },
  { id:'a3', member:'Jack',  avatar:'🐯', job:'Extra screen time',  pts:100,minsAgo:5,  type:'reward' },
];

// ── ADD REWARD MODAL ──────────────────────────────────────────────────
function AddRewardModal({ visible, onClose, onSaved }:
  { visible:boolean; onClose:()=>void; onSaved:()=>void }) {
  const [title, setTitle] = useState('');
  const [cost,  setCost]  = useState('100');
  const [icon,  setIcon]  = useState('🎁');
  const ICONS = ['🎮','🍕','🎡','🏨','🍦','🎬','📱','🎯','🚴','🎸','🧸','🎁'];

  const save = async () => {
    if (!title.trim()) return;
    await supabase.from('rewards').insert({
      family_id: DUMMY_FAMILY_ID, title: title.trim(),
      points_cost: parseInt(cost)||100, icon,
    });
    setTitle(''); setCost('100'); setIcon('🎁');
    onSaved(); onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
        <View style={s.modalHdr}>
          <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={s.modalTitle}>New Reward</Text>
          <TouchableOpacity onPress={save} disabled={!title.trim()}>
            <Text style={[s.modalSave, !title.trim() && { opacity:0.35 }]}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ padding:22 }} keyboardShouldPersistTaps="handled">
          <Text style={s.fieldLbl}>Reward title</Text>
          <TextInput style={s.input} value={title} onChangeText={setTitle}
            placeholder="e.g. Choose Friday dinner" placeholderTextColor={C.text3} autoFocus />
          <Text style={s.fieldLbl}>Points cost</Text>
          <TextInput style={s.input} value={cost} onChangeText={setCost}
            keyboardType="number-pad" placeholder="100" placeholderTextColor={C.text3} />
          <Text style={s.fieldLbl}>Icon</Text>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
            {ICONS.map(ic => (
              <TouchableOpacity key={ic}
                style={[s.iconBtn, icon===ic && { backgroundColor:C.yellowL, borderColor:C.yellowB }]}
                onPress={() => setIcon(ic)}>
                <Text style={{ fontSize:22 }}>{ic}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── JOBS & REWARDS MANAGEMENT SCREEN ─────────────────────────────────
function JobsRewardsScreen({ onBack }: { onBack:()=>void }) {
  const [tab,      setTab]      = useState<JRTab>('jobs');
  const [jobs,     setJobs]     = useState<Job[]>(DUMMY_JOBS);
  const [rewards,  setRewards]  = useState<Reward[]>(DUMMY_REWARDS);
  const [approvals,setApprovals]= useState<Approval[]>(DUMMY_APPROVALS);
  const [addRwVis, setAddRwVis] = useState(false);

  const pendingJobs    = approvals.filter(a => a.type === 'job');
  const pendingRewards = approvals.filter(a => a.type === 'reward');
  const pendingCount   = approvals.length;

  const approve = (id:string) => setApprovals(p => p.filter(a => a.id !== id));
  const decline = (id:string) => {
    Alert.alert('Decline?', 'Points will not be awarded.', [
      { text:'Cancel', style:'cancel' },
      { text:'Decline', style:'destructive', onPress:() => setApprovals(p => p.filter(a => a.id !== id)) },
    ]);
  };

  const AssignAvatars = ({ assigned }:{ assigned?:string }) => {
    if (!assigned || assigned === 'both') return (
      <View style={{ flexDirection:'row', gap:4 }}>
        <View style={[s.assignAv, { backgroundColor:C.greenL }]}><Text style={{ fontSize:11 }}>🦁</Text></View>
        <View style={[s.assignAv, { backgroundColor:C.orangeL }]}><Text style={{ fontSize:11 }}>🐯</Text></View>
      </View>
    );
    if (assigned === 'sarah') return <View style={[s.assignAv, { backgroundColor:C.greenL }]}><Text style={{ fontSize:11 }}>🦁</Text></View>;
    return <View style={[s.assignAv, { backgroundColor:C.orangeL }]}><Text style={{ fontSize:11 }}>🐯</Text></View>;
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" />

      <AddRewardModal visible={addRwVis} onClose={() => setAddRwVis(false)} onSaved={() => {}} />

      {/* Header */}
      <View style={s.subScreenHdr}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backBtnTxt}>‹ More</Text>
        </TouchableOpacity>
        <View style={{ flex:1 }}>
          <Text style={s.subScreenTitle}>Jobs & Rewards</Text>
          <Text style={s.subScreenSub}>Manage, assign and approve</Text>
        </View>
        <TouchableOpacity style={s.newBtn} onPress={() => tab==='rewards' ? setAddRwVis(true) : null}>
          <Text style={s.newBtnTxt}>+ {tab === 'jobs' ? 'Job' : 'Reward'}</Text>
        </TouchableOpacity>
      </View>

      {/* Toggle */}
      <View style={s.jrToggle}>
        <TouchableOpacity style={[s.jrBtn, tab==='jobs' && { backgroundColor:C.dark }]} onPress={() => setTab('jobs')}>
          <Text style={[s.jrBtnTxt, tab==='jobs' && { color:'#fff' }]}>💼 Jobs{pendingJobs.length > 0 ? ` · ${pendingJobs.length}` : ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.jrBtn, tab==='rewards' && { backgroundColor:C.dark }]} onPress={() => setTab('rewards')}>
          <Text style={[s.jrBtnTxt, tab==='rewards' && { color:'#fff' }]}>🎁 Rewards{pendingRewards.length > 0 ? ` · ${pendingRewards.length}` : ''}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:60 }}>

        {/* ── JOBS TAB ── */}
        {tab === 'jobs' && (
          <>
            {/* Approval queue */}
            {pendingJobs.length > 0 && (
              <View style={s.approvalBox}>
                <View style={s.approvalBoxHdr}>
                  <Text style={{ fontSize:14 }}>⏳</Text>
                  <Text style={s.approvalBoxTitle}>{pendingJobs.length} JOB{pendingJobs.length!==1?'S':''} NEED APPROVAL</Text>
                </View>
                {pendingJobs.map((a, i) => (
                  <View key={a.id} style={[s.approvalRow, i===pendingJobs.length-1 && { borderBottomWidth:0 }]}>
                    <Text style={{ fontSize:22, flexShrink:0 }}>{a.avatar}</Text>
                    <View style={{ flex:1 }}>
                      <Text style={s.approvalName}>{a.member} · {a.job}</Text>
                      <Text style={s.approvalMeta}>{a.minsAgo < 60 ? `${a.minsAgo} min ago` : `${Math.round(a.minsAgo/60)}h ago`} · ⭐ {a.pts} pts</Text>
                    </View>
                    <TouchableOpacity style={s.apYes} onPress={() => approve(a.id)}><Text style={{ fontSize:16 }}>✓</Text></TouchableOpacity>
                    <TouchableOpacity style={s.apNo}  onPress={() => decline(a.id)}><Text style={{ fontSize:14 }}>✕</Text></TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={s.sectionLbl}>All Jobs</Text>
            {jobs.map(job => (
              <View key={job.id} style={s.manageCard}>
                <View style={[s.manageIcon, { backgroundColor: C.greenL }]}>
                  <Text style={{ fontSize:20 }}>{job.icon}</Text>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={s.manageTitle}>{job.title}</Text>
                  <Text style={s.manageMeta}>{job.frequency}</Text>
                  <AssignAvatars assigned={job.assigned_to} />
                </View>
                <View style={[s.ptsBadge, { backgroundColor:C.yellowL }]}>
                  <Text style={[s.ptsBadgeTxt, { color:C.yellowD }]}>⭐ {job.points}</Text>
                </View>
              </View>
            ))}

            {/* Add job shortcut */}
            <TouchableOpacity style={s.addCardBtn}>
              <Text style={s.addCardBtnTxt}>+ Create a new job</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── REWARDS TAB ── */}
        {tab === 'rewards' && (
          <>
            {/* Pending redemptions */}
            {pendingRewards.length > 0 && (
              <View style={[s.approvalBox, { borderColor:C.yellowB, backgroundColor:C.yellowL }]}>
                <View style={s.approvalBoxHdr}>
                  <Text style={{ fontSize:14 }}>🎁</Text>
                  <Text style={[s.approvalBoxTitle, { color:C.yellowD }]}>{pendingRewards.length} REWARD{pendingRewards.length!==1?'S':''} CLAIMED</Text>
                </View>
                {pendingRewards.map((a, i) => (
                  <View key={a.id} style={[s.approvalRow, { borderColor:C.yellowB }, i===pendingRewards.length-1 && { borderBottomWidth:0 }]}>
                    <Text style={{ fontSize:22, flexShrink:0 }}>{a.avatar}</Text>
                    <View style={{ flex:1 }}>
                      <Text style={s.approvalName}>{a.member} wants {a.job}</Text>
                      <Text style={s.approvalMeta}>Costs ⭐ {a.pts} pts · {a.minsAgo} min ago</Text>
                    </View>
                    <TouchableOpacity style={s.apYes} onPress={() => approve(a.id)}><Text style={{ fontSize:16 }}>✓</Text></TouchableOpacity>
                    <TouchableOpacity style={s.apNo}  onPress={() => decline(a.id)}><Text style={{ fontSize:14 }}>✕</Text></TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={s.sectionLbl}>All Rewards</Text>
            {rewards.map(reward => (
              <View key={reward.id} style={s.manageCard}>
                <View style={[s.manageIcon, { backgroundColor:C.yellowL }]}>
                  <Text style={{ fontSize:20 }}>{reward.icon}</Text>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={s.manageTitle}>{reward.title}</Text>
                  <Text style={[s.manageMeta, { color:C.yellowD }]}>⭐ {reward.points_cost} points to claim</Text>
                </View>
                <TouchableOpacity style={s.editBtn}>
                  <Text style={s.editBtnTxt}>Edit</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={s.addCardBtn} onPress={() => setAddRwVis(true)}>
              <Text style={s.addCardBtnTxt}>+ Create a new reward</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── FAMILY SCREEN ─────────────────────────────────────────────────────
function FamilyScreen({ onBack }: { onBack:()=>void }) {
  const deviceBadge = (role?:string, name?:string) => {
    if (name === 'Mum') return { label:'📱 This device', bg:C.blueL, color:C.blue };
    if (role === 'parent') return { label:'📱 Own device', bg:C.greenL, color:C.green };
    return { label:'No device · uses parent phone', bg:C.card2, color:C.text3 };
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" />
      <View style={s.subScreenHdr}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backBtnTxt}>‹ More</Text></TouchableOpacity>
        <View style={{ flex:1 }}>
          <Text style={s.subScreenTitle}>Our Family</Text>
          <Text style={s.subScreenSub}>Members & device access</Text>
        </View>
        <TouchableOpacity style={s.newBtn}><Text style={s.newBtnTxt}>+ Add</Text></TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:60 }}>
        <Text style={s.sectionLbl}>Parents</Text>
        {DUMMY_MEMBERS.filter(m => m.role === 'parent').map(m => {
          const badge = deviceBadge(m.role, m.name);
          return (
            <TouchableOpacity key={m.id} style={s.famCard} activeOpacity={0.8}>
              <View style={[s.famAv, { backgroundColor: m.colour + '18' }]}>
                <Text style={{ fontSize:24 }}>{m.avatar_emoji}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={s.famName}>{m.name}</Text>
                <Text style={s.famRole}>Parent · Admin</Text>
                <View style={[s.famDevBadge, { backgroundColor:badge.bg }]}>
                  <Text style={[s.famDevBadgeTxt, { color:badge.color }]}>{badge.label}</Text>
                </View>
              </View>
              <Text style={{ fontSize:20, color:C.text3 }}>›</Text>
            </TouchableOpacity>
          );
        })}

        <Text style={s.sectionLbl}>Kids</Text>
        {DUMMY_MEMBERS.filter(m => m.role === 'child' || !m.role?.includes('parent')).map(m => {
          const badge = deviceBadge(m.role, m.name);
          return (
            <TouchableOpacity key={m.id} style={s.famCard} activeOpacity={0.8}>
              <View style={[s.famAv, { backgroundColor: m.colour + '18' }]}>
                <Text style={{ fontSize:24 }}>{m.avatar_emoji}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={s.famName}>{m.name}</Text>
                <Text style={s.famRole}>Child · Year {m.name==='Sarah'?'5':'3'}</Text>
                <View style={[s.famDevBadge, { backgroundColor:badge.bg }]}>
                  <Text style={[s.famDevBadgeTxt, { color:badge.color }]}>{badge.label}</Text>
                </View>
              </View>
              <Text style={{ fontSize:20, color:C.text3 }}>›</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={[s.addCardBtn, { marginTop:8 }]}>
          <Text style={s.addCardBtnTxt}>+ Add a family member</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════
// TO-DO SCREEN
// ══════════════════════════════════════════════════════════════════════
type Todo = {
  id:string; title:string; context:string; priority:'high'|'normal'|'low';
  status:'active'|'done'|'snoozed'; due_date?:string; show_in_brief:boolean; pinned:boolean;
};

const CTX_CONFIG: Record<string,{label:string;bg:string;color:string;emoji:string}> = {
  home:     { label:'Home',     bg:C.tealL,    color:C.teal,    emoji:'🏠' },
  school:   { label:'School',   bg:C.blueL,    color:C.blue,    emoji:'🏫' },
  health:   { label:'Health',   bg:C.greenL,   color:C.green,   emoji:'💚' },
  family:   { label:'Family',   bg:C.orangeL,  color:C.orange,  emoji:'👨‍👩‍👧' },
  personal: { label:'Personal', bg:C.purpleL,  color:C.purple,  emoji:'👤' },
  work:     { label:'Work',     bg:C.magentaL, color:C.magenta, emoji:'💼' },
};

const DUMMY_TODOS: Todo[] = [
  { id:'t1', title:'Call school about excursion permission slip', context:'school',   priority:'high',   status:'active', due_date:'tomorrow', show_in_brief:true,  pinned:true  },
  { id:'t2', title:"Order Sarah's birthday present",             context:'personal', priority:'high',   status:'active', due_date:'3 days',   show_in_brief:true,  pinned:true  },
  { id:'t3', title:'Register Jack for soccer season',            context:'family',   priority:'high',   status:'active', due_date:'5 days',   show_in_brief:true,  pinned:false },
  { id:'t4', title:'Book dentist for Sarah and Jack',            context:'health',   priority:'normal', status:'active', due_date:'2 weeks',  show_in_brief:false, pinned:false },
  { id:'t5', title:'Fix back fence before summer',               context:'home',     priority:'normal', status:'active', due_date:undefined,  show_in_brief:false, pinned:false },
  { id:'t6', title:'Renew car registration',                     context:'personal', priority:'normal', status:'done',   due_date:undefined,  show_in_brief:false, pinned:false },
];

function AddTodoModal({ visible, onClose, onAdd }:
  { visible:boolean; onClose:()=>void; onAdd:(t:Todo)=>void }) {
  const [title,   setTitle]   = useState('');
  const [context, setContext] = useState('personal');
  const [priority,setPriority]= useState<'high'|'normal'|'low'>('normal');
  const [dueDate, setDueDate] = useState('');
  const [brief,   setBrief]   = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    const newTodo: Todo = {
      id: Date.now().toString(), title:title.trim(), context, priority,
      status:'active', due_date:dueDate||undefined, show_in_brief:brief, pinned:false,
    };
    await supabase.from('todos').insert({
      family_id:DUMMY_FAMILY_ID, title:newTodo.title, context, priority,
      status:'active', due_date:dueDate||null, show_in_brief:brief,
    });
    onAdd(newTodo);
    setTitle(''); setContext('personal'); setPriority('normal'); setDueDate(''); setBrief(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
        <View style={s.modalHdr}>
          <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={s.modalTitle}>New To-Do</Text>
          <TouchableOpacity onPress={save} disabled={!title.trim()}>
            <Text style={[s.modalSave, { color:C.blue }, !title.trim()&&{opacity:0.35}]}>Add</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{padding:22}} keyboardShouldPersistTaps="handled">
          <Text style={s.fieldLbl}>What needs doing?</Text>
          <TextInput style={s.input} value={title} onChangeText={setTitle}
            placeholder="e.g. Call school about excursion" placeholderTextColor={C.text3}
            multiline autoFocus />

          <Text style={s.fieldLbl}>Context</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:20}}>
            {Object.entries(CTX_CONFIG).map(([k,v]) => (
              <TouchableOpacity key={k}
                style={[s.ctxChip, context===k && {backgroundColor:v.bg,borderColor:v.color}]}
                onPress={() => setContext(k)}>
                <Text style={[s.ctxChipTxt, context===k && {color:v.color}]}>{v.emoji} {v.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.fieldLbl}>Priority</Text>
          <View style={{flexDirection:'row',gap:8,marginBottom:20}}>
            {(['high','normal','low'] as const).map(p => (
              <TouchableOpacity key={p}
                style={[s.ctxChip, priority===p && {
                  backgroundColor: p==='high'?C.redL:p==='normal'?C.blueL:C.greenL,
                  borderColor:     p==='high'?C.red :p==='normal'?C.blue :C.green,
                }]}
                onPress={() => setPriority(p)}>
                <Text style={[s.ctxChipTxt, priority===p && {
                  color: p==='high'?C.red:p==='normal'?C.blue:C.green
                }]}>{p==='high'?'🔴 High':p==='normal'?'🔵 Normal':'🟢 Low'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.fieldLbl}>Due date (optional)</Text>
          <TextInput style={[s.input,{marginBottom:16}]} value={dueDate} onChangeText={setDueDate}
            placeholder="e.g. tomorrow, Friday, 20 March" placeholderTextColor={C.text3} />

          <TouchableOpacity style={[s.briefToggle, brief && s.briefToggleOn]} onPress={() => setBrief(b=>!b)}>
            <Text style={{fontSize:16}}>{brief ? '✅' : '⬜'}</Text>
            <View style={{flex:1}}>
              <Text style={s.briefToggleTxt}>Show in daily brief</Text>
              <Text style={s.briefToggleSub}>Zaeli will mention this in your morning summary</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function TodoScreen({ onBack }: { onBack:()=>void }) {
  const [todos,      setTodos]      = useState<Todo[]>(DUMMY_TODOS);
  const [filter,     setFilter]     = useState<string>('all');
  const [addVisible, setAddVisible] = useState(false);
  const [aiInsight,  setAiInsight]  = useState('');
  const [aiLoading,  setAiLoading]  = useState(false);

  useEffect(() => { loadTodos(); generateAiInsight(); }, []);

  const loadTodos = async () => {
    const { data } = await supabase.from('todos').select('*')
      .eq('family_id', DUMMY_FAMILY_ID).order('created_at', { ascending:false });
    if (data && data.length > 0) setTodos(data as Todo[]);
  };

  const generateAiInsight = async () => {
    setAiLoading(true);
    try {
      const urgent = DUMMY_TODOS.filter(t => t.priority==='high' && t.status==='active');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'x-api-key':process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY||'', 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:120,
          system:`You are Zaeli, a warm family assistant. Today is ${new Date().toDateString()}. The user has these urgent to-dos: ${urgent.map(t=>`"${t.title}" (due: ${t.due_date||'no date'})`).join(', ')}. Write ONE short warm sentence (max 20 words) highlighting the single most important thing to do today. No intro phrases.`,
          messages:[{role:'user',content:'What should I focus on?'}],
        }),
      });
      const data = await res.json();
      setAiInsight(data.content?.[0]?.text || '');
    } catch { setAiInsight('You have 3 urgent items — the school call is most time-sensitive.'); }
    setAiLoading(false);
  };

  const toggleDone = async (todo: Todo) => {
    const newStatus = todo.status === 'done' ? 'active' : 'done';
    setTodos(p => p.map(t => t.id===todo.id ? {...t,status:newStatus} : t));
    await supabase.from('todos').update({status:newStatus}).eq('id',todo.id);
  };

  const deleteTodo = (id:string) => {
    Alert.alert('Remove?','',[ {text:'Cancel',style:'cancel'}, {text:'Remove',style:'destructive',onPress:async()=>{
      setTodos(p=>p.filter(t=>t.id!==id));
      await supabase.from('todos').delete().eq('id',id);
    }}]);
  };

  const addTodo = (t:Todo) => setTodos(p => [t,...p]);

  const pinned  = todos.filter(t => t.pinned && t.status==='active');
  const active  = todos.filter(t => !t.pinned && t.status==='active' && (filter==='all' || t.context===filter));
  const done    = todos.filter(t => t.status==='done');

  const dueColour = (due?:string) => {
    if (!due) return C.text3;
    if (due.includes('tomorrow') || due.includes('1 day')) return C.orange;
    if (due.includes('today') || due.includes('overdue')) return C.red;
    return C.text3;
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" />
      <AddTodoModal visible={addVisible} onClose={() => setAddVisible(false)} onAdd={addTodo} />

      <View style={s.subScreenHdr}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backBtnTxt}>‹ More</Text></TouchableOpacity>
        <View style={{flex:1}}>
          <Text style={s.subScreenTitle}>To-Do</Text>
          <Text style={s.subScreenSub}>{todos.filter(t=>t.status==='active').length} things need attention</Text>
        </View>
        <TouchableOpacity style={[s.newBtn,{backgroundColor:C.blue}]} onPress={() => setAddVisible(true)}>
          <Text style={s.newBtnTxt}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:60}}>

        {/* AI Focus Bar */}
        <View style={s.aiFocusBar}>
          <View style={[s.aiFocusOrb,{backgroundColor:C.blue}]}><Text style={{fontSize:14}}>✦</Text></View>
          <View style={{flex:1}}>
            <Text style={s.aiFocusTitle}>ZAELI · TODAY'S FOCUS</Text>
            {aiLoading
              ? <ActivityIndicator size="small" color={C.blue} style={{alignSelf:'flex-start',marginTop:4}} />
              : <Text style={s.aiFocusTxt}>{aiInsight || 'Checking your to-dos…'}</Text>
            }
          </View>
          <TouchableOpacity onPress={generateAiInsight} style={s.aiFocusRefresh}>
            <Text style={{fontSize:16}}>↻</Text>
          </TouchableOpacity>
        </View>

        {/* Pinned */}
        {pinned.length > 0 && (
          <>
            <Text style={s.sectionLbl}>📌 Pinned</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{paddingHorizontal:16,gap:10,paddingBottom:4}} style={{flexGrow:0}}>
              {pinned.map(t => {
                const ctx = CTX_CONFIG[t.context] || CTX_CONFIG.personal;
                return (
                  <TouchableOpacity key={t.id} style={[s.pinnedCard,{backgroundColor:t.priority==='high'?C.red:C.blue}]}
                    onPress={() => toggleDone(t)}>
                    <Text style={s.pinnedTitle} numberOfLines={2}>{t.title}</Text>
                    {t.due_date && <Text style={s.pinnedDue}>{t.due_date==='tomorrow'?'⚠️ Due tomorrow':`⏰ ${t.due_date}`}</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Context filter strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal:16,paddingVertical:10,gap:6}} style={{flexGrow:0}}>
          <TouchableOpacity style={[s.ctxFilter, filter==='all' && {backgroundColor:C.blue,borderColor:C.blue}]}
            onPress={() => setFilter('all')}>
            <Text style={[s.ctxFilterTxt, filter==='all' && {color:'#fff'}]}>All</Text>
          </TouchableOpacity>
          {Object.entries(CTX_CONFIG).map(([k,v]) => (
            <TouchableOpacity key={k} style={[s.ctxFilter, filter===k && {backgroundColor:v.bg,borderColor:v.color}]}
              onPress={() => setFilter(k)}>
              <Text style={[s.ctxFilterTxt, filter===k && {color:v.color}]}>{v.emoji} {v.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Active todos */}
        {active.map(todo => {
          const ctx = CTX_CONFIG[todo.context] || CTX_CONFIG.personal;
          return (
            <SwipeToDelete key={todo.id} onDelete={() => deleteTodo(todo.id)}
              accentColour={C.blue} deleteLabel="Delete" deleteEmoji="✓ Done?"
              style={{marginHorizontal:16, marginBottom:8}}>
              <TouchableOpacity style={[s.todoCard, todo.priority==='high' && s.todoCardUrgent,
                {marginHorizontal:0, marginBottom:0}]}
                onPress={() => toggleDone(todo)} activeOpacity={0.8}>
                <View style={s.todoCheckWrap}>
                  <View style={s.todoCheck} />
                </View>
                <View style={{flex:1}}>
                  <Text style={s.todoTitle}>{todo.title}</Text>
                  <View style={{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap',marginTop:5}}>
                    <View style={[s.ctxBadge,{backgroundColor:ctx.bg}]}>
                      <Text style={[s.ctxBadgeTxt,{color:ctx.color}]}>{ctx.emoji} {ctx.label}</Text>
                    </View>
                    {todo.due_date && (
                      <Text style={[s.todoDue,{color:dueColour(todo.due_date)}]}>
                        {todo.due_date==='tomorrow'?'⚠️ Tomorrow':todo.due_date==='3 days'?'🎂 3 days':`📅 ${todo.due_date}`}
                      </Text>
                    )}
                    {todo.show_in_brief && (
                      <View style={[s.ctxBadge,{backgroundColor:C.blueL}]}>
                        <Text style={[s.ctxBadgeTxt,{color:C.blue}]}>✦ In brief</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={{alignItems:'flex-end',gap:5,flexShrink:0}}>
                  <View style={[s.priDot, {backgroundColor:todo.priority==='high'?C.red:todo.priority==='normal'?C.border:C.green}]} />
                </View>
              </TouchableOpacity>
            </SwipeToDelete>
          );
        })}

        {active.length === 0 && filter !== 'all' && (
          <Text style={s.emptyTxt}>No {CTX_CONFIG[filter]?.label} to-dos</Text>
        )}

        {/* Done section */}
        {done.length > 0 && (
          <>
            <View style={s.doneDivider}>
              <View style={{flex:1,height:1.5,backgroundColor:C.border}} />
              <Text style={s.doneDividerTxt}>Done</Text>
              <View style={{flex:1,height:1.5,backgroundColor:C.border}} />
            </View>
            {done.map(todo => (
              <SwipeToDelete key={todo.id} onDelete={() => deleteTodo(todo.id)}
                accentColour={C.red} deleteLabel="Remove" deleteEmoji="🗑️"
                style={{marginHorizontal:16, marginBottom:8}}>
                <TouchableOpacity style={[s.todoCard,{opacity:0.5,marginHorizontal:0,marginBottom:0}]}
                  onPress={() => toggleDone(todo)} activeOpacity={0.75}>
                  <View style={s.todoCheckWrap}>
                    <View style={[s.todoCheck,{backgroundColor:C.blue,borderColor:C.blue}]}>
                      <Text style={{color:'#fff',fontSize:13,fontWeight:'700'}}>✓</Text>
                    </View>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={[s.todoTitle,{textDecorationLine:'line-through',color:C.text3,fontWeight:'400'}]}>{todo.title}</Text>
                  </View>
                </TouchableOpacity>
              </SwipeToDelete>
            ))}
            <TouchableOpacity style={s.clearDoneBtn} onPress={() => setTodos(p=>p.filter(t=>t.status!=='done'))}>
              <Text style={s.clearDoneBtnTxt}>Clear completed</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════
// NOTES SCREEN
// ══════════════════════════════════════════════════════════════════════
type NoteItem = {
  id:string; title?:string; body:string; linked_type?:string;
  linked_label?:string; linked_colour?:string; colour:string; pinned:boolean; created_at:string;
};

const NOTE_COLOURS = ['#FFFFFF','#FFF9DB','#EBF5FF','#F0FFF4','#FFF0F6','#F5F0FF'];

const DUMMY_NOTES: NoteItem[] = [
  { id:'n1', title:"Sarah — Teacher Notes", body:"Ms Johnson, Room 14. Sarah struggles with fractions — extra practice needed. Parent-teacher night: 20 March.", colour:'#FFF9DB', pinned:true,  created_at:'Today' },
  { id:'n2', title:undefined,               body:"Jack's Medicare number saved in wallet. Dr Patel 07 3123 4567. Allergy: penicillin.", colour:'#EBF5FF', pinned:true,  created_at:'Today' },
  { id:'n3', body:"Bring shin guards + water bottle. Coach said next session runs 30 min longer.", colour:'#FFFFFF', pinned:false, created_at:'Yesterday', linked_type:'event',  linked_label:'Soccer training · Today 3pm',  linked_colour:C.magenta },
  { id:'n4', body:"Kids prefer less garlic. Double the cheese. Use the small baking dish.",         colour:'#FFFFFF', pinned:false, created_at:'2 days ago', linked_type:'meal',   linked_label:'Pasta Bake · Tuesday dinner',  linked_colour:C.orange  },
  { id:'n5', body:"Buy the A2 brand from Woolies — kids much prefer it.",                          colour:'#FFFFFF', pinned:false, created_at:'3 days ago', linked_type:'shopping',linked_label:'Whole Milk',                    linked_colour:C.yellowD },
  { id:'n6', body:"Holiday idea — Sunshine Coast hinterland for Easter long weekend. Check Airbnb prices.", colour:'#F0FFF4', pinned:false, created_at:'1 week ago' },
];

const LINK_ICONS: Record<string,string> = { event:'📅', meal:'🍽️', shopping:'🛒', member:'👤', todo:'✅' };

function AddNoteModal({ visible, onClose, onAdd }:
  { visible:boolean; onClose:()=>void; onAdd:(n:NoteItem)=>void }) {
  const [title, setTitle]   = useState('');
  const [body,  setBody]    = useState('');
  const [colour,setColour]  = useState('#FFFFFF');

  const save = async () => {
    if (!body.trim()) return;
    const note: NoteItem = {
      id: Date.now().toString(), title:title.trim()||undefined, body:body.trim(),
      colour, pinned:false, created_at:'Just now',
    };
    await supabase.from('notes').insert({
      family_id:DUMMY_FAMILY_ID, title:title.trim()||null, body:body.trim(),
      linked_type:'standalone', colour,
    });
    onAdd(note);
    setTitle(''); setBody(''); setColour('#FFFFFF');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{flex:1,backgroundColor:colour}}>
        <View style={[s.modalHdr,{backgroundColor:colour,borderBottomColor:C.border}]}>
          <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={s.modalTitle}>New Note</Text>
          <TouchableOpacity onPress={save} disabled={!body.trim()}>
            <Text style={[s.modalSave,{color:C.purple},!body.trim()&&{opacity:0.35}]}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{padding:22}} keyboardShouldPersistTaps="handled">
          <TextInput style={[s.input,{backgroundColor:'rgba(255,255,255,0.6)',fontSize:15,fontWeight:'700',marginBottom:10}]}
            value={title} onChangeText={setTitle} placeholder="Title (optional)"
            placeholderTextColor={C.text3} />
          <TextInput style={[s.input,{backgroundColor:'rgba(255,255,255,0.6)',minHeight:120,textAlignVertical:'top',fontSize:15}]}
            value={body} onChangeText={setBody} placeholder="Write your note…"
            placeholderTextColor={C.text3} multiline autoFocus />
          <Text style={[s.fieldLbl,{marginTop:12}]}>Note colour</Text>
          <View style={{flexDirection:'row',gap:10,marginTop:4}}>
            {NOTE_COLOURS.map(col => (
              <TouchableOpacity key={col} onPress={() => setColour(col)}
                style={{width:34,height:34,borderRadius:11,backgroundColor:col,borderWidth:colour===col?2.5:1.5,borderColor:colour===col?C.purple:C.border}} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function NotesScreen({ onBack }: { onBack:()=>void }) {
  const [notes,      setNotes]      = useState<NoteItem[]>(DUMMY_NOTES);
  const [filter,     setFilter]     = useState<string>('all');
  const [addVisible, setAddVisible] = useState(false);
  const [search,     setSearch]     = useState('');

  useEffect(() => { loadNotes(); }, []);

  const loadNotes = async () => {
    const { data } = await supabase.from('notes').select('*')
      .eq('family_id', DUMMY_FAMILY_ID).order('created_at', { ascending:false });
    if (data && data.length > 0) setNotes(data as NoteItem[]);
  };

  const deleteNote = (id:string) => {
    Alert.alert('Delete note?','',[
      {text:'Cancel',style:'cancel'},
      {text:'Delete',style:'destructive',onPress:async()=>{
        setNotes(p=>p.filter(n=>n.id!==id));
        await supabase.from('notes').delete().eq('id',id);
      }},
    ]);
  };

  const addNote = (n:NoteItem) => setNotes(p=>[n,...p]);

  const FILTER_TABS = [
    {k:'all',l:'All'},
    {k:'standalone',l:'📝 Standalone'},
    {k:'event',l:'📅 Events'},
    {k:'meal',l:'🍽️ Meals'},
    {k:'shopping',l:'🛒 Shopping'},
    {k:'member',l:'👤 Members'},
  ];

  const filtered = notes.filter(n => {
    const matchFilter = filter==='all' || (filter==='standalone'?!n.linked_type:n.linked_type===filter);
    const matchSearch = !search || n.body.toLowerCase().includes(search.toLowerCase()) || n.title?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const pinned   = filtered.filter(n => n.pinned);
  const unpinned = filtered.filter(n => !n.pinned);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" />
      <AddNoteModal visible={addVisible} onClose={() => setAddVisible(false)} onAdd={addNote} />

      <View style={s.subScreenHdr}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backBtnTxt}>‹ More</Text></TouchableOpacity>
        <View style={{flex:1}}>
          <Text style={s.subScreenTitle}>Notes</Text>
          <Text style={s.subScreenSub}>{notes.length} notes</Text>
        </View>
        <TouchableOpacity style={[s.newBtn,{backgroundColor:C.purple}]} onPress={() => setAddVisible(true)}>
          <Text style={s.newBtnTxt}>+ Note</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={{paddingHorizontal:16,paddingBottom:8}}>
        <TextInput style={s.searchBar} value={search} onChangeText={setSearch}
          placeholder="🔍  Search notes…" placeholderTextColor={C.text3} />
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal:16,paddingBottom:10,gap:6}} style={{flexGrow:0}}>
        {FILTER_TABS.map(t => (
          <TouchableOpacity key={t.k}
            style={[s.ctxFilter, filter===t.k && {backgroundColor:C.purpleL,borderColor:C.purple}]}
            onPress={() => setFilter(t.k)}>
            <Text style={[s.ctxFilterTxt, filter===t.k && {color:C.purple}]}>{t.l}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:16,paddingBottom:60,gap:10}}>

        {pinned.length > 0 && (
          <>
            <Text style={[s.sectionLbl,{paddingHorizontal:0,paddingTop:4}]}>📌 Pinned</Text>
            {pinned.map(note => (
              <SwipeToDelete key={note.id} onDelete={() => deleteNote(note.id)}
                accentColour={C.purple} deleteLabel="Delete" deleteEmoji="🗑️">
                <TouchableOpacity style={[s.noteCard,{backgroundColor:note.colour||'#fff'}]} activeOpacity={0.85}>
                  {note.linked_type && (
                    <View style={[s.noteLinkBadge,{borderColor:note.linked_colour+'40',backgroundColor:note.linked_colour+'12'}]}>
                      <Text style={{fontSize:11}}>{LINK_ICONS[note.linked_type]||'🔗'}</Text>
                      <Text style={[s.noteLinkTxt,{color:note.linked_colour}]}>{note.linked_label}</Text>
                    </View>
                  )}
                  {note.title && <Text style={s.noteTitle}>{note.title}</Text>}
                  <Text style={s.noteBody} numberOfLines={4}>{note.body}</Text>
                  <Text style={s.noteDate}>{note.created_at}</Text>
                </TouchableOpacity>
              </SwipeToDelete>
            ))}
          </>
        )}

        {unpinned.length > 0 && (
          <>
            {pinned.length > 0 && <Text style={[s.sectionLbl,{paddingHorizontal:0,paddingTop:4}]}>All Notes</Text>}
            {unpinned.map(note => (
              <SwipeToDelete key={note.id} onDelete={() => deleteNote(note.id)}
                accentColour={C.purple} deleteLabel="Delete" deleteEmoji="🗑️">
                <TouchableOpacity style={[s.noteCard,{backgroundColor:note.colour||'#fff'}]} activeOpacity={0.85}>
                  {note.linked_type && (
                    <View style={[s.noteLinkBadge,{borderColor:(note.linked_colour||C.text3)+'40',backgroundColor:(note.linked_colour||C.text3)+'12'}]}>
                      <Text style={{fontSize:11}}>{LINK_ICONS[note.linked_type]||'🔗'}</Text>
                      <Text style={[s.noteLinkTxt,{color:note.linked_colour||C.text2}]}>{note.linked_label}</Text>
                    </View>
                  )}
                  {note.title && <Text style={s.noteTitle}>{note.title}</Text>}
                  <Text style={s.noteBody} numberOfLines={4}>{note.body}</Text>
                  <Text style={s.noteDate}>{note.created_at}</Text>
                </TouchableOpacity>
              </SwipeToDelete>
            ))}
          </>
        )}

        {filtered.length === 0 && (
          <Text style={[s.emptyTxt,{marginTop:40}]}>
            {search ? 'No notes match your search' : 'No notes yet — tap + Note to add one'}
          </Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN MORE SCREEN — hub
// ══════════════════════════════════════════════════════════════════════
export default function MoreScreen() {
  const [page, setPage] = useState<MorePage>('hub');

  if (page === 'jobs_rewards') return <JobsRewardsScreen onBack={() => setPage('hub')} />;
  if (page === 'family')       return <FamilyScreen      onBack={() => setPage('hub')} />;
  if (page === 'todo')         return <TodoScreen        onBack={() => setPage('hub')} />;
  if (page === 'notes')        return <NotesScreen       onBack={() => setPage('hub')} />;

  type HubTile = { icon:string; label:string; sub:string; bg:string; border:string; badge?:string; badgeCol?:string; badgeBg?:string; page?:MorePage; soon?:boolean };

  const FAMILY_SECTION: HubTile[] = [
    { icon:'👨‍👩‍👧', label:'Our Family',      sub:'Members, devices, profiles', bg:C.yellowL, border:C.yellowB, page:'family' },
    { icon:'💼',    label:'Jobs & Rewards',  sub:'Create, assign and approve', bg:C.greenL,  border:C.greenB,  badge:'3 pending', badgeCol:C.orange, badgeBg:C.orangeL, page:'jobs_rewards' },
  ];

  const TOOLS_SECTION: HubTile[] = [
    { icon:'✅', label:'To-Do',    sub:'Adult tasks with AI reminders',       bg:C.blueL,   border:C.blueB,   badge:'5 active', badgeCol:C.blue,   badgeBg:C.blueL,   page:'todo'  },
    { icon:'📝', label:'Notes',    sub:'Attached to everything + standalone', bg:C.purpleL, border:C.purpleB, badge:'8 notes',  badgeCol:C.purple, badgeBg:C.purpleL, page:'notes' },
    { icon:'🎓', label:'Learning', sub:'Kids tutoring & weekly summary',      bg:C.orangeL, border:C.orangeB, soon:true },
  ];

  const SETTINGS_SECTION: HubTile[] = [
    { icon:'🔔', label:'Notifications', sub:'Reminders and alerts',         bg:C.magentaL, border:'rgba(224,0,124,0.25)' },
    { icon:'⚙️', label:'Settings',      sub:'Account, privacy, theme',      bg:C.darkL,    border:C.border  },
    { icon:'💬', label:'Feedback',      sub:'Help us improve Zaeli',        bg:C.greenL,   border:C.greenB  },
  ];

  const renderSection = (tiles: HubTile[], title: string) => (
    <>
      <Text style={s.sectionLbl}>{title}</Text>
      <View style={s.hubCard}>
        {tiles.map((tile, i) => (
          <React.Fragment key={tile.label}>
            <TouchableOpacity
              style={s.hubRow}
              onPress={() => tile.page && setPage(tile.page)}
              activeOpacity={tile.soon ? 1 : 0.75}
              disabled={tile.soon}>
              <View style={[s.hubIcon, { backgroundColor:tile.bg, borderColor:tile.border }]}>
                <Text style={{ fontSize:24 }}>{tile.icon}</Text>
              </View>
              <View style={s.hubInfo}>
                <Text style={s.hubLabel}>{tile.label}</Text>
                <Text style={s.hubSub}>{tile.sub}</Text>
                {tile.badge && (
                  <View style={[s.hubBadge, { backgroundColor: tile.badgeBg || C.card2 }]}>
                    <Text style={[s.hubBadgeTxt, { color: tile.badgeCol || C.text3 }]}>{tile.badge}</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
                {tile.soon && <View style={s.soonBadge}><Text style={s.soonTxt}>Soon</Text></View>}
                <Text style={s.chevron}>›</Text>
              </View>
            </TouchableOpacity>
            {i < tiles.length - 1 && <View style={s.divider} />}
          </React.Fragment>
        ))}
      </View>
    </>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:60 }}>

        {/* Dark header */}
        <View style={s.moreHero}>
          <View style={s.moreHeroGlow} />
          <Text style={s.moreHeroTitle}>More</Text>
          <Text style={s.moreHeroSub}>Family management & settings</Text>
        </View>

        {/* Activity feed */}
        <Text style={s.sectionLbl}>Recent Activity</Text>
        <View style={s.activityCard}>
          {[
            { av:'🦁', txt:'Sarah completed Make bed', meta:'2 min ago · ⭐ +5 pts', col:C.greenL },
            { av:'🦁', txt:'Sarah answered 8 maths questions', meta:'1 hour ago · ⭐ +40 pts', col:C.purpleL },
            { av:'🐯', txt:'Jack claimed Extra Screen Time', meta:'Needs your approval', col:C.orangeL, urgent:true },
          ].map((a, i, arr) => (
            <View key={i} style={[s.actRow, i===arr.length-1 && { borderBottomWidth:0 }]}>
              <View style={[s.actAv, { backgroundColor: a.col }]}>
                <Text style={{ fontSize:16 }}>{a.av}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={s.actTxt}>{a.txt}</Text>
                <Text style={[s.actMeta, a.urgent && { color:C.orange, fontWeight:'700' }]}>{a.meta}</Text>
              </View>
            </View>
          ))}
        </View>

        {renderSection(FAMILY_SECTION, 'Family')}
        {renderSection(TOOLS_SECTION,  'Tools')}
        {renderSection(SETTINGS_SECTION,'Account')}

        {/* Footer */}
        <View style={s.footer}>
          <View style={s.footerOrb}><Text style={{ fontSize:20 }}>✦</Text></View>
          <Text style={s.footerName}>Zaeli</Text>
          <Text style={s.footerSub}>Family Life Platform · v0.4.0</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex:1, backgroundColor:C.bg },

  // more hero
  moreHero:      { backgroundColor:C.dark, paddingHorizontal:22, paddingTop:20, paddingBottom:22, position:'relative', overflow:'hidden' },
  moreHeroGlow:  { position:'absolute', top:-40, right:-40, width:130, height:130, borderRadius:65, backgroundColor:'rgba(255,255,255,0.04)' },
  moreHeroTitle: { fontFamily:'DMSerifDisplay_400Regular', fontSize:36, color:'#fff', marginBottom:4 },
  moreHeroSub:   { fontSize:13, color:'rgba(255,255,255,0.42)' },

  // section
  sectionLbl: { fontSize:11, fontWeight:'700', color:C.text3, textTransform:'uppercase', letterSpacing:1.5, paddingHorizontal:22, marginTop:20, marginBottom:8, fontFamily:'Poppins_700Bold' },

  // hub card (settings-style list)
  hubCard:    { backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:20, marginHorizontal:16, overflow:'hidden' },
  hubRow:     { flexDirection:'row', alignItems:'center', gap:14, padding:16 },
  hubIcon:    { width:50, height:50, borderRadius:16, borderWidth:1.5, alignItems:'center', justifyContent:'center', flexShrink:0 },
  hubInfo:    { flex:1 },
  hubLabel:   { fontSize:17, fontWeight:'700', color:C.text, fontFamily:'Poppins_700Bold' },
  hubSub:     { fontSize:13, color:C.text2, marginTop:2 },
  hubBadge:   { alignSelf:'flex-start', borderRadius:7, paddingHorizontal:8, paddingVertical:2, marginTop:5 },
  hubBadgeTxt:{ fontSize:11, fontWeight:'700', fontFamily:'Poppins_700Bold' },
  divider:    { height:1.5, backgroundColor:C.border, marginLeft:80 },
  soonBadge:  { backgroundColor:C.purpleL, borderRadius:8, paddingHorizontal:9, paddingVertical:3, borderWidth:1, borderColor:C.purpleB },
  soonTxt:    { fontSize:11, fontWeight:'700', color:C.purple, fontFamily:'Poppins_700Bold' },
  chevron:    { fontSize:22, color:C.text3 },

  // activity
  activityCard: { backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:20, marginHorizontal:16, overflow:'hidden' },
  actRow:  { flexDirection:'row', alignItems:'center', gap:12, padding:14, borderBottomWidth:1, borderBottomColor:C.border },
  actAv:   { width:36, height:36, borderRadius:11, alignItems:'center', justifyContent:'center', flexShrink:0 },
  actTxt:  { fontSize:13, fontWeight:'600', color:C.text },
  actMeta: { fontSize:11, color:C.text3, marginTop:2 },

  // sub-screen header
  subScreenHdr:   { flexDirection:'row', alignItems:'center', paddingHorizontal:18, paddingTop:16, paddingBottom:12, gap:10 },
  subScreenTitle: { fontFamily:'DMSerifDisplay_400Regular', fontSize:26, color:C.text },
  subScreenSub:   { fontSize:12, color:C.text3, marginTop:1 },
  backBtn:        { paddingRight:8, paddingVertical:4 },
  backBtnTxt:     { fontSize:17, color:C.blue, fontWeight:'600' },
  newBtn:         { backgroundColor:C.dark, borderRadius:22, paddingHorizontal:14, paddingVertical:9 },
  newBtnTxt:      { fontSize:13, fontWeight:'700', color:'#fff', fontFamily:'Poppins_700Bold' },

  // jobs/rewards toggle
  jrToggle: { flexDirection:'row', marginHorizontal:16, marginBottom:12, backgroundColor:C.card2, borderRadius:14, padding:3 },
  jrBtn:    { flex:1, paddingVertical:11, borderRadius:11, alignItems:'center' },
  jrBtnTxt: { fontSize:13, fontWeight:'700', color:C.text2, fontFamily:'Poppins_700Bold' },

  // approval box
  approvalBox:    { margin:16, marginBottom:8, backgroundColor:C.orangeL, borderWidth:1.5, borderColor:C.orangeB, borderRadius:18, overflow:'hidden' },
  approvalBoxHdr: { flexDirection:'row', alignItems:'center', gap:8, padding:14, paddingBottom:10 },
  approvalBoxTitle:{ fontSize:11, fontWeight:'700', color:C.orange, textTransform:'uppercase', letterSpacing:1, fontFamily:'Poppins_700Bold' },
  approvalRow:    { flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:14, paddingVertical:12, borderBottomWidth:1, borderBottomColor:C.orangeB },
  approvalName:   { fontSize:13, fontWeight:'700', color:C.text },
  approvalMeta:   { fontSize:11, color:C.text2, marginTop:2 },
  apYes: { width:36, height:36, borderRadius:11, backgroundColor:C.green, alignItems:'center', justifyContent:'center' },
  apNo:  { width:36, height:36, borderRadius:11, backgroundColor:C.card,  alignItems:'center', justifyContent:'center', borderWidth:1.5, borderColor:C.border },

  // manage card (jobs + rewards)
  manageCard:  { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:16, padding:14, marginHorizontal:16, marginBottom:8 },
  manageIcon:  { width:42, height:42, borderRadius:13, alignItems:'center', justifyContent:'center', flexShrink:0 },
  manageTitle: { fontSize:14, fontWeight:'700', color:C.text },
  manageMeta:  { fontSize:11, color:C.text3, marginTop:2, marginBottom:5 },
  assignAv:    { width:22, height:22, borderRadius:7, alignItems:'center', justifyContent:'center' },
  ptsBadge:    { borderRadius:9, paddingHorizontal:10, paddingVertical:5, flexShrink:0 },
  ptsBadgeTxt: { fontSize:12, fontWeight:'700', fontFamily:'Poppins_700Bold' },
  editBtn:     { backgroundColor:C.card2, borderRadius:10, paddingHorizontal:12, paddingVertical:7, flexShrink:0 },
  editBtnTxt:  { fontSize:12, fontWeight:'700', color:C.text2, fontFamily:'Poppins_700Bold' },

  addCardBtn:  { marginHorizontal:16, marginTop:4, borderWidth:1.5, borderColor:C.border, borderStyle:'dashed' as const, borderRadius:16, padding:16, alignItems:'center' },
  addCardBtnTxt:{ fontSize:14, fontWeight:'700', color:C.text2, fontFamily:'Poppins_700Bold' },

  // family
  famCard:     { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:16, padding:14, marginHorizontal:16, marginBottom:8 },
  famAv:       { width:46, height:46, borderRadius:15, alignItems:'center', justifyContent:'center', flexShrink:0 },
  famName:     { fontSize:15, fontWeight:'700', color:C.text },
  famRole:     { fontSize:11, color:C.text3, marginTop:1 },
  famDevBadge: { borderRadius:7, paddingHorizontal:8, paddingVertical:3, alignSelf:'flex-start', marginTop:4 },
  famDevBadgeTxt:{ fontSize:10, fontWeight:'700', fontFamily:'Poppins_700Bold' },

  // footer
  footer:     { alignItems:'center', paddingTop:16, paddingBottom:20, gap:8 },
  footerOrb:  { width:52, height:52, borderRadius:16, backgroundColor:C.yellowL, borderWidth:1.5, borderColor:C.yellowB, alignItems:'center', justifyContent:'center' },
  footerName: { fontFamily:'DMSerifDisplay_400Regular', fontSize:22, color:C.text },
  footerSub:  { fontSize:13, color:C.text3 },

  // modals
  modalHdr:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:18, borderBottomWidth:1.5, borderBottomColor:C.border, backgroundColor:C.card },
  modalTitle:  { fontSize:17, fontWeight:'700', color:C.text, fontFamily:'Poppins_700Bold' },
  modalCancel: { fontSize:16, color:C.text2 },
  modalSave:   { fontSize:17, fontWeight:'700', color:C.green, fontFamily:'Poppins_700Bold' },
  fieldLbl:    { fontSize:12, fontWeight:'700', color:C.text2, marginBottom:8, textTransform:'uppercase', letterSpacing:0.8, marginTop:4, fontFamily:'Poppins_700Bold' },
  input:       { backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:14, padding:16, fontSize:17, color:C.text, marginBottom:20 },
  iconBtn:     { width:48, height:48, borderRadius:14, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, alignItems:'center', justifyContent:'center' },

  // ── TO-DO ──────────────────────────────────────────────────────────
  aiFocusBar:     { flexDirection:'row', alignItems:'flex-start', gap:12, marginHorizontal:16, marginBottom:4, backgroundColor:C.blueL, borderWidth:1.5, borderColor:C.blueB, borderRadius:18, padding:14 },
  aiFocusOrb:     { width:32, height:32, borderRadius:10, alignItems:'center', justifyContent:'center', flexShrink:0 },
  aiFocusTitle:   { fontSize:9, fontWeight:'700', color:C.blue, textTransform:'uppercase', letterSpacing:1.2, marginBottom:4, fontFamily:'Poppins_700Bold' },
  aiFocusTxt:     { fontSize:13, color:'#1a3a6b', lineHeight:19 },
  aiFocusRefresh: { paddingLeft:6, paddingTop:2 },

  pinnedCard:   { width:190, borderRadius:18, padding:16, gap:6 },
  pinnedTitle:  { fontSize:14, fontWeight:'700', color:'#fff', lineHeight:20 },
  pinnedDue:    { fontSize:12, color:'rgba(255,255,255,0.78)', fontWeight:'600' },

  ctxFilter:    { paddingHorizontal:14, paddingVertical:7, borderRadius:22, borderWidth:1.5, borderColor:C.border, backgroundColor:C.card },
  ctxFilterTxt: { fontSize:12, fontWeight:'700', color:C.text2, fontFamily:'Poppins_700Bold' },

  todoCard:       { flexDirection:'row', alignItems:'flex-start', gap:12, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:16, padding:14, marginHorizontal:16, marginBottom:8 },
  todoCardUrgent: { borderColor:'rgba(255,59,59,0.22)', backgroundColor:'rgba(255,59,59,0.03)' },
  todoCheckWrap:  { paddingTop:2 },
  todoCheck:      { width:22, height:22, borderRadius:7, borderWidth:2, borderColor:C.border, alignItems:'center', justifyContent:'center' },
  todoTitle:      { fontSize:15, fontWeight:'600', color:C.text, lineHeight:21 },
  todoDue:        { fontSize:11, fontWeight:'700', fontFamily:'Poppins_700Bold' },
  priDot:         { width:8, height:8, borderRadius:4, marginTop:6 },

  ctxBadge:     { borderRadius:7, paddingHorizontal:8, paddingVertical:3 },
  ctxBadgeTxt:  { fontSize:11, fontWeight:'700', fontFamily:'Poppins_700Bold' },
  ctxChip:      { paddingHorizontal:14, paddingVertical:8, borderRadius:22, borderWidth:1.5, borderColor:C.border, backgroundColor:C.card },
  ctxChipTxt:   { fontSize:13, fontWeight:'700', color:C.text2, fontFamily:'Poppins_700Bold' },

  briefToggle:    { flexDirection:'row', alignItems:'flex-start', gap:12, backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:16, padding:14 },
  briefToggleOn:  { backgroundColor:C.blueL, borderColor:C.blueB },
  briefToggleTxt: { fontSize:14, fontWeight:'700', color:C.text, fontFamily:'Poppins_700Bold' },
  briefToggleSub: { fontSize:12, color:C.text3, marginTop:2, lineHeight:17 },

  doneDivider:    { flexDirection:'row', alignItems:'center', gap:12, paddingHorizontal:16, paddingVertical:16 },
  doneDividerTxt: { fontSize:12, fontWeight:'700', color:C.text3, fontFamily:'Poppins_700Bold' },
  clearDoneBtn:   { alignSelf:'center', paddingVertical:10, paddingHorizontal:20, marginBottom:8 },
  clearDoneBtnTxt:{ fontSize:13, fontWeight:'700', color:C.red, fontFamily:'Poppins_700Bold' },

  emptyTxt: { fontSize:15, color:C.text3, textAlign:'center', fontStyle:'italic' },

  // ── NOTES ──────────────────────────────────────────────────────────
  searchBar:      { backgroundColor:C.card, borderWidth:1.5, borderColor:C.border, borderRadius:14, paddingHorizontal:16, paddingVertical:12, fontSize:15, color:C.text },

  noteCard:       { borderRadius:20, padding:16, borderWidth:1.5, borderColor:C.border, gap:6 },
  noteTitle:      { fontSize:15, fontWeight:'700', color:C.text },
  noteBody:       { fontSize:14, color:C.text2, lineHeight:21 },
  noteDate:       { fontSize:11, color:C.text3, marginTop:4 },
  noteLinkBadge:  { flexDirection:'row', alignItems:'center', gap:5, borderWidth:1, borderRadius:8, paddingHorizontal:9, paddingVertical:4, alignSelf:'flex-start' },
  noteLinkTxt:    { fontSize:11, fontWeight:'700', fontFamily:'Poppins_700Bold' },
});
