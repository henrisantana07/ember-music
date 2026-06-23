import { useState, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { colors } from '../../lib/theme'
import { supabase } from '../../lib/supabase'

interface LibraryItem {
  id: string
  name: string
  description: string | null
  cover_url: string | null
  track_count: number
  type: 'history' | 'favorites' | 'playlist' | 'downloads'
}

export default function BibliotecaScreen() {
  const router = useRouter()
  const [items, setItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }
        setUserId(user.id)

        const builtIn: LibraryItem[] = [
          { id: 'history', name: 'Histórico', description: 'Músicas tocadas recentemente', cover_url: null, track_count: 0, type: 'history' },
          { id: 'favorites', name: 'Favoritos', description: 'Suas músicas favoritas', cover_url: null, track_count: 0, type: 'favorites' },
          { id: 'downloads', name: 'Baixadas', description: 'Músicas disponíveis offline', cover_url: null, track_count: 0, type: 'downloads' },
        ]

        const { data: playlists } = await supabase
          .from('playlists')
          .select('id, name, description, cover_url')
          .eq('user_id', user.id)

        const playlistItems: LibraryItem[] = (playlists || []).map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          cover_url: p.cover_url,
          track_count: 0,
          type: 'playlist' as const,
        }))

        setItems([...builtIn, ...playlistItems])
      } catch (e) {
        console.error('Erro ao carregar biblioteca', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const getIcon = (type: string) => {
    switch (type) {
      case 'history': return 'time-outline'
      case 'favorites': return 'heart-outline'
      case 'downloads': return 'download-outline'
      default: return 'musical-note-outline'
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgBase }} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>Biblioteca</Text>
      </View>
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accentSolid} />
        </View>
      ) : !userId ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="library-outline" size={64} color={colors.textDisabled} />
          <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 16 }}>Faça login para ver sua biblioteca</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
              onPress={() => {
                if (item.type === 'history') router.push('/(drawer)/biblioteca')
                else if (item.type === 'playlist') router.push(`/(drawer)/biblioteca?id=${item.id}`)
                else if (item.type === 'favorites') router.push('/(drawer)/favoritos')
              }}
            >
              <View style={{
                width: 56, height: 56, borderRadius: 8, backgroundColor: colors.bgElevated,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Ionicons name={getIcon(item.type) as any} size={28} color={colors.accentSolid} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
                {item.description && (
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 1 }}>{item.description}</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  )
}
