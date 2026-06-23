import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { View, StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { colors } from '../lib/theme'
import MiniPlayer from '../components/MiniPlayer'
import { usePlayerStore } from '../lib/store'

export default function RootLayout() {
  const currentTrack = usePlayerStore(s => s.currentTrack)

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: colors.bgBase }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(drawer)" />
            <Stack.Screen
              name="player/index"
              options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="auth/login"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
          </Stack>
          {currentTrack && <MiniPlayer />}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
