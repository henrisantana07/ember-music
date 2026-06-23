import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Switch, TextInput, Image, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../lib/theme'
import { supabase } from '../../lib/supabase'
import { router } from 'expo-router'

const THEMES = [
  { key: 'dark', label: 'Escuro', icon: 'moon-outline' },
  { key: 'light', label: 'Claro', icon: 'sunny-outline' },
]

const LANGUAGES = [
  { key: 'pt-BR', label: 'Português (Brasil)' },
  { key: 'en', label: 'English' },
]

export default function ConfiguracoesScreen() {
  const [settings, setSettings] = useState<any>({
    theme: 'dark', language: 'pt-BR', audio_quality: 'normal',
    autoplay: true, crossfade: false, crossfade_duration: 3,
    volume_normalization: false, notif_favorite: true, notif_download: true,
    notif_error: true, notif_news: false,
  })
  const [profile, setProfile] = useState<any>({ display_name: '', bio: '' })
  const [user, setUser] = useState<any>(null)
  const [activeSection, setActiveSection] = useState('profile')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (prof) setProfile(prof)
      const { data: sets } = await supabase.from('user_settings').select('*').eq('id', user.id).single()
      if (sets) {
        const { id, updated_at, ...rest } = sets
        setSettings((prev: any) => ({ ...prev, ...rest }))
      }
    })()
  }, [])

  const saveSettings = async (updates: any) => {
    if (!user) return
    setSaving(true)
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    await supabase.from('user_settings').upsert({ id: user.id, ...newSettings, updated_at: new Date().toISOString() })
    setSaving(false)
  }

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').upsert({ id: user.id, ...profile })
    setSaving(false)
  }

  const sections = [
    { key: 'profile', label: 'Perfil', icon: 'person-outline' },
    { key: 'appearance', label: 'Aparência', icon: 'color-palette-outline' },
    { key: 'playback', label: 'Reprodução', icon: 'musical-notes-outline' },
    { key: 'notifications', label: 'Notificações', icon: 'notifications-outline' },
    { key: 'about', label: 'Sobre', icon: 'information-circle-outline' },
  ]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgBase }} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.textPrimary }}>Configurações</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {sections.map(section => (
          <TouchableOpacity
            key={section.key}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 }}
            onPress={() => setActiveSection(prev => prev === section.key ? '' : section.key)}
          >
            <Ionicons name={section.icon as any} size={22} color={colors.textSecondary} />
            <Text style={{ color: colors.textPrimary, fontSize: 16, marginLeft: 12, flex: 1 }}>{section.label}</Text>
            <Ionicons
              name={activeSection === section.key ? 'chevron-up' : 'chevron-down'}
              size={20} color={colors.textDisabled}
            />
          </TouchableOpacity>
        ))}

        {activeSection === 'profile' && user && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 16 }}>
            <View style={{ alignItems: 'center' }}>
              <Image
                source={{ uri: profile.avatar_url || 'https://ui-avatars.com/api/?name=User&background=FF6A00&color=fff' }}
                style={{ width: 80, height: 80, borderRadius: 40 }}
              />
              <Text style={{ color: colors.accentSolid, fontSize: 14, marginTop: 8 }}>Alterar foto</Text>
            </View>
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>Nome de exibição</Text>
              <TextInput
                value={profile.display_name || ''}
                onChangeText={v => setProfile((p: any) => ({ ...p, display_name: v }))}
                onBlur={saveProfile}
                style={{ backgroundColor: colors.bgElevated, color: colors.textPrimary, borderRadius: 8, padding: 12, fontSize: 15 }}
                placeholderTextColor={colors.textDisabled}
              />
            </View>
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>Bio</Text>
              <TextInput
                value={profile.bio || ''}
                onChangeText={v => setProfile((p: any) => ({ ...p, bio: v }))}
                onBlur={saveProfile}
                multiline
                style={{ backgroundColor: colors.bgElevated, color: colors.textPrimary, borderRadius: 8, padding: 12, fontSize: 15, minHeight: 60 }}
                placeholderTextColor={colors.textDisabled}
              />
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.bgElevated, paddingTop: 16, marginTop: 8 }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center' }}
                onPress={async () => {
                  Alert.alert('Sair', 'Tem certeza que deseja sair?', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Sair', style: 'destructive', onPress: async () => {
                      await supabase.auth.signOut()
                      router.replace('/auth/login')
                    }},
                  ])
                }}
              >
                <Ionicons name="log-out-outline" size={22} color={colors.error} />
                <Text style={{ color: colors.error, fontSize: 16, marginLeft: 12 }}>Sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeSection === 'appearance' && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 16 }}>
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>Tema</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {THEMES.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => saveSettings({ theme: t.key })}
                    style={{
                      flex: 1, padding: 16, borderRadius: 12, alignItems: 'center',
                      backgroundColor: settings.theme === t.key ? colors.accentMuted : colors.bgElevated,
                      borderWidth: 1, borderColor: settings.theme === t.key ? colors.accentSolid : 'transparent',
                    }}
                  >
                    <Ionicons name={t.icon as any} size={28} color={settings.theme === t.key ? colors.accentSolid : colors.textSecondary} />
                    <Text style={{ color: colors.textPrimary, marginTop: 8, fontWeight: '600' }}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>Idioma</Text>
              {LANGUAGES.map(l => (
                <TouchableOpacity
                  key={l.key}
                  onPress={() => saveSettings({ language: l.key })}
                  style={{
                    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 4,
                    backgroundColor: settings.language === l.key ? colors.accentMuted : 'transparent',
                  }}
                >
                  <Text style={{ color: colors.textPrimary, fontSize: 15 }}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {activeSection === 'playback' && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 16 }}>
            <SettingRow label="Qualidade normal" value={settings.audio_quality === 'normal'} onToggle={v => saveSettings({ audio_quality: v ? 'normal' : 'high' })} />
            <SettingRow label="Auto-play" value={settings.autoplay} onToggle={v => saveSettings({ autoplay: v })} />
            <SettingRow label="Crossfade" value={settings.crossfade} onToggle={v => saveSettings({ crossfade: v })} />
            {settings.crossfade && (
              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>Duração do crossfade: {settings.crossfade_duration}s</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[3, 6, 9, 12].map(d => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => saveSettings({ crossfade_duration: d })}
                      style={{
                        padding: 8, borderRadius: 8,
                        backgroundColor: settings.crossfade_duration === d ? colors.accentMuted : colors.bgElevated,
                      }}
                    >
                      <Text style={{ color: settings.crossfade_duration === d ? colors.accentSolid : colors.textSecondary }}>{d}s</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <SettingRow label="Normalização de volume" value={settings.volume_normalization} onToggle={v => saveSettings({ volume_normalization: v })} />
          </View>
        )}

        {activeSection === 'notifications' && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 16 }}>
            <SettingRow label="Favoritar" value={settings.notif_favorite} onToggle={v => saveSettings({ notif_favorite: v })} />
            <SettingRow label="Download concluído" value={settings.notif_download} onToggle={v => saveSettings({ notif_download: v })} />
            <SettingRow label="Erros de reprodução" value={settings.notif_error} onToggle={v => saveSettings({ notif_error: v })} />
            <SettingRow label="Novidades" value={settings.notif_news} onToggle={v => saveSettings({ notif_news: v })} />
          </View>
        )}

        {activeSection === 'about' && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8, alignItems: 'center', gap: 8 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>EmberMusic</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Versão 1.0.0</Text>
            <Text style={{ color: colors.textDisabled, fontSize: 13, textAlign: 'center', marginTop: 8 }}>
              Sua música, sua chama.{'\n'}Feito com ♥
            </Text>
          </View>
        )}

        {saving && (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 16, fontSize: 12 }}>Salvando...</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function SettingRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
      <Text style={{ color: colors.textPrimary, fontSize: 15 }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.textDisabled, true: colors.accentSolid }}
        thumbColor="#fff"
      />
    </View>
  )
}
