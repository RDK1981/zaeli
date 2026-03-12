import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Easing,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = {
  blue: '#0057FF', blueL: 'rgba(0,87,255,0.09)',
  magenta: '#E0007C', magentaL: 'rgba(224,0,124,0.08)',
  orange: '#FF8C00', orangeL: 'rgba(255,140,0,0.09)',
  green: '#00C97A', greenL: 'rgba(0,201,122,0.09)',
  purple: '#9B7FD4', purpleL: 'rgba(155,127,212,0.10)',
  teal: '#00BFBF', tealL: 'rgba(0,191,191,0.09)',
  ink: '#0A0A0A', ink2: 'rgba(0,0,0,0.45)', ink3: 'rgba(0,0,0,0.28)',
  darkL: 'rgba(0,0,0,0.06)', border: 'rgba(0,0,0,0.06)',
};

const FAMILY_PIPS = [
  { initial: 'A', color: '#0057FF' },
  { initial: 'R', color: '#FF8C00' },
  { initial: 'P', color: '#9B6DD6' },
  { initial: 'G', color: '#00B4D8' },
  { initial: 'D', color: '#4A90E2' },
];

type NavItem = {
  icon: string; label: string; sub?: string;
  route: string; params?: Record<string, string>;
  dotBg: string; activeColor?: string;
  badge?: string; badgeBg?: string;
};
type NavSection = { label: string; items: NavItem[]; dividerAfter?: boolean };

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Daily', dividerAfter: true,
    items: [
      { icon: '🏠', label: 'Home',     route: '/(tabs)/',         dotBg: C.blueL,    activeColor: C.blue },
      { icon: '📅', label: 'Calendar', route: '/(tabs)/calendar', dotBg: C.magentaL, activeColor: C.magenta },
      { icon: '✅', label: 'To-dos',   route: '/(tabs)/more',     params: { initialPage: 'todo' }, dotBg: C.darkL },
    ],
  },
  {
    label: 'Household', dividerAfter: true,
    items: [
      { icon: '🛒', label: 'Shopping',     route: '/(tabs)/shopping',    dotBg: C.greenL  },
      { icon: '🍽️', label: 'Meal Planner', route: '/(tabs)/mealplanner', dotBg: C.orangeL },
      { icon: '⭐', label: 'Kids',         route: '/(tabs)/chores',      dotBg: C.greenL  },
    ],
  },
  {
    label: 'Personal', dividerAfter: true,
    items: [
      { icon: '📝', label: 'Notes',      route: '/(tabs)/more', params: { initialPage: 'notes'  }, dotBg: C.purpleL },
      { icon: '✈️', label: 'Travel',     route: '/(tabs)/more', params: { initialPage: 'travel' }, dotBg: C.tealL   },
      { icon: '👨‍👩‍👧', label: 'Our Family', route: '/(tabs)/more', params: { initialPage: 'family' }, dotBg: C.blueL   },
    ],
  },
];

interface NavMenuProps { visible: boolean; onClose: () => void }

