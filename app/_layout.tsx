import { useEffect, useState, useRef } from 'react'
import { View, Linking, AppState, AppStateStatus } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts, DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display'
import { DMSans_300Light, DMSans_400Regular, DMSans_700Bold } from '@expo-google-fonts/dm-sans'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SplashScreen from 'expo-splash-screen'
import * as SystemUI from 'expo-system-ui'
import { getSession, loadProfile, onAuthChange, getProfile } from '../lib/auth'
import { invalidateAccount } from '../lib/account-state'
import { invalidateCache as invalidateTourCache } from '../lib/tour-state'
import { invalidateCache as invalidatePrefsCache, loadPrefs } from '../lib/user-prefs'
import { resetCache as invalidateInvitesCache } from '../lib/invite-state'
import { invalidateRosterCache } from '../lib/family-roster'
import { requestNotificationPermission, scheduleBriefNotifications, registerPushToken } from '../lib/notifications'

SplashScreen.preventAutoHideAsync()
// Set the RN root view background color to warm bg immediately at module
// load — happens BEFORE any component renders. Belt-and-suspenders for
// the SystemUI plugin config in app.json.
SystemUI.setBackgroundColorAsync('#FAF8F5').catch(() => {})
// Add a fade to the splash hide so any residual transition is smoothed
// rather than being a hard cut that reveals the underlying UIWindow color.
SplashScreen.setOptions({ fade: true, duration: 300 })

