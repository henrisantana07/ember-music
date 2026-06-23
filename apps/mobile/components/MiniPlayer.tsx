import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { colors } from '../lib/theme'
import { usePlayerStore } from '../lib/store'

export default function MiniPlayer() {
  const currentTrack = usePlayerStore(s => s.currentTrack)
  const isPlaying = usePlayerStore(s => s.isPlaying)
  const progress = usePlayerStore(s => s.progress)
  const duration = usePlayerStore(s => s.duration)
  const togglePlay = usePlayerStore(s => s.togglePlay)
  const next = usePlayerStore(s => s.next)
  const setProgress = usePlayerStore(s => s.setProgress)

  if (!currentTrack) return null

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${Math.min(progressPercent, 100)}%` }]} />
      </View>
      <TouchableOpacity
        style={styles.content}
        activeOpacity={0.8}
        onPress={() => router.push('/player')}
      >
        <Image source={{ uri: currentTrack.image }} style={styles.artwork} />
        <View style={styles.info}>
          <Text style={styles.trackName} numberOfLines={1}>{currentTrack.name}</Text>
          <Text style={styles.artistName} numberOfLines={1}>{currentTrack.artist_name}</Text>
        </View>
        <TouchableOpacity style={styles.controlBtn} onPress={(e) => { e.stopPropagation(); togglePlay() }}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={(e) => { e.stopPropagation(); next() }}>
          <Ionicons name="play-skip-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgElevated,
  },
  progressBar: {
    height: 2,
    backgroundColor: colors.textDisabled,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accentFrom,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 12,
    gap: 10,
  },
  artwork: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  info: {
    flex: 1,
  },
  trackName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  artistName: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  controlBtn: {
    padding: 8,
  },
})
