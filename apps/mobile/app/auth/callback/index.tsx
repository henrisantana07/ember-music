import { useEffect } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../../../lib/supabase'
import { colors } from '../../../lib/theme'

export default function AuthCallbackScreen() {
  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace('/(drawer)')
      } else {
        router.replace('/auth/login')
      }
    })
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgBase, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.accentSolid} />
      <Text style={{ color: colors.textSecondary, marginTop: 16, fontSize: 15 }}>Autenticando...</Text>
    </View>
  )
}
