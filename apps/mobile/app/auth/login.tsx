import { useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../lib/theme'
import { supabase } from '../../lib/supabase'
import { router } from 'expo-router'
import { makeRedirectUri } from 'expo-linking'

export default function LoginScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const redirectUri = makeRedirectUri({ path: '/auth/callback' })
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUri },
      })
      if (error) setError(error.message)
    } catch (e: any) {
      setError(e.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgBase }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Text style={{ fontSize: 36, fontWeight: '800', color: colors.textPrimary }}>EmberMusic</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 8, textAlign: 'center' }}>
            Sua música, sua chama.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleGoogleLogin}
          disabled={loading}
          style={{ width: '100%', maxWidth: 320 }}
        >
          <LinearGradient
            colors={[colors.accentFrom, colors.accentTo]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              paddingVertical: 14, borderRadius: 24, opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 10 }}>
                  Entrar com Google
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {error ? (
          <Text style={{ color: colors.error, fontSize: 13, marginTop: 16, textAlign: 'center' }}>{error}</Text>
        ) : null}

        <TouchableOpacity
          style={{ marginTop: 24 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            Continuar sem login
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
