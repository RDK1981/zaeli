import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: '#0A0F1E',
        borderTopColor: 'rgba(74,144,217,0.15)',
      },
      tabBarActiveTintColor: '#4A90D9',
      tabBarInactiveTintColor: 'rgba(255,255,255,0.3)',
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
    </Tabs>
  )
}