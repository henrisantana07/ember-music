import { memo } from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../lib/theme'
import { usePlayerStore } from '../lib/store'
import { formatDuration } from '../lib/utils'
import type { Track } from '../lib/types'

interface TrackCardProps {
  track: Track
  tracks?: Track[]
  showArtist?: boolean
}

const TrackCard = memo(function TrackCard({ track, tracks, showArtist = true }: TrackCardProps) {
  const currentTrack = usePlayerStore(s => s.currentTrack)
  const isPlaying = usePlayerStore(s => s.isPlaying)
  const play = usePlayerStore(s => s.play)

  const isCurrentTrack = currentTrack?.id === track.id
  const isTrackPlaying = isCurrentTrack && isPlaying

  const handlePlay = () => {
    if (isCurrentTrack) {
      usePlayerStore.getState().togglePlay()
    } else {
      play(track, tracks, tracks?.findIndex(t => t.id === track.id))
    }
  }

  return (
    <TouchableOpacity
      onPress={handlePlay}
      style={{
        width: '100%',
        backgroundColor: isCurrentTrack ? colors.accentMuted : 'transparent',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri: track.image }}
          style={{ width: '100%', aspectRatio: 1, borderRadius: 8 }}
        />
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          justifyContent: 'center', alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.3)', opacity: isCurrentTrack ? 0 : 0,
        }}>
          {isTrackPlaying ? (
            <Ionicons name="pause-circle" size={40} color="#fff" />
          ) : (
            <Ionicons name="play-circle" size={40} color="#fff" />
          )}
        </View>
      </View>
      <View style={{ padding: 6 }}>
        <Text
          style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }}
          numberOfLines={1}
        >
          {track.name}
        </Text>
        {showArtist && (
          <Text style={{ color: colors.textSecondary, fontSize: 11 }} numberOfLines={1}>
            {track.artist_name}
          </Text>
        )}
        <Text style={{ color: colors.textDisabled, fontSize: 10, marginTop: 1 }}>
          {formatDuration(track.duration)}
        </Text>
      </View>
    </TouchableOpacity>
  )
})

export default TrackCard
