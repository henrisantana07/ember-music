import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TextInput, FlatList, ScrollView, TouchableOpacity, ActivityIndicator, Keyboard } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../lib/theme'
import type { Track, Artist, Album } from '../../lib/types'
import * as api from '../../lib/api'
import TrackCard from '../../components/TrackCard'
import { Image } from 'expo-image'

const FILTERS = [
  { key: 'track', label: 'Faixas' },
  { key: 'artist', label: 'Artistas' },
  { key: 'album', label: 'Álbuns' },
]

export default function BuscarScreen() {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('track')
  const [results, setResults] = useState<Track[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    setHasSearched(true)
    try {
      const [trackResults, artistResults, albumResults] = await Promise.all([
        api.searchTracks(q, 20),
        api.searchArtists(q, 5),
        api.searchAlbums(q, 5),
      ])
      setResults(trackResults)
      setArtists(artistResults)
      setAlbums(albumResults)
    } catch (e) {
      console.error('Search error', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) doSearch(query)
    }, 400)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  const filteredTracks = activeFilter === 'track' ? results : activeFilter === 'artist' ? [] : []

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgBase }} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgElevated,
          borderRadius: 24, paddingHorizontal: 16, height: 44,
        }}>
          <Ionicons name="search" size={20} color={colors.textDisabled} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Artista, faixa ou álbum..."
            placeholderTextColor={colors.textDisabled}
            style={{ flex: 1, color: colors.textPrimary, marginLeft: 10, fontSize: 15 }}
            returnKeyType="search"
            onSubmitEditing={() => doSearch(query)}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setHasSearched(false); setResults([]) }}>
              <Ionicons name="close-circle" size={20} color={colors.textDisabled} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={f => f.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, marginBottom: 12 }}
        renderItem={({ item }) => {
          const isActive = activeFilter === item.key
          return (
            <TouchableOpacity
              onPress={() => setActiveFilter(item.key)}
              style={{
                paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                marginRight: 8, backgroundColor: isActive ? colors.accentMuted : 'transparent',
                borderWidth: 1, borderColor: isActive ? colors.accentSolid : colors.textDisabled,
              }}
            >
              <Text style={{ color: isActive ? colors.accentSolid : colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )
        }}
      />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accentSolid} />
        </View>
      ) : !hasSearched ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <Ionicons name="musical-notes-outline" size={64} color={colors.textDisabled} />
          <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 16, textAlign: 'center' }}>
            Descubra novas músicas{'\n'}Comece sua busca acima
          </Text>
        </View>
      ) : activeFilter === 'track' ? (
        <FlatList
          data={filteredTracks}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 12 }}>
              <TrackCard track={item} />
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.textDisabled, textAlign: 'center', marginTop: 40 }}>
              Nenhuma faixa encontrada
            </Text>
          }
        />
      ) : activeFilter === 'artist' ? (
        <FlatList
          data={artists}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Image source={{ uri: item.image }} style={{ width: 56, height: 56, borderRadius: 28 }} />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{item.followers} seguidores</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.textDisabled, textAlign: 'center', marginTop: 40 }}>
              Nenhum artista encontrado
            </Text>
          }
        />
      ) : (
        <FlatList
          data={albums}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Image source={{ uri: item.image }} style={{ width: 56, height: 56, borderRadius: 8 }} />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{item.artist_name}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.textDisabled, textAlign: 'center', marginTop: 40 }}>
              Nenhum álbum encontrado
            </Text>
          }
        />
      )}
    </SafeAreaView>
  )
}


