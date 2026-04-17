/**
 * ChatBarFacade.tsx — visual-match chat bar for non-Chat screens
 *
 * Renders the same look as the real chat bar in index.tsx (HomeScreen), but is
 * a facade — any interaction triggers `onGoToChat` to navigate to Chat where the
 * real bar lives.
 *
 * Used on Dashboard and My Space so the chat bar is present everywhere (safe —
 * no state, no refs, never conditionally rendered).
 */

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import Svg, { Path, Line, Circle, Polyline } from 'react-native-svg';

export default function ChatBarFacade({ onGoToChat }: { onGoToChat: () => void }) {
  return (
    <View style={s.float}>
      <TouchableOpacity style={s.pill} onPress={onGoToChat} activeOpacity={0.92}>
        {/* Mic */}
        <View style={s.btn}>
          <Svg width={26} height={26} viewBox="0 0 24 24" fill="none"
            stroke="rgba(10,10,10,0.48)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
            <Path d="M19 10v2a7 7 0 01-14 0v-2"/>
            <Line x1="12" y1="19" x2="12" y2="23"/>
            <Line x1="8" y1="23" x2="16" y2="23"/>
          </Svg>
        </View>

        {/* Input placeholder */}
        <View style={s.input}>
          <Text style={s.placeholder}>Ask Zaeli anything...</Text>
        </View>

        {/* Camera */}
        <View style={s.btn}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
            stroke="#FF4545" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <Circle cx="12" cy="13" r="4"/>
          </Svg>
        </View>

        {/* Send (disabled-looking, since no input state) */}
        <View style={[s.btn, { backgroundColor: '#FF4545', opacity: 0.35 }]}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <Line x1="12" y1="19" x2="12" y2="5"/>
            <Polyline points="5 12 12 5 19 12"/>
          </Svg>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  float: {
    position: 'absolute',
    left: 0, right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(220,220,220,0.6)',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  btn: {
    width: 58,
    height: 58,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    paddingHorizontal: 4,
  },
  placeholder: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 17,
    color: 'rgba(10,10,10,0.48)',
  },
});
