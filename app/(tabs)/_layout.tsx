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
import { Platform, Text, View } from 'react-native';
import { requestNotificationPermission } from '../../lib/notifications';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.45 }}>
      {emoji}
    </Text>
  );
}

export default function TabLayout() {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  // Request notification permission on first launch
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Keep splash screen up while fonts load — app still works without this
  // but text will flash from system font to Poppins on first load
  if (!fontsLoaded) {
    return <View style={{ flex:1, backgroundColor:'#0057FF' }} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0057FF',
        tabBarInactiveTintColor: 'rgba(0,0,0,0.30)',
        tabBarStyle: {
          backgroundColor: 'rgba(247,247,247,0.97)',
          borderTopColor: 'rgba(0,0,0,0.07)',
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 82 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'Poppins_700Bold',
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarActiveTintColor: '#0057FF',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Cal',
          tabBarActiveTintColor: '#E0007C',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: 'Shop',
          tabBarActiveTintColor: '#B8A400',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mealplanner"
        options={{
          title: 'Meals',
          tabBarActiveTintColor: '#FF8C00',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🍽️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chores"
        options={{
          title: 'Kids',
          tabBarActiveTintColor: '#00C97A',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🌟" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarActiveTintColor: '#0A0A0A',
          tabBarIcon: ({ focused }) => <TabIcon emoji="···" focused={focused} />,
        }}
      />
      <Tabs.Screen name="lists"       options={{ href: null }} />
      <Tabs.Screen name="settings"    options={{ href: null }} />
      <Tabs.Screen name="zaeli-chat"  options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}