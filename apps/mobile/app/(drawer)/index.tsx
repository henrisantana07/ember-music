import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { colors } from '../../lib/theme'
import type { Track } from '../../lib/types'
import * as api from '../../lib/api'
import TrackCard from '../../components/TrackCard'

function SectionRow({ title, tracks, onSeeAll }: { title: string; tracks: Track[]; onSeeAll?: () => void }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={{ fontSize: 13, color: colors.accentSolid }}>Ver todos</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        horizontal
        data={tracks}
        keyExtractor={item => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        renderItem={({ item }) => (
          <View style={{ width: 140, marginHorizontal: 4 }}>
            <TrackCard track={item} />
          </View>
        )}
      />
    </View>
  )
}

export default function HomeScreen() {
  const router = useRouter()
  const [trending, setTrending] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    setError('')
    try {
      const tracks = await api.getChartTracks(20)
      setTrending(tracks)
    } catch (e) {
      setError('Erro ao carregar. Verifique sua conexão.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchData()
  }, [fetchData])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgBase }} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentSolid} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>EmberMusic</Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')}>
              <Ionicons name="person-circle-outline" size={28} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={{ marginHorizontal: 16, marginBottom: 20 }}
          onPress={() => router.push('/(drawer)/buscar')}
        >
          <View style={{
            flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgElevated,
            borderRadius: 24, paddingHorizontal: 16, height: 44,
          }}>
            <Ionicons name="search" size={20} color={colors.textDisabled} />
            <Text style={{ color: colors.textDisabled, marginLeft: 10, fontSize: 15 }}>
              O que você quer ouvir?
            </Text>
          </View>
        </TouchableOpacity>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary }}>Carregando...</Text>
          </View>
        ) : error ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.error} />
            <Text style={{ color: colors.error, marginTop: 12, textAlign: 'center' }}>{error}</Text>
            <TouchableOpacity
              onPress={() => { setLoading(true); fetchData() }}
              style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: colors.accentSolid, borderRadius: 20 }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <SectionRow title="Em alta" tracks={trending.slice(0, 10)} />
            <SectionRow title="Recomendados para você" tracks={trending.slice(10, 15)} />
            <SectionRow title="Novos lançamentos" tracks={trending.slice(15)} />
          </>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  )
}
