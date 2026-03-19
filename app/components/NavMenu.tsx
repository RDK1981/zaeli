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
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

// ── NAV SVG ICONS ────────────────────────────────────────────
function IcoHome({ s=20 }: { s?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-9.5z" fill="#FF6B3D" stroke="#D4521E" strokeWidth={1}/>
      <Rect x="9" y="13" width="6" height="8" rx="1" fill="#fff" fillOpacity={0.95}/>
    </Svg>
  );
}
function IcoCalNav({ s=20 }: { s?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="17" rx="4" fill="#fff" stroke="#F9A8D4" strokeWidth={1.5}/>
      <Rect x="3" y="4" width="18" height="7" rx="4" fill="#EC4899"/>
      <Rect x="3" y="8" width="18" height="3" fill="#EC4899"/>
      <Line x1="8" y1="2" x2="8" y2="6" stroke="#DB2777" strokeWidth={2} strokeLinecap="round"/>
      <Line x1="16" y1="2" x2="16" y2="6" stroke="#DB2777" strokeWidth={2} strokeLinecap="round"/>
      <Circle cx="8" cy="14" r="1.5" fill="#F9A8D4"/>
      <Circle cx="12" cy="14" r="1.5" fill="#F9A8D4"/>
      <Circle cx="16" cy="14" r="1.5" fill="#F9A8D4"/>
      <Circle cx="8" cy="18" r="1.5" fill="#F9A8D4"/>
      <Circle cx="12" cy="18" r="1.5" fill="#F9A8D4"/>
      <Circle cx="16" cy="18" r="1.5" fill="#FBCFE8"/>
    </Svg>
  );
}
function IcoTodoNav({ s=20 }: { s?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="2" width="20" height="20" rx="5" fill="#22C55E"/>
      <Path d="M7 12l3.5 3.5L17 8.5" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoCartNav({ s=20 }: { s?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path d="M9 22C9.55228 22 10 21.5523 10 21C10 20.4477 9.55228 20 9 20C8.44772 20 8 20.4477 8 21C8 21.5523 8.44772 22 9 22Z" fill="#9CA3AF"/>
      <Path d="M20 22C20.5523 22 21 21.5523 21 21C21 20.4477 20.5523 20 20 20C19.4477 20 19 20.4477 19 21C19 21.5523 19.4477 22 20 22Z" fill="#9CA3AF"/>
      <Path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.99-1.69L23 6H6" stroke="#9CA3AF" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoMealNav({ s=20 }: { s?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" fill="#FED7AA" stroke="#FB923C" strokeWidth={1.8}/>
      <Circle cx="12" cy="12" r="6" fill="#fff" stroke="#FED7AA" strokeWidth={1.2}/>
      <Line x1="9" y1="8" x2="9" y2="10" stroke="#FB923C" strokeWidth={1.8} strokeLinecap="round"/>
      <Line x1="7.5" y1="8" x2="7.5" y2="10" stroke="#FB923C" strokeWidth={1.8} strokeLinecap="round"/>
      <Line x1="10.5" y1="8" x2="10.5" y2="10" stroke="#FB923C" strokeWidth={1.8} strokeLinecap="round"/>
      <Path d="M7.5 10 Q9 12 10.5 10" stroke="#FB923C" strokeWidth={1.8} fill="none" strokeLinecap="round"/>
      <Line x1="9" y1="12" x2="9" y2="16" stroke="#FB923C" strokeWidth={1.8} strokeLinecap="round"/>
      <Path d="M14 8 C15 9 15 11 14 12 L14 16" stroke="#FB923C" strokeWidth={1.8} fill="none" strokeLinecap="round"/>
    </Svg>
  );
}
function IcoTutorNav({ s=20 }: { s?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      {/* Graduation cap — midnight dark with gold accent */}
      <Path d="M12 3L2 8l10 5 10-5-10-5z" fill="#1A1A2E" stroke="#C9A84C" strokeWidth={1.2} strokeLinejoin="round"/>
      <Path d="M6 10.5v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" fill="#C9A84C" fillOpacity={0.18} stroke="#C9A84C" strokeWidth={1.2} strokeLinecap="round"/>
      <Line x1="20" y1="8" x2="20" y2="14" stroke="#1A1A2E" strokeWidth={1.8} strokeLinecap="round"/>
      <Circle cx="20" cy="15" r="1.2" fill="#C9A84C"/>
    </Svg>
  );
}
function IcoKidsNav({ s=20 }: { s?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill="#FFD234" stroke="#F5A623" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoMoreNav({ s=20 }: { s?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Circle cx="5" cy="12" r="2" fill="#6B7280"/>
      <Circle cx="12" cy="12" r="2" fill="#6B7280"/>
      <Circle cx="19" cy="12" r="2" fill="#6B7280"/>
    </Svg>
  );
}
function IcoNotesNav({ s=20 }: { s?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="2" width="16" height="20" rx="3" fill="#EDE9FE"/>
      <Line x1="8" y1="8" x2="16" y2="8" stroke="#7C3AED" strokeWidth={1.5} strokeLinecap="round"/>
      <Line x1="8" y1="12" x2="16" y2="12" stroke="#7C3AED" strokeWidth={1.5} strokeLinecap="round"/>
      <Line x1="8" y1="16" x2="13" y2="16" stroke="#7C3AED" strokeWidth={1.5} strokeLinecap="round"/>
    </Svg>
  );
}
function IcoTravelNav({ s=20 }: { s?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Path d="M21 16l-9-5-1-7-2 1 1 6.5L4 14.5l-.5 2 6.5-1.5 1 5.5 2 .5-.5-7 8.5-3.5z"
        fill="#BAE6FD" stroke="#0EA5E9" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}
function IcoFamilyNav({ s=20 }: { s?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="7" r="3" fill="#BFDBFE" stroke="#3B82F6" strokeWidth={1.2}/>
      <Circle cx="17" cy="8" r="2.5" fill="#BFDBFE" stroke="#3B82F6" strokeWidth={1.2}/>
      <Path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#3B82F6" strokeWidth={1.5} fill="none" strokeLinecap="round"/>
      <Path d="M17 13c2.2.5 4 2.5 4 5" stroke="#3B82F6" strokeWidth={1.5} fill="none" strokeLinecap="round"/>
    </Svg>
  );
}
function IcoSettingsNav({ s=20 }: { s?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke="#9CA3AF" strokeWidth={1.8}/>
      <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke="#9CA3AF" strokeWidth={1.5} fill="none"/>
    </Svg>
  );
}

const C = {
  blue: '#0057FF', blueL: 'rgba(0,87,255,0.09)',
  magenta: '#E0007C', magentaL: 'rgba(224,0,124,0.08)',
  orange: '#FF8C00', orangeL: 'rgba(255,140,0,0.09)',
  green: '#00C97A', greenL: 'rgba(0,201,122,0.09)',
  purple: '#9B7FD4', purpleL: 'rgba(155,127,212,0.10)',
  teal: '#00BFBF', tealL: 'rgba(0,191,191,0.09)',
  tutorGold: '#C9A84C',
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
  renderIcon: () => React.ReactElement; label: string; sub?: string;
  route: string; params?: Record<string, string>;
  dotBg: string; activeColor?: string;
  badge?: string; badgeBg?: string;
};
type NavSection = { label: string; items: NavItem[]; dividerAfter?: boolean };

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Daily', dividerAfter: true,
    items: [
      { renderIcon: () => <IcoHome s={20}/>,    label: 'Home',     route: '/(tabs)/',         dotBg: '#FFF0EB', activeColor: C.blue },
      { renderIcon: () => <IcoCalNav s={20}/>,  label: 'Calendar', route: '/(tabs)/calendar', dotBg: '#FFF0F5', activeColor: C.magenta },
      { renderIcon: () => <IcoTodoNav s={20}/>, label: 'To-dos',   route: '/(tabs)/more',     params: { initialPage: 'todo' }, dotBg: '#EDFFF6' },
    ],
  },
  {
    label: 'Household', dividerAfter: true,
    items: [
      { renderIcon: () => <IcoCartNav s={20}/>,  label: 'Shopping',     route: '/(tabs)/shopping',    dotBg: '#F4F4F4' },
      { renderIcon: () => <IcoMealNav s={20}/>,  label: 'Meal Planner', route: '/(tabs)/mealplanner', dotBg: '#FFF7ED' },
      { renderIcon: () => <IcoTutorNav s={20}/>, label: 'Tutor',        route: '/(tabs)/tutor',       dotBg: '#F5F0E8', activeColor: C.tutorGold },
      { renderIcon: () => <IcoKidsNav s={20}/>,  label: 'Kids',         route: '/(tabs)/chores',      dotBg: '#FFFBEA' },
    ],
  },
  {
    label: 'Personal', dividerAfter: true,
    items: [
      { renderIcon: () => <IcoNotesNav s={20}/>,  label: 'Notes',      route: '/(tabs)/more', params: { initialPage: 'notes'  }, dotBg: '#F3EEFF' },
      { renderIcon: () => <IcoTravelNav s={20}/>, label: 'Travel',     route: '/(tabs)/more', params: { initialPage: 'travel' }, dotBg: '#E8F8FF' },
      { renderIcon: () => <IcoFamilyNav s={20}/>, label: 'Our Family', route: '/(tabs)/more', params: { initialPage: 'family' }, dotBg: '#EEF2FF' },
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
                      <View style={[s.navIconBox, { backgroundColor: item.dotBg }]}>
                        {item.renderIcon()}
                      </View>
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
            <TouchableOpacity style={s.settingsRow} onPress={() => navigate('/(tabs)/more', { initialPage: 'settings' })} activeOpacity={0.7}>
              <View style={[s.navIconBox, { backgroundColor: '#F3F4F6' }]}>
                <IcoSettingsNav s={20}/>
              </View>
              <Text style={s.settingsLbl}>Settings</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ── Hamburger button ──────────────────────────────────────────
export function HamburgerButton({ onPress, color = '#fff' }: { onPress: () => void; color?: string }) {
  return (
    <TouchableOpacity style={s.menuTrigger} onPress={onPress} activeOpacity={0.75} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <View style={[s.hbLine, { width: 20, backgroundColor: color }]} />
      <View style={[s.hbLine, { width: 20, backgroundColor: color }]} />
      <View style={[s.hbLine, { width: 14, backgroundColor: color }]} />
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
  navIconBox: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  navInfo: { flex: 1 },
  navLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13.5, color: C.ink, lineHeight: 18 },
  navSub: { fontFamily: 'Poppins_400Regular', fontSize: 10.5, color: C.ink3, marginTop: 1 },
  navBadge: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2, minWidth: 18, alignItems: 'center' },
  navBadgeTxt: { fontFamily: 'Poppins_700Bold', fontSize: 9.5, color: '#fff' },
  menuDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 16, marginVertical: 3 },

  menuBottom: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, borderTopWidth: 1, borderTopColor: C.border },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  settingsLbl: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: C.ink2 },

  menuTrigger: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center', justifyContent: 'center',
    gap: 5,
  },
  hbLine: { height: 2, borderRadius: 2, backgroundColor: '#fff' },
});
