import { useEffect, useState } from 'react'
import { View, Linking } from 'react-native'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts, DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display'
import { DMSans_300Light, DMSans_400Regular, DMSans_700Bold } from '@expo-google-fonts/dm-sans'
import * as SplashScreen from 'expo-splash-screen'
import { getSession, loadProfile, onAuthChange, getProfile } from '../lib/auth'
import { invalidateAccount } from '../lib/account-state'
import { invalidateCache as invalidateTourCache } from '../lib/tour-state'
import { invalidateCache as invalidatePrefsCache, loadPrefs } from '../lib/user-prefs'
import { resetCache as invalidateInvitesCache } from '../lib/invite-state'
import { invalidateRosterCache } from '../lib/family-roster'
import { requestNotificationPermission, scheduleBriefNotifications } from '../lib/notifications'

SplashScreen.preventAutoHideAsync()

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

  // ── Hide native splash when fonts + first auth check both done ───────
  useEffect(() => {
    if (loaded && authed !== null) SplashScreen.hideAsync()
  }, [loaded, authed])

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
      } catch (e: any) {
        console.log('[notifications] init error:', e?.message)
      }
    })()
  }, [authed])

  // ── Route guard ─────────────────────────────────────────────────────
  // If authed=false and user isn't already on /(auth) or /invite/[token],
  // redirect to sign-in. /invite/[token] is allowed unauthed so receivers
  // can land there from an SMS link.
  useEffect(() => {
    if (authed === null || !loaded) return
    const seg0 = segments[0] as string | undefined
    const inAuth   = seg0 === '(auth)'
    const inInvite = seg0 === 'invite'
    const inOnboarding = seg0 === 'onboarding'
    if (!authed && !inAuth && !inInvite && !inOnboarding) {
      router.replace('/(auth)/sign-in' as any)
    } else if (authed && inAuth) {
      // Just signed in while on the sign-in screen — bounce home
      router.replace('/(tabs)/swipe-world' as any)
    }
  }, [authed, segments, loaded])

  if (!loaded || authed === null) return <View style={{ flex: 1, backgroundColor: '#FAF8F5' }} />

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
