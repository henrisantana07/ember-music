import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, Image, Dimensions, PanResponder } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Slider from '@react-native-community/slider'
import { router } from 'expo-router'
import { Audio } from 'expo-av'
import { colors } from '../../lib/theme'
import { usePlayerStore } from '../../lib/store'
import { formatDuration } from '../../lib/utils'
import QueueSheet from '../../components/QueueSheet'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const ARTWORK_SIZE = SCREEN_WIDTH - 64

export default function PlayerScreen() {
  const { currentTrack, isPlaying, progress, duration, volume, repeat, shuffle, queue, play, pause, resume, next, prev, togglePlay, setProgress, setVolume, setRepeat, toggleShuffle, setDuration } = usePlayerStore()
  const soundRef = useRef<Audio.Sound | null>(null)
  const [queueVisible, setQueueVisible] = useState(false)

  useEffect(() => {
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!currentTrack?.audio) return
    loadTrack(currentTrack.audio)
    return () => { soundRef.current?.unloadAsync() }
  }, [currentTrack?.id])

  const loadTrack = async (uri: string) => {
    try {
      if (soundRef.current) await soundRef.current.unloadAsync()
      const { sound, status } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: isPlaying, volume, progressUpdateIntervalMillis: 250 },
      )
      soundRef.current = sound
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded) {
          setProgress(status.positionMillis / 1000)
          setDuration(status.durationMillis ? status.durationMillis / 1000 : 0)
          if (status.didJustFinish) next()
        }
      })
    } catch (e) {
      console.error('Failed to load track', e)
    }
  }

  useEffect(() => {
    if (!soundRef.current) return
    if (isPlaying) soundRef.current.playAsync()
    else soundRef.current.pauseAsync()
  }, [isPlaying])

  useEffect(() => {
    soundRef.current?.setVolumeAsync(volume)
  }, [volume])

  const handleSeek = async (value: number) => {
    setProgress(value)
    await soundRef.current?.setPositionAsync(value * 1000)
  }

  const handleTogglePlay = () => {
    if (isPlaying) pause()
    else resume()
  }

  if (!currentTrack) return null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgBase }} edges={['top']}>
      <LinearGradient
        colors={[colors.bgElevated, colors.bgBase]}
        style={{ flex: 1 }}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <Ionicons name="chevron-down" size={28} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={{ color: colors.textSecondary, fontSize: 13, alignSelf: 'center' }}>Tocando agora</Text>
          <TouchableOpacity style={{ padding: 8 }}>
            <Ionicons name="ellipsis-vertical" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Image
            source={{ uri: currentTrack.image }}
            style={{ width: ARTWORK_SIZE, height: ARTWORK_SIZE, borderRadius: 16 }}
          />

          <View style={{ width: '100%', marginTop: 32 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700' }} numberOfLines={1}>
              {currentTrack.name}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 15, marginTop: 4 }} numberOfLines={1}>
              {currentTrack.artist_name}
            </Text>
          </View>

          <View style={{ width: '100%', marginTop: 20 }}>
            <Slider
              style={{ width: '100%', height: 40 }}
              value={progress}
              minimumValue={0}
              maximumValue={duration || 1}
              onSlidingComplete={handleSeek}
              minimumTrackTintColor={colors.accentFrom}
              maximumTrackTintColor={colors.textDisabled}
              thumbTintColor={colors.accentSolid}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textDisabled, fontSize: 12 }}>{formatDuration(progress)}</Text>
              <Text style={{ color: colors.textDisabled, fontSize: 12 }}>{formatDuration(duration)}</Text>
            </View>
          </View>

          <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', marginTop: 16 }}>
            <TouchableOpacity onPress={toggleShuffle}>
              <Ionicons
                name="shuffle"
                size={24}
                color={shuffle ? colors.accentSolid : colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={prev}>
              <Ionicons name="play-skip-back" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleTogglePlay}
              style={{
                width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center',
              }}
            >
              <LinearGradient
                colors={[colors.accentFrom, colors.accentTo]}
                style={{ width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' }}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={32}
                  color="#fff"
                  style={{ marginLeft: isPlaying ? 0 : 3 }}
                />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={next}>
              <Ionicons name="play-skip-forward" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRepeat(repeat === 'none' ? 'all' : repeat === 'all' ? 'one' : 'none')}>
              <Ionicons
                name="repeat"
                size={24}
                color={repeat !== 'none' ? colors.accentSolid : colors.textSecondary}
              />
              {repeat === 'one' && (
                <Text style={{ position: 'absolute', fontSize: 9, fontWeight: '800', color: colors.accentSolid, top: -4, right: -4 }}>1</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 12 }}>
            <Ionicons name="volume-low" size={18} color={colors.textDisabled} />
            <Slider
              style={{ flex: 1, height: 30 }}
              value={volume}
              onSlidingComplete={setVolume}
              minimumValue={0}
              maximumValue={1}
              minimumTrackTintColor={colors.textSecondary}
              maximumTrackTintColor={colors.textDisabled}
              thumbTintColor={colors.textPrimary}
            />
            <Ionicons name="volume-high" size={18} color={colors.textDisabled} />
          </View>
        </View>

        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: colors.bgElevated }}
          onPress={() => setQueueVisible(true)}
        >
          <Ionicons name="list" size={20} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: 14, marginLeft: 8 }}>A seguir ({queue.length} faixas)</Text>
          <Ionicons name="chevron-up" size={18} color={colors.textDisabled} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </LinearGradient>

      {queueVisible && <QueueSheet onClose={() => setQueueVisible(false)} />}
    </SafeAreaView>
  )
}
