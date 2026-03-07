import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A0F1E',
          borderTopColor: 'rgba(74,144,217,0.1)',
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarActiveTintColor: '#4A90D9',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.3)',
        tabBarLabelStyle: {
          fontFamily: 'DMSans_400Regular',
          fontSize: 10,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} /> }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: ({ color }) => <TabIcon icon="📅" color={color} /> }} />
      <Tabs.Screen name="chores" options={{ title: 'Chores', tabBarIcon: ({ color }) => <TabIcon icon="✓" color={color} /> }} />
      <Tabs.Screen name="lists" options={{ title: 'Lists', tabBarIcon: ({ color }) => <TabIcon icon="🛒" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <TabIcon icon="⚙️" color={color} /> }} />
    </Tabs>
  )
}

function TabIcon({ icon, color }: { icon: string, color: string }) {
  return (
    <TabIcon2 icon={icon} color={color} />
  )
}

import { Text } from 'react-native'

function TabIcon2({ icon, color }: { icon: string, color: string }) {
  return <Text style={{ fontSize: 20, opacity: color === '#4A90D9' ? 1 : 0.4 }}>{icon}</Text>
}