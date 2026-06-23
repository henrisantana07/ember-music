import { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { colors } from '../../lib/theme'
import { supabase } from '../../lib/supabase'
import type { Track } from '../../lib/types'
import TrackCard from '../../components/TrackCard'

export default function FavoritosScreen() {
  const router = useRouter()
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const fetchFavorites = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); setRefreshing(false); return }
    setUserId(user.id)
    const { data } = await supabase
      .from('favorites')
      .select('track_data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setTracks(data.map(d => d.track_data as unknown as Track))
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { fetchFavorites() }, [fetchFavorites])

  if (!userId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgBase, justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="heart-outline" size={64} color={colors.textDisabled} />
        <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 16 }}>Faça login para ver seus favoritos</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgBase }} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>Favoritos</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 2 }}>{tracks.length} faixas</Text>
      </View>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accentSolid} />
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchFavorites} tintColor={colors.accentSolid} />}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 12 }}><TrackCard track={item} /></View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Ionicons name="heart-outline" size={48} color={colors.textDisabled} />
              <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Nenhum favorito ainda</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
