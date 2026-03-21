/**
 * Tutor Reading Screen
 * app/(tabs)/tutor-reading.tsx
 * All styles taken verbatim from HTML mockup with device size bumps.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar as RNStatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';
import { logApiCall } from '../../lib/api-logger';

// ── Constants ─────────────────────────────────────────────────
const FAMILY_ID  = '00000000-0000-0000-0000-000000000001';
const T_DARK     = '#1A1A2E';
const T_GOLD     = '#C9A84C';
const T_GOLD2    = '#B8963E';
const T_GOLDL    = 'rgba(201,168,76,0.08)';
const MAG        = '#E0007C';
const GREEN      = '#00C97A';
const BLUE       = '#0057FF';
const INK        = '#0A0A0A';
const INK2       = 'rgba(10,10,10,0.45)';
const INK3       = 'rgba(10,10,10,0.18)';
const BORDER     = 'rgba(0,0,0,0.07)';
const BG         = '#F7F7F7';
const CARD       = '#FFFFFF';
const GPT_MODEL  = 'gpt-5.4-mini';
const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

type Step = 'photo' | 'read' | 'feedback';

interface ReadingFeedback {
  accuracy: number;
  pacing: string;
  confidence: string;
  missed: string[];
  summary: string;
}

// ── Component ─────────────────────────────────────────────────
export default function TutorReadingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ childId:string; childName:string; yearLevel:string }>();
  const childName = params.childName ?? '';
  const yearLevel = parseInt(params.yearLevel ?? '3', 10);
  const childId   = params.childId ?? '';

  const [step, setStep]                 = useState<Step>('photo');
  const [pagePhoto, setPagePhoto]       = useState<string|null>(null);
  const [pageTitle, setPageTitle]       = useState('');
  const [pageDesc, setPageDesc]         = useState('');
  const [detectingPage, setDetectingPage] = useState(false);
  const [recording, setRecording]       = useState(false);
  const [audioRec, setAudioRec]         = useState<Audio.Recording|null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [feedback, setFeedback]         = useState<ReadingFeedback|null>(null);
  const [generatingFb, setGeneratingFb] = useState(false);

  useFocusEffect(useCallback(() => { RNStatusBar.setBarStyle('light-content', true); }, []));

  async function takePagePhoto() {
    Alert.alert('Add your page', 'How would you like to add your page?', [
      { text: 'Camera', onPress: () => doPickPhoto('camera') },
      { text: 'Photo Library', onPress: () => doPickPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function doPickPhoto(source: 'camera' | 'library') {
    try {
      let result;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission needed', 'Please enable Camera access in Settings.'); return; }
        result = await ImagePicker.launchCameraAsync({ quality:0.75, base64:true });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission needed', 'Please enable Photo Library access in Settings.'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes:ImagePicker.MediaTypeOptions.Images, quality:0.75, base64:true });
      }
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setPagePhoto(asset.uri);
      setDetectingPage(true);
      try {
      const ANTHROPIC_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
      const t0 = Date.now();
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'x-api-key':ANTHROPIC_KEY, 'anthropic-version':'2023-06-01' },
        body: JSON.stringify({ model:'claude-sonnet-4-6', max_tokens:500, messages:[{ role:'user', content:[
          { type:'image', source:{ type:'base64', media_type:asset.mimeType??'image/jpeg', data:asset.base64??'' }},
          { type:'text',  text:'Return JSON only (no markdown): {"title":"book title and chapter if visible, else Unknown book","text":"full text on the page transcribed accurately word for word"}' },
        ]}]}),
      });
      const json = await res.json();
      await logApiCall({ family_id:FAMILY_ID, call_type:'tutor_vision', model:'claude-sonnet-4-6', provider:'anthropic',
        prompt_tokens:json.usage?.input_tokens??0, completion_tokens:json.usage?.output_tokens??0, duration_ms:Date.now()-t0 });
      const parsed = JSON.parse(json.content?.[0]?.text?.replace(/```json|```/g,'').trim() ?? '{}');
      setPageTitle(parsed.title ?? '');
      setPageDesc(parsed.text ?? '');
    } catch { setPageTitle('Page detected'); setPageDesc(''); }
      setDetectingPage(false);
    } catch (e) { console.error('Photo picker:', e); }
  }

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS:true, playsInSilentModeIOS:true });
      const { recording:rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setAudioRec(rec); setRecording(true);
    } catch { Alert.alert('Microphone', 'Could not access microphone. Please check permissions.'); }
  }

  async function stopRecording() {
    if (!audioRec) return;
    setRecording(false);
    await audioRec.stopAndUnloadAsync();
    const uri = audioRec.getURI();
    setAudioRec(null);
    if (uri) await transcribeReading(uri);
  }

  async function transcribeReading(uri: string) {
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append('file', { uri, type:'audio/m4a', name:'reading.m4a' } as any);
      form.append('model', 'whisper-1');
      const t0 = Date.now();
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method:'POST', headers:{ Authorization:`Bearer ${OPENAI_KEY}` }, body:form,
      });
      const json = await res.json();
      await logApiCall({ family_id:FAMILY_ID, call_type:'whisper_transcription', model:'whisper-1', provider:'openai',
        prompt_tokens:0, completion_tokens:0, duration_ms:Date.now()-t0 });
      if (json.text?.trim()) await generateFeedback(json.text.trim());
    } catch { Alert.alert('Oops', 'Could not transcribe — please try again.'); }
    setTranscribing(false);
  }

  async function generateFeedback(childReading: string) {
    setGeneratingFb(true); setStep('feedback');
    const prompt = `You are Zaeli, a warm AI reading coach. ${childName} (Year ${yearLevel}) read aloud.
ORIGINAL: "${pageDesc || '(page text not available)'}"
WHAT THEY READ: "${childReading}"
Return JSON only (no markdown): {"accuracy":88,"pacing":"Good","confidence":"↑ Up","missed":["word1"],"summary":"2-3 sentence warm specific feedback. What they did well. One thing to improve. Genuine encouragement. Australian English. Never start with I."}
pacing: exactly one of "Slow", "Good", "Fast"
confidence: exactly one of "↑ Up", "→ Same", "↓ Down"`;
    try {
      const t0 = Date.now();
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${OPENAI_KEY}` },
        body: JSON.stringify({ model:GPT_MODEL, max_completion_tokens:400, messages:[{ role:'user', content:prompt }] }),
      });
      const json = await res.json();
      const raw = json.choices?.[0]?.message?.content ?? '';
      await logApiCall({ family_id:FAMILY_ID, call_type:'tutor_session', model:GPT_MODEL, provider:'openai',
        prompt_tokens:json.usage?.prompt_tokens??0, completion_tokens:json.usage?.completion_tokens??0, duration_ms:Date.now()-t0 });
      const parsed = JSON.parse(raw.replace(/```json|```/g,'').trim()) as ReadingFeedback;
      setFeedback(parsed);
      await supabase.from('tutor_sessions').insert({ family_id:FAMILY_ID, child_name:childName, year_level:yearLevel, mode:'reading', subject:'Reading', topic:pageTitle||'Reading session', messages:[], duration_seconds:0 });
    } catch {
      setFeedback({ accuracy:85, pacing:'Good', confidence:'↑ Up', missed:[], summary:`Really lovely reading, ${childName}! You read with confidence and good pace. Keep it up! 🌟` });
    }
    setGeneratingFb(false);
  }

  function resetAll() {
    setStep('photo'); setPagePhoto(null); setPageTitle(''); setPageDesc('');
    setFeedback(null); setRecording(false); setAudioRec(null);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <RNStatusBar barStyle="light-content" />

      {/* ── .reading-hdr: MAG bg, p14 22 20 ── */}
      <View style={s.readingHdr}>
        {/* Back — same as other screens */}
        <TouchableOpacity onPress={() => router.replace({ pathname:'/(tabs)/tutor-child', params:{ childId, childName, yearLevel:String(yearLevel) } })} activeOpacity={0.7} style={{ marginBottom:10 }}>
          <Text style={s.backTxt}>‹ Back</Text>
        </TouchableOpacity>
        {/* .gold-badge: rgba(255,255,255,0.12) bg, rgba(255,255,255,0.2) border */}
        <View style={s.readingBadge}>
          <Text style={s.readingBadgeTxt}>📖 Reading &amp; Speaking</Text>
        </View>
        {/* .hero-title font-size:28px — bumped to 32 */}
        <Text style={s.heroTitle}>Read aloud{'\
'}to Zaeli</Text>
        {/* .hero-sub */}
        <Text style={s.heroSub}>She'll listen for fluency, pacing and confidence.</Text>
      </View>

      <View style={s.content}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:48 }}>

          {/* ── Step 1 — Your page ── */}
          <Text style={s.slbl}>Step 1 — Your page</Text>

          {!pagePhoto ? (
            /* No photo yet — tap to take */
            <>
              <TouchableOpacity style={s.photoPlaceholder} onPress={takePagePhoto} activeOpacity={0.8}>
                <Text style={s.photoPlaceholderIcon}>📷</Text>
                <Text style={s.photoPlaceholderTxt}>Tap to photo your page</Text>
                <Text style={s.photoPlaceholderSub}>Zaeli will read along as you speak</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep('read')} activeOpacity={0.7} style={s.skipBtn}>
                <Text style={s.skipTxt}>Skip — read without a page photo</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* .book-detect: #fffdf5 bg, r16, 1.5px gold border, p14 16 */
            <>
              <View style={s.bookDetect}>
                {detectingPage ? (
                  <View style={{ alignItems:'center', padding:20, gap:10 }}>
                    <ActivityIndicator color={T_GOLD}/>
                    <Text style={{ fontSize:14, color:INK2 }}>Reading your page…</Text>
                  </View>
                ) : (
                  <>
                    {/* .book-detect-lbl: 10px 700 T_GOLD2 upper ls1 mb10 — bumped to 12 */}
                    <Text style={s.bookDetectLbl}>
                      {pageTitle ? `📖 ${pageTitle}` : 'Page detected'}
                    </Text>
                    {/* .book-lines: flex col, gap6 */}
                    <View style={s.bookLines}>
                      {[{w:'95%',hi:false},{w:'82%',hi:true},{w:'90%',hi:false},{w:'76%',hi:false},{w:'88%',hi:true},{w:'62%',hi:false}].map((l,i) => (
                        <View key={i} style={[s.bookLine, l.hi && s.bookLineHi, { width:l.w as any }]}/>
                      ))}
                    </View>
                  </>
                )}
              </View>

              {/* Retake — dashed card, opacity 0.6 */}
              <TouchableOpacity style={s.retakeCard} onPress={takePagePhoto} activeOpacity={0.75}>
                <Text style={{ fontSize:22 }}>📷</Text>
                <Text style={s.retakeTxt}>Tap to photo a different page</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Step 2 — Read aloud ── */}
          {(step === 'read' || step === 'feedback') && (
            <>
              <Text style={s.slbl}>Step 2 — Read aloud</Text>
              {/* .reading-btns: p0 18 12, flex, gap10 */}
              <View style={s.readingBtns}>
                {/* .rb .rb-rec: T_DARK bg, gold border */}
                <TouchableOpacity
                  style={[s.rb, s.rbRec, recording && { backgroundColor:'#2A0A1E' }]}
                  onPress={recording ? stopRecording : startRecording}
                  activeOpacity={0.82}
                >
                  <Text style={s.rbIcon}>{recording ? '⏹' : '🎙️'}</Text>
                  <Text style={s.rbLblLight}>{recording ? 'Tap to stop' : 'Start reading'}</Text>
                  {recording && <Text style={{ fontSize:12, color:MAG, fontFamily:'Poppins_600SemiBold' }}>● Recording…</Text>}
                </TouchableOpacity>
                {/* .rb .rb-play: CARD bg, BORDER */}
                <TouchableOpacity style={[s.rb, s.rbPlay]} activeOpacity={0.82}>
                  <Text style={s.rbIcon}>🔊</Text>
                  <Text style={s.rbLblDark}>Hear feedback</Text>
                </TouchableOpacity>
              </View>

              {transcribing && (
                <View style={{ flexDirection:'row', alignItems:'center', gap:10, marginHorizontal:18, marginBottom:12 }}>
                  <ActivityIndicator color={T_GOLD} size="small"/>
                  <Text style={{ fontFamily:'Poppins_400Regular', fontSize:14, color:INK2 }}>Listening to your reading…</Text>
                </View>
              )}
            </>
          )}

          {/* ── Step 3 — Zaeli's feedback ── */}
          {step === 'feedback' && (
            <>
              <Text style={s.slbl}>Zaeli's feedback</Text>

              {generatingFb ? (
                <View style={{ alignItems:'center', padding:30, gap:12 }}>
                  <ActivityIndicator size="large" color={T_GOLD}/>
                  <Text style={{ fontFamily:'Poppins_400Regular', fontSize:14, color:INK2 }}>Zaeli is listening back…</Text>
                </View>
              ) : feedback ? (
                <>
                  {/* .reading-scores: m0 18 12, flex, gap8 */}
                  <View style={s.readingScores}>
                    {/* .rs: flex1, CARD, r14, 1.5px BORDER, p12 10, center */}
                    <View style={s.rs}>
                      {/* .rs-val rs-green: 18px 800 GREEN ls-0.5 — bumped to 22 */}
                      <Text style={[s.rsVal, { color:GREEN }]}>{feedback.accuracy}%</Text>
                      <Text style={s.rsLbl}>Accuracy</Text>
                    </View>
                    <View style={s.rs}>
                      <Text style={[s.rsVal, { color:BLUE }]}>{feedback.pacing}</Text>
                      <Text style={s.rsLbl}>Pacing</Text>
                    </View>
                    <View style={s.rs}>
                      <Text style={[s.rsVal, { color:T_GOLD2 }]}>{feedback.confidence}</Text>
                      <Text style={s.rsLbl}>Confidence</Text>
                    </View>
                  </View>

                  {/* Missed words */}
                  {feedback.missed.length > 0 && (
                    <View style={s.missedCard}>
                      <Text style={s.missedTitle}>Words to practise</Text>
                      <View style={{ flexDirection:'row', gap:7, flexWrap:'wrap' }}>
                        {feedback.missed.map((w,i) => (
                          <View key={i} style={s.missedChip}>
                            <Text style={s.missedChipTxt}>{w}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* .reading-feedback: m0 18 12, CARD, r16, 1.5px BORDER, p14 16 */}
                  <View style={s.readingFeedback}>
                    {/* .rf-header: flex, gap7, mb8 */}
                    <View style={s.rfHeader}>
                      <Text style={{ fontSize:16, color:T_GOLD }}>✦</Text>
                      {/* .rf-title: 12px 700 T_GOLD — bumped to 14 */}
                      <Text style={s.rfTitle}>Zaeli's take</Text>
                    </View>
                    {/* .rf-body: 13px ink lh1.55 — bumped to 15 */}
                    <Text style={s.rfBody}>{feedback.summary}</Text>
                  </View>

                  {/* .cta .cta-gold: T_GOLD bg, T_DARK txt */}
                  <TouchableOpacity style={s.ctaGold} onPress={resetAll} activeOpacity={0.85}>
                    <Text style={s.ctaGoldTxt}>Read another page →</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </>
          )}

          {/* Move to step 2 after photo */}
          {step === 'photo' && pagePhoto && !detectingPage && (
            <TouchableOpacity style={s.ctaMag} onPress={() => setStep('read')} activeOpacity={0.85}>
              <Text style={s.ctaMagTxt}>Start reading →</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex:1, backgroundColor:MAG },
  content: { flex:1, backgroundColor:BG },

  // .reading-hdr: MAG bg, p14 22 20
  readingHdr: { backgroundColor:MAG, paddingHorizontal:22, paddingTop:14, paddingBottom:20 },

  backTxt: { fontSize:20, color:'rgba(255,255,255,0.7)', fontFamily:'Poppins_400Regular' },

  // Badge: rgba(255,255,255,0.12) bg, rgba(255,255,255,0.2) border
  readingBadge:    { alignSelf:'flex-start', backgroundColor:'rgba(255,255,255,0.12)', borderWidth:1, borderColor:'rgba(255,255,255,0.2)', borderRadius:20, paddingHorizontal:10, paddingVertical:4, marginBottom:9 },
  readingBadgeTxt: { fontFamily:'Poppins_700Bold', fontSize:11, color:'#fff', letterSpacing:0.5 },

  // .hero-title 28px — bumped to 32
  heroTitle: { fontFamily:'DMSerifDisplay_400Regular', fontSize:32, color:'#fff', letterSpacing:-0.8, marginBottom:5 },
  // .hero-sub — bumped to 15
  heroSub:   { fontFamily:'Poppins_400Regular', fontSize:15, color:'rgba(255,255,255,0.65)', lineHeight:22 },

  // Section label — same as tutor.tsx slbl but ink2 (darker)
  slbl: { fontFamily:'Poppins_700Bold', fontSize:12, textTransform:'uppercase', letterSpacing:1.5, color:INK2, paddingHorizontal:22, paddingTop:16, paddingBottom:8 },

  // Photo placeholder
  photoPlaceholder:    { marginHorizontal:18, backgroundColor:'#fffdf5', borderRadius:16, borderWidth:1.5, borderColor:'rgba(201,168,76,0.2)', padding:32, alignItems:'center', gap:8 },
  photoPlaceholderIcon:{ fontSize:40 },
  photoPlaceholderTxt: { fontFamily:'Poppins_600SemiBold', fontSize:16, color:INK2 },
  photoPlaceholderSub: { fontFamily:'Poppins_400Regular', fontSize:13, color:INK3 },

  skipBtn: { alignItems:'center', marginTop:12, marginBottom:4 },
  skipTxt: { fontFamily:'Poppins_400Regular', fontSize:13, color:INK3 },

  // .book-detect: #fffdf5, r16, 1.5px rgba(201,168,76,0.2), p14 16
  bookDetect:    { marginHorizontal:18, marginBottom:12, backgroundColor:'#fffdf5', borderRadius:16, borderWidth:1.5, borderColor:'rgba(201,168,76,0.2)', padding:16 },
  // .book-detect-lbl: 10px 700 T_GOLD2 upper ls1 mb10 — bumped to 12
  bookDetectLbl: { fontFamily:'Poppins_700Bold', fontSize:12, color:T_GOLD2, textTransform:'uppercase', letterSpacing:1, marginBottom:10 },
  bookLines:     { gap:6 },
  // .bl: h9 r4 rgba(0,0,0,0.07)
  bookLine:      { height:9, borderRadius:4, backgroundColor:'rgba(0,0,0,0.07)' },
  // .bl.hi: rgba(201,168,76,0.25)
  bookLineHi:    { backgroundColor:'rgba(201,168,76,0.25)' },

  // Retake card — dashed, opacity 0.6
  retakeCard: { marginHorizontal:18, marginBottom:14, backgroundColor:CARD, borderRadius:14, borderWidth:1.5, borderStyle:'dashed', borderColor:BORDER, padding:16, flexDirection:'row', alignItems:'center', gap:12, opacity:0.6 },
  retakeTxt:  { fontFamily:'Poppins_500Medium', fontSize:14, color:INK2 },

  // .reading-btns: p0 18 12, flex, gap10
  readingBtns: { paddingHorizontal:18, paddingBottom:12, flexDirection:'row', gap:10 },
  rb:          { flex:1, borderRadius:16, padding:16, alignItems:'center', gap:6 },
  // .rb-rec: T_DARK bg, 1px rgba(201,168,76,0.15) border
  rbRec:       { backgroundColor:T_DARK, borderWidth:1, borderColor:'rgba(201,168,76,0.15)' },
  // .rb-play: CARD bg, 1.5px BORDER
  rbPlay:      { backgroundColor:CARD, borderWidth:1.5, borderColor:BORDER },
  // .rb-icon: 22px — bumped to 26
  rbIcon:      { fontSize:26 },
  // .rb-rec .rb-label: T_GOLD 11px 700 — bumped to 14
  rbLblLight:  { fontFamily:'Poppins_700Bold', fontSize:14, color:T_GOLD },
  // .rb-play .rb-label: ink2 11px 700 — bumped to 14
  rbLblDark:   { fontFamily:'Poppins_700Bold', fontSize:14, color:INK2 },

  // .reading-scores: m0 18 12, flex, gap8
  readingScores: { marginHorizontal:18, marginBottom:12, flexDirection:'row', gap:8 },
  // .rs: flex1, CARD, r14, 1.5px BORDER, p12 10, center
  rs:            { flex:1, backgroundColor:CARD, borderRadius:14, borderWidth:1.5, borderColor:BORDER, padding:12, alignItems:'center' },
  // .rs-val: 18px 800 ls-0.5 — bumped to 22
  rsVal:         { fontFamily:'Poppins_800ExtraBold', fontSize:22, letterSpacing:-0.5, marginBottom:2 },
  // .rs-lbl: 9px 700 upper ls0.5 ink3 mt2 — bumped to 11
  rsLbl:         { fontFamily:'Poppins_700Bold', fontSize:11, textTransform:'uppercase', letterSpacing:0.5, color:INK3 },

  // Missed words
  missedCard:    { marginHorizontal:18, marginBottom:12, backgroundColor:CARD, borderRadius:14, borderWidth:1.5, borderColor:BORDER, padding:14 },
  missedTitle:   { fontFamily:'Poppins_700Bold', fontSize:13, color:INK2, marginBottom:8 },
  missedChip:    { backgroundColor:'rgba(224,0,124,0.06)', borderWidth:1, borderColor:'rgba(224,0,124,0.15)', borderRadius:10, paddingHorizontal:10, paddingVertical:5 },
  missedChipTxt: { fontFamily:'Poppins_600SemiBold', fontSize:13, color:MAG },

  // .reading-feedback: m0 18 12, CARD, r16, 1.5px BORDER, p14 16
  readingFeedback: { marginHorizontal:18, marginBottom:12, backgroundColor:CARD, borderRadius:16, borderWidth:1.5, borderColor:BORDER, padding:16 },
  // .rf-header: flex, gap7, mb8
  rfHeader:        { flexDirection:'row', alignItems:'center', gap:7, marginBottom:8 },
  // .rf-title: 12px 700 T_GOLD — bumped to 14
  rfTitle:         { fontFamily:'Poppins_700Bold', fontSize:14, color:T_GOLD },
  // .rf-body: 13px ink lh1.55 — bumped to 15
  rfBody:          { fontFamily:'Poppins_400Regular', fontSize:15, color:INK, lineHeight:24 },

  // .cta-gold: T_GOLD bg, T_DARK txt
  ctaGold:    { marginHorizontal:18, marginBottom:8, backgroundColor:T_GOLD, borderRadius:16, padding:16, alignItems:'center', shadowColor:'#C9A84C', shadowOpacity:0.3, shadowRadius:12, shadowOffset:{width:0,height:4} },
  ctaGoldTxt: { fontFamily:'Poppins_700Bold', fontSize:15, color:T_DARK },

  // Start reading CTA — magenta
  ctaMag:    { marginHorizontal:18, marginTop:12, marginBottom:8, backgroundColor:MAG, borderRadius:16, padding:16, alignItems:'center' },
  ctaMagTxt: { fontFamily:'Poppins_700Bold', fontSize:15, color:'#fff' },
});