export default function RootLayout() {
  const router = useRouter()
  const segments = useSegments()
  const [loaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_700Bold,
  })

  // Auth state — null until we've checked, then either authed or not.
  const [authed, setAuthed] = useState<boolean | null>(null)
  // Track when the root View has actually laid out. Splash stays visible
  // until this fires — bridges the "hideAsync returns success before first
  // frame paints" gap on iOS Fabric that would otherwise flash blue.
  const [hasLaidOut, setHasLaidOut] = useState(false)

  // ── Initial auth check on mount ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      const session = await getSession()
      if (session) {
        await loadProfile()
        setAuthed(!!getProfile())
      } else {
        setAuthed(false)
      }
    })()
  }, [])

  // ── Listen for auth changes (sign in / out from anywhere) ────────────
  useEffect(() => {
    const { data: sub } = onAuthChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Phase 2d — clear all user-scoped module caches so the new
        // user doesn't inherit the previous user's state. Each lib's
        // next loadX() call will re-hydrate from the correct profile.
        invalidateAccount()
        invalidateTourCache()
        invalidatePrefsCache()
        invalidateInvitesCache().catch(() => {})
        invalidateRosterCache()
        await loadProfile()
        setAuthed(!!getProfile())
      } else if (event === 'SIGNED_OUT') {
        invalidateAccount()
        invalidateTourCache()
        invalidatePrefsCache()
        invalidateInvitesCache().catch(() => {})
        invalidateRosterCache()
        setAuthed(false)
      }
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  // ── Hide native splash when fonts + auth + FIRST LAYOUT all done ────
  // The onLayout gate is critical on iOS with Fabric — hideAsync returns
  // success before the first frame actually paints, so hiding on just
  // (loaded && authed !== null) flashes the underlying UIWindow color.
  // Waiting for the root View's onLayout ensures the tree is ready to
  // paint before we drop the splash.
  useEffect(() => {
    if (loaded && authed !== null && hasLaidOut) SplashScreen.hideAsync()
  }, [loaded, authed, hasLaidOut])

  // ── AppState foreground refresh ─────────────────────────────────────
  // Session 29 — after returning from Stripe checkout (Safari → back to app),
  // reload the profile so the new subscription state shows immediately.
  // Also useful for any other out-of-app changes: beta grant flipped by
  // admin, webhook-triggered plan change, etc. Fires only on the transition
  // TO 'active' from a non-active state (background/inactive), so navigating
  // between apps within iOS doesn't hammer supabase.
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      const prev = appStateRef.current
      appStateRef.current = next
      if (next === 'active' && prev !== 'active' && authed) {
        try { await loadProfile() } catch (e: any) { console.log('[foreground] profile refresh failed:', e?.message) }
      }
    })
    return () => sub.remove()
  }, [authed])

  // ── Deep link debug listener ────────────────────────────────────────
  // Logs every URL the OS hands us (initial cold-start URL + URLs while
  // running). Helps verify the `zaeli://invite/<token>` scheme is firing
  // correctly when the QR is scanned from a second device. Expo Router
  // handles the actual routing automatically based on `scheme` in app.json.
  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (url) console.log('[link] initial URL:', url)
    })
    const sub = Linking.addEventListener('url', ({ url }) => {
      console.log('[link] incoming URL:', url)
    })
    return () => { sub.remove() }
  }, [])

  // ── Push notifications — Phase 3a ───────────────────────────────────
  // After auth completes, request notification permission (one-shot OS
  // prompt) and schedule the user's morning + evening brief notifications
  // from their preferences. Re-scheduling on prefs change is handled by
  // Settings calling scheduleBriefNotifications directly.
  useEffect(() => {
    if (!authed) return
    ;(async () => {
      try {
        const granted = await requestNotificationPermission()
        if (!granted) {
          console.log('[notifications] permission not granted — briefs still fire in-app on chat open')
          return
        }
        const prefs = await loadPrefs()
        await scheduleBriefNotifications({
          morningTime: prefs.briefMorningTime,
          eveningTime: prefs.briefEveningTime,
          morningOn:   prefs.briefMorningOn,
          eveningOn:   prefs.briefEveningOn,
        })
        // Session 29 — register Expo push token for family push notifications
        // (fire-and-forget; failures logged internally, don't block briefs).
        registerPushToken().catch(() => {})
      } catch (e: any) {
        console.log('[notifications] init error:', e?.message)
      }
    })()
  }, [authed])

  // ── Route guard ─────────────────────────────────────────────────────
  // If authed=false and user isn't already on /(auth) or /invite/[token],
  // redirect to sign-in. /invite/[token] is allowed unauthed so receivers
  // can land there from an SMS link.
  //
  // If authed=true and it's an OWNER who hasn't completed onboarding, route
  // to /onboarding first so first-time family owners get the orientation
  // flow (name/family/rhythm/preferences + tour offer) instead of landing
  // cold on Chat. Adult + kid invitees have their own inline onboarding
  // inside /invite/[token] and skip this gate.
  useEffect(() => {
    if (authed === null || !loaded) return
    const seg0 = segments[0] as string | undefined
    const inAuth   = seg0 === '(auth)'
    const inInvite = seg0 === 'invite'
    const inOnboarding = seg0 === 'onboarding'
    if (!authed && !inAuth && !inInvite && !inOnboarding) {
      router.replace('/(auth)/sign-in' as any)
      return
    }
    if (authed) {
      // Check onboarding_complete AsyncStorage flag for OWNER accounts.
      // Owners get the full onboarding sequence; adult/kid invitees do
      // their orientation inside /invite/[token] so they skip this gate.
      ;(async () => {
        const profile = getProfile()
        const isOwner = !profile || profile.kind === 'owner'
        if (!isOwner) {
          if (inAuth) router.replace('/(tabs)/swipe-world' as any)
          return
        }
        const done = await AsyncStorage.getItem('onboarding_complete')
        // Grandfather clause — profiles created before this gate existed
        // never set the AsyncStorage flag, so we'd yank Rich (and any
        // other pre-gate user) into onboarding on next reload. If the
        // profile is more than 24h old, treat as completed and stamp
        // the flag so this check is a no-op forever after.
        let effectiveDone = done === 'true'
        if (!effectiveDone && !inOnboarding && profile?.created_at) {
          const ageMs = Date.now() - new Date(profile.created_at).getTime()
          if (ageMs > 24 * 60 * 60 * 1000) {
            effectiveDone = true
            await AsyncStorage.setItem('onboarding_complete', 'true')
          }
        }
        if (!effectiveDone && !inOnboarding) {
          router.replace('/onboarding' as any)
        } else if (effectiveDone && inAuth) {
          router.replace('/(tabs)/swipe-world' as any)
        }
      })()
    }
  }, [authed, segments, loaded])

  if (!loaded || authed === null) return (
    <View
      style={{ flex: 1, backgroundColor: '#FAF8F5' }}
      onLayout={() => setHasLaidOut(true)}
    />
  )

  // Warm-bg container + Stack contentStyle both set to #FAF8F5 to prevent
  // the brief blue flash between Expo splash hiding and first screen render.
  // Under React Native New Architecture (Fabric — newArchEnabled: true in
  // app.json), the Stack/react-native-screens default background is a system
  // blue rather than transparent, so we need to override it explicitly.
  // The onLayout on the wrapper triggers the splash-hide gate (see auth
  // useEffect above) — splash stays visible until this View is ready to
  // paint, which prevents the blue frame between splash hide and paint.
  return (
    <View
      style={{ flex: 1, backgroundColor: '#FAF8F5' }}
      onLayout={() => setHasLaidOut(true)}
    >
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FAF8F5' },
      }} />
    </View>
  )
}
