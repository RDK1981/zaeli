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
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { requestNotificationPermission } from '../../lib/notifications';

export default function TabLayout() {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    requestNotificationPermission();
  }, []);

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
      <Tabs.Screen name="swipe-world"   options={{ href: null }} />
      <Tabs.Screen name="landing"      options={{ href: null }} />
      <Tabs.Screen name="index"        options={{ href: null }} />
      <Tabs.Screen name="dashboard"    options={{ href: null }} />
      <Tabs.Screen name="calendar"     options={{ href: null }} />
      <Tabs.Screen name="shopping"     options={{ href: null }} />
      <Tabs.Screen name="mealplanner"  options={{ href: null }} />
      <Tabs.Screen name="chores"       options={{ href: null }} />
      <Tabs.Screen name="more"         options={{ href: null }} />
      <Tabs.Screen name="lists"        options={{ href: null }} />
      <Tabs.Screen name="settings"     options={{ href: null }} />
      <Tabs.Screen name="zaeli-chat"   options={{ href: null }} />
      <Tabs.Screen name="family"       options={{ href: null }} />
      <Tabs.Screen name="kids"         options={{ href: null }} />
      <Tabs.Screen name="tutor"          options={{ href: null }} />
      <Tabs.Screen name="tutor-child"    options={{ href: null }} />
      <Tabs.Screen name="tutor-session"  options={{ href: null }} />
      <Tabs.Screen name="tutor-practice" options={{ href: null }} />
      <Tabs.Screen name="tutor-reading"  options={{ href: null }} />
    </Tabs>
  );
}