export function NavMenu({ visible, onClose }: NavMenuProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const insets   = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const translateX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const scale      = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });

  const navigate = (route: string, params?: Record<string, string>) => {
    onClose();
    setTimeout(() => {
      if (params) router.push({ pathname: route as any, params });
      else router.push(route as any);
    }, 180);
  };

  const isActive = (item: NavItem) => {
    if (item.route === '/(tabs)/' && (pathname === '/' || pathname === '/index')) return true;
    if (item.route !== '/(tabs)/' && pathname.includes(item.route.replace('/(tabs)/', ''))) return true;
    return false;
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[s.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      {/* ✕ close button — same position as hamburger */}
      <Animated.View style={[s.closeWrap, { top: insets.top + 10, opacity: fadeAnim }]} pointerEvents="box-none">
        <TouchableOpacity style={s.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={s.closeBtnTxt}>✕</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Panel */}
      <Animated.View
        style={[s.panel, { top: insets.top + 54, opacity: slideAnim, transform: [{ translateX }, { scale }] }]}
        pointerEvents={visible ? 'box-none' : 'none'}
      >
        <ScrollView bounces={false} showsVerticalScrollIndicator={false}>

          {/* Signed in as / Name */}
          <View style={s.userBlock}>
            <Text style={s.signedInAs}>Signed in as</Text>
            <Text style={s.userName}>Anna</Text>
          </View>

          <View style={s.divider} />

          {/* Family pips */}
          <View style={s.familyRow}>
            <Text style={s.familyLbl}>Family</Text>
            <View style={s.pips}>
              {FAMILY_PIPS.map(pip => (
                <View key={pip.initial} style={[s.pip, { backgroundColor: pip.color }]}>
                  <Text style={s.pipTxt}>{pip.initial}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={s.divider} />

          {/* Nav sections */}
          {NAV_SECTIONS.map(section => (
            <View key={section.label}>
              <View style={s.menuSection}>
                <Text style={s.sectionLabel}>{section.label.toUpperCase()}</Text>
                {section.items.map(item => {
                  const active = isActive(item);
                  return (
                    <TouchableOpacity key={item.label} style={s.navItem} onPress={() => navigate(item.route, item.params)} activeOpacity={0.7}>
                      <Text style={s.navItemEmoji}>{item.icon}</Text>
                      <View style={s.navInfo}>
                        <Text style={[s.navLabel, active && { color: item.activeColor || C.blue }]}>{item.label}</Text>
                        {item.sub && <Text style={s.navSub}>{item.sub}</Text>}
                      </View>
                      {item.badge && (
                        <View style={[s.navBadge, { backgroundColor: item.badgeBg || C.orange }]}>
                          <Text style={s.navBadgeTxt}>{item.badge}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {section.dividerAfter && <View style={s.menuDivider} />}
            </View>
          ))}

          {/* Settings */}
          <View style={s.menuBottom}>
            <TouchableOpacity style={s.settingsRow} onPress={() => navigate('/(tabs)/settings')} activeOpacity={0.7}>
              <Text style={{ fontSize: 22, width: 28, textAlign: "center" }}>⚙️</Text>
              <Text style={s.settingsLbl}>Settings</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ── Hamburger button — matches HTML .menu-trigger exactly ──────
export function HamburgerButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={s.menuTrigger} onPress={onPress} activeOpacity={0.75} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <View style={[s.hbLine, { width: 16 }]} />
      <View style={[s.hbLine, { width: 16 }]} />
      <View style={[s.hbLine, { width: 11 }]} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,6,18,0.52)' },

  closeWrap: { position: 'absolute', right: 18, zIndex: 100, alignItems: 'flex-end' },
  closeBtn: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnTxt: { fontSize: 13, color: '#fff', fontFamily: 'Poppins_400Regular', lineHeight: 16 },

  panel: {
    position: 'absolute', right: 16, width: 300, maxHeight: 740,
    backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 40,
    shadowOffset: { width: 0, height: 16 }, elevation: 16,
  },

  userBlock: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 12 },
  signedInAs: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: C.ink3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 1 },
  userName: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 22, color: C.ink, letterSpacing: -0.5 },

  divider: { height: 1, backgroundColor: C.border },

  familyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 9 },
  familyLbl: { fontFamily: 'Poppins_700Bold', fontSize: 9, color: C.ink3, textTransform: 'uppercase', letterSpacing: 1 },
  pips: { flexDirection: 'row', gap: 5 },
  pip: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  pipTxt: { fontFamily: 'Poppins_700Bold', fontSize: 9, color: '#fff' },

  menuSection: { paddingTop: 6, paddingBottom: 2 },
  sectionLabel: { fontFamily: 'Poppins_700Bold', fontSize: 9, color: C.ink3, textTransform: 'uppercase', letterSpacing: 1.2, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 3 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 11 },
  navItemEmoji: { fontSize: 22, width: 28, textAlign: 'center' as any, flexShrink: 0 },
  navInfo: { flex: 1 },
  navLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13.5, color: C.ink, lineHeight: 18 },
  navSub: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: C.ink3, marginTop: 1 },
  navBadge: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2, minWidth: 18, alignItems: 'center' },
  navBadgeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 9.5, color: '#fff' },
  menuDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 16, marginVertical: 3 },

  menuBottom: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, borderTopWidth: 1, borderTopColor: C.border },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  settingsLbl: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: C.ink2 },

  // Hamburger — matches HTML .menu-trigger
  menuTrigger: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center', justifyContent: 'center',
    gap: 4,
  },
  hbLine: { height: 1.5, borderRadius: 2, backgroundColor: '#fff' },
});