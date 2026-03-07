import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

const COLORS = {
  bg: '#0A0F1E',
  card: '#141929',
  cardBorder: '#1E2840',
  blue: '#4A90D9',
  blueLight: 'rgba(74,144,217,0.12)',
  blueBorder: 'rgba(74,144,217,0.25)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.55)',
  textTertiary: 'rgba(255,255,255,0.28)',
  green: '#1DB87A',
  greenLight: 'rgba(29,184,122,0.12)',
  orange: '#E8922A',
  orangeLight: 'rgba(232,146,42,0.12)',
  purple: '#9B7FD4',
  purpleLight: 'rgba(155,127,212,0.12)',
  coral: '#D64F3E',
  coralLight: 'rgba(214,79,62,0.10)',
  teal: '#2ABFBF',
  tealLight: 'rgba(42,191,191,0.12)',
};

interface MenuItem {
  icon: string;
  label: string;
  subtitle: string;
  color: string;
  bg: string;
  route?: string;
  comingSoon?: boolean;
}

const MENU_SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Lists',
    items: [
      { icon: '✅', label: 'To-Do',  subtitle: 'Your personal & shared tasks',   color: COLORS.blue,   bg: COLORS.blueLight,   route: '/(tabs)/lists' },
      { icon: '💡', label: 'Ideas',  subtitle: 'Capture & share ideas',          color: COLORS.purple, bg: COLORS.purpleLight, route: '/(tabs)/lists' },
    ],
  },
  {
    title: 'Life',
    items: [
      { icon: '🎓', label: 'Tutoring', subtitle: 'AI homework help for kids',     color: COLORS.orange, bg: COLORS.orangeLight, comingSoon: true },
      { icon: '✈️', label: 'Travel',   subtitle: 'Trips, packing lists & budget', color: COLORS.teal,   bg: COLORS.tealLight,   comingSoon: true },
      { icon: '💪', label: 'Fitness',  subtitle: 'Family fitness goals',          color: COLORS.green,  bg: COLORS.greenLight,  comingSoon: true },
      { icon: '🧘', label: 'Zen',      subtitle: 'Mindfulness & calm',            color: COLORS.purple, bg: COLORS.purpleLight, comingSoon: true },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: '⚙️', label: 'Settings', subtitle: 'Profile, family & preferences', color: COLORS.blue, bg: COLORS.blueLight, route: '/(tabs)/settings' },
    ],
  },
];

export default function MoreScreen() {
  const handlePress = (item: MenuItem) => {
    if (item.comingSoon) {
      Alert.alert(
        `${item.label} — Coming Soon`,
        `${item.label} is being built right now. It'll be ready in a future update.`,
        [{ text: 'Can\'t wait!', style: 'default' }]
      );
      return;
    }
    if (item.route) {
      router.push(item.route as any);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <Text style={styles.pageTitle}>More</Text>

        {MENU_SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, index) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => handlePress(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                      <Text style={styles.menuEmoji}>{item.icon}</Text>
                    </View>
                    <View style={styles.menuInfo}>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                    </View>
                    <View style={styles.menuRight}>
                      {item.comingSoon && (
                        <View style={styles.comingSoonBadge}>
                          <Text style={styles.comingSoonText}>Soon</Text>
                        </View>
                      )}
                      <Text style={styles.chevron}>›</Text>
                    </View>
                  </TouchableOpacity>
                  {index < section.items.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Zaeli — Family Life Platform</Text>
          <Text style={styles.footerVersion}>Version 0.3.0</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: COLORS.bg },
  scroll:           { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  pageTitle:        { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: COLORS.text, letterSpacing: -0.5, marginBottom: 28 },
  section:          { marginBottom: 24 },
  sectionTitle:     { fontSize: 11, fontWeight: '600', color: COLORS.textTertiary, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  sectionCard:      { backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.cardBorder, borderRadius: 18, overflow: 'hidden' },
  menuRow:          { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuIcon:         { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  menuEmoji:        { fontSize: 22 },
  menuInfo:         { flex: 1 },
  menuLabel:        { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  menuSubtitle:     { fontSize: 12, color: COLORS.textSecondary },
  menuRight:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  comingSoonBadge:  { backgroundColor: COLORS.orangeLight, borderWidth: 1, borderColor: 'rgba(232,146,42,0.25)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  comingSoonText:   { fontSize: 10, color: COLORS.orange, fontWeight: '600' },
  chevron:          { fontSize: 20, color: COLORS.textTertiary },
  divider:          { height: 1, backgroundColor: COLORS.cardBorder, marginHorizontal: 16 },
  footer:           { alignItems: 'center', paddingTop: 16, gap: 4 },
  footerText:       { fontSize: 12, color: COLORS.textTertiary },
  footerVersion:    { fontSize: 11, color: COLORS.textTertiary, opacity: 0.5 },
});