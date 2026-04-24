/**
 * TourBanner — first-time hint shown inside a live module/sheet during the tour.
 *
 * Renders only when:
 *   - Tour is in progress (started, not yet completed)
 *   - This sheet's dismissal flag is not set in AsyncStorage
 *
 * Tap × → flag is set → won't render again on this device.
 * One key per surface so each sheet has its own first-time experience.
 *
 * Usage:
 *   <TourBanner
 *     sheetKey="shopping"
 *     message="You're in the live Shopping list — tap + to add an item, or message me from chat anytime."
 *   />
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isInProgress as tourInProgress, loadTourState } from '../../lib/tour-state';

interface Props {
  sheetKey: string;
  message: string;
}

export default function TourBanner({ sheetKey, message }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const k = `tour_banner_seen_${sheetKey}`;
      try {
        const seen = await AsyncStorage.getItem(k);
        if (seen === 'true') return;
      } catch { return; }
      await loadTourState();
      if (tourInProgress()) setVisible(true);
    })();
  }, [sheetKey]);

  if (!visible) return null;

  async function handleDismiss() {
    setVisible(false);
    try { await AsyncStorage.setItem(`tour_banner_seen_${sheetKey}`, 'true'); } catch {}
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.icon}>👋</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.text}>{message}</Text>
        <Text style={styles.fine}>This banner won't show again.</Text>
      </View>
      <TouchableOpacity onPress={handleDismiss} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
        <Text style={styles.x}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#E6F7EF',
    borderWidth: 1.5,
    borderColor: '#C8F0DA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  icon: { fontSize: 22, marginTop: 1 },
  text: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#0A0A0A', lineHeight: 20 },
  fine: { fontFamily: 'Poppins_400Regular', fontSize: 11, color: 'rgba(10,10,10,0.55)', fontStyle: 'italic', marginTop: 4 },
  x: { fontSize: 24, color: '#2D7A52', paddingHorizontal: 4, marginTop: -4 },
});
