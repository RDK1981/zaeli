import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

function TabIcon({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={styles.tabEmoji}>{icon}</Text>
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </View>
  );
}

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
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#4A90D9',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.3)',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <TabIcon icon="🏠" label="Home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          tabBarIcon: ({ color }) => <TabIcon icon="📅" label="Cal" color={color} />,
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          tabBarIcon: ({ color }) => <TabIcon icon="🛒" label="Shop" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chores"
        options={{
          tabBarIcon: ({ color }) => <TabIcon icon="⚡" label="Tasks" color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarIcon: ({ color }) => (
            <View style={styles.tabIcon}>
              <View style={styles.dotsRow}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <View style={[styles.dot, { backgroundColor: color }]} />
                <View style={[styles.dot, { backgroundColor: color }]} />
              </View>
              <Text style={[styles.tabLabel, { color }]}>More</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="lists" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabEmoji: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 20,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});