/**
 * dashboard.tsx — Zaeli Dashboard Screen
 * Phase 4 stub — full build coming next
 */
import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#0A0A0A' }}>
        Dashboard — Phase 4
      </Text>
    </View>
  );
}
