import {
  DMSerifDisplay_400Regular,
} from '@expo-google-fonts/dm-serif-display';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import { useFonts } from 'expo-font';
import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
// Phase 4a — removed redundant requestNotificationPermission() call.
// The root _layout.tsx now both requests permission AND schedules the
// brief notifications post-auth (Phase 3a). This duplicate just asked.

export default function TabLayout() {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#0057FF' }} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      {/* Session 31 v2 — routes cleaned to the trio + shared infra.
          Hidden features (kids, tutor, travel, my-space + kids-games-data,
          wordle-*, tutor-*) moved to app/_hidden/ — Expo Router ignores
          underscore-prefixed folders so routes silently disappear but
          files stay in git for potential revival.
          Legacy shells (shopping, mealplanner, chores, more, lists,
          zaeli-chat, todos, voice-overlay) remain in the folder as dead
          code — no route hits them, and index.tsx contains the real
          shopping/meals/etc sheets. Cleanup of those file stubs is a
          later chore, no functional impact today. */}
      <Tabs.Screen name="swipe-world" options={{ href: null }} />
      <Tabs.Screen name="index"       options={{ href: null }} />
      <Tabs.Screen name="dashboard"   options={{ href: null }} />
      <Tabs.Screen name="calendar"    options={{ href: null }} />
      <Tabs.Screen name="our-budget"  options={{ href: null }} />
      <Tabs.Screen name="family"      options={{ href: null }} />
      <Tabs.Screen name="settings"    options={{ href: null }} />
      {/* Legacy shell routes kept hidden to prevent Expo Router auto-adding them */}
      <Tabs.Screen name="shopping"    options={{ href: null }} />
      <Tabs.Screen name="mealplanner" options={{ href: null }} />
      <Tabs.Screen name="chores"      options={{ href: null }} />
      <Tabs.Screen name="more"        options={{ href: null }} />
      <Tabs.Screen name="lists"       options={{ href: null }} />
      <Tabs.Screen name="todos"       options={{ href: null }} />
      <Tabs.Screen name="voice-overlay" options={{ href: null }} />
      <Tabs.Screen name="zaeli-chat"  options={{ href: null }} />
    </Tabs>
  );
}
