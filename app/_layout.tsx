import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts, DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display'
import { DMSans_300Light, DMSans_400Regular, DMSans_700Bold } from '@expo-google-fonts/dm-sans'
import * as SplashScreen from 'expo-splash-screen'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [loaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_700Bold,
  })

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync()
  }, [loaded])

  if (!loaded) return null

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}