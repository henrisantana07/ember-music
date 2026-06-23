import { useEffect, useRef } from 'react'
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Modal, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../lib/theme'
import { usePlayerStore } from '../lib/store'
import { formatDuration } from '../lib/utils'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

interface QueueSheetProps {
  onClose: () => void
}

export default function QueueSheet({ onClose }: QueueSheetProps) {
  const queue = usePlayerStore(s => s.queue)
  const currentTrack = usePlayerStore(s => s.currentTrack)
  const play = usePlayerStore(s => s.play)
  const removeFromQueue = usePlayerStore(s => s.removeFromQueue)
  const clearQueue = usePlayerStore(s => s.clearQueue)

  const handleTrackPress = (track: typeof currentTrack, index: number) => {
    if (track) play(track, queue, index)
  }

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>A seguir</Text>
          <TouchableOpacity onPress={clearQueue}>
            <Text style={styles.clearBtn}>Limpar</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={queue}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item, index }) => {
            const isCurrent = currentTrack?.id === item.id
            return (
              <TouchableOpacity
                style={[styles.trackItem, isCurrent && { backgroundColor: colors.accentMuted }]}
                onPress={() => handleTrackPress(item, index)}
              >
                <Image source={{ uri: item.image }} style={styles.artwork} />
                <View style={styles.trackInfo}>
                  <Text style={[styles.trackName, isCurrent && { color: colors.accentSolid }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.artistName} numberOfLines={1}>{item.artist_name}</Text>
                </View>
                <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
                <TouchableOpacity onPress={() => removeFromQueue(index)} style={styles.removeBtn}>
                  <Ionicons name="close" size={18} color={colors.textDisabled} />
                </TouchableOpacity>
              </TouchableOpacity>
            )
          }}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.75,
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textDisabled,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  clearBtn: { color: colors.accentSolid, fontSize: 14 },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  artwork: { width: 44, height: 44, borderRadius: 6 },
  trackInfo: { flex: 1, marginLeft: 12 },
  trackName: { color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
  artistName: { color: colors.textSecondary, fontSize: 12, marginTop: 1 },
  duration: { color: colors.textDisabled, fontSize: 12, marginRight: 8 },
  removeBtn: { padding: 4 },
})
