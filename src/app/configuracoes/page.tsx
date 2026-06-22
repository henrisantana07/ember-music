'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Toggle } from '@/components/Settings/Toggle'
import { Slider } from '@/components/Settings/Slider'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import type { User } from '@supabase/supabase-js'

type Section = 'perfil' | 'aparencia' | 'reproducao' | 'notificacoes'

interface UserSettings {
  theme: string
  language: string
  audio_quality: string
  autoplay: boolean
  crossfade: boolean
  crossfade_duration: number
  volume_normalization: boolean
  notif_favorite: boolean
  notif_download: boolean
  notif_error: boolean
  notif_news: boolean
}

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'aparencia', label: 'Aparência' },
  { id: 'reproducao', label: 'Reprodução' },
  { id: 'notificacoes', label: 'Notificações' },
]

function SaveIndicator({ saving, saved }: { saving: boolean; saved: boolean }) {
  if (saving) return <span className="text-xs ml-2" style={{ color: 'var(--text-disabled)' }}>Salvando…</span>
  if (saved) return <span className="text-xs ml-2" style={{ color: 'var(--success)' }}>✓ Salvo</span>
  return null
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<Section>('perfil')

  // Profile state
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [email, setEmail] = useState('')
  const [memberSince, setMemberSince] = useState('')
  const [favCount, setFavCount] = useState(0)
  const [preferredGenre, setPreferredGenre] = useState('')

  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [cropImage, setCropImage] = useState<string | null>(null)
  const cropperRef = useRef<HTMLImageElement>(null)
  const cropperInstance = useRef<Cropper | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Settings state
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'dark',
    language: 'pt-BR',
    audio_quality: 'normal',
    autoplay: true,
    crossfade: false,
    crossfade_duration: 5,
    volume_normalization: true,
    notif_favorite: true,
    notif_download: true,
    notif_error: true,
    notif_news: true,
  })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  // --- Auth & Load ---
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return router.push('/login')
      setUser(data.user)
      setEmail(data.user.email ?? '')
      loadData(data.user)
    })
  }, [])

  async function loadData(user: User) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      setDisplayName(profile.display_name ?? user.user_metadata?.full_name ?? '')
      setBio(profile.bio ?? '')
      setAvatarUrl(profile.avatar_url ?? user.user_metadata?.avatar_url ?? '')
      setPreferredGenre(profile.preferred_genre ?? '')
    }

    const { count } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    setFavCount(count ?? 0)

    const created = user.created_at
    if (created) {
      const d = new Date(created)
      const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
      setMemberSince(`Membro desde ${meses[d.getMonth()]} de ${d.getFullYear()}`)
    }

    const { data: us } = await supabase
      .from('user_settings')
      .select('*')
      .eq('id', user.id)
      .single()

    if (us) {
      setSettings({
        theme: us.theme ?? 'dark',
        language: us.language ?? 'pt-BR',
        audio_quality: us.audio_quality ?? 'normal',
        autoplay: us.autoplay ?? true,
        crossfade: us.crossfade ?? false,
        crossfade_duration: us.crossfade_duration ?? 5,
        volume_normalization: us.volume_normalization ?? true,
        notif_favorite: us.notif_favorite ?? true,
        notif_download: us.notif_download ?? true,
        notif_error: us.notif_error ?? true,
        notif_news: us.notif_news ?? true,
      })
    }

    setLoading(false)
  }

  // --- Auto-save helpers ---
  const saveProfileField = useCallback(
    async (field: 'display_name' | 'bio' | 'preferred_genre', value: string) => {
      if (!user) return
      setProfileSaving(true)
      setProfileSaved(false)
      const payload: Record<string, string> = { id: user.id }
      if (field === 'display_name') payload.display_name = value
      else if (field === 'bio') payload.bio = value
      else payload.preferred_genre = value
      const { error } = await supabase.from('profiles').upsert(payload as any)
      setProfileSaving(false)
      if (!error) {
        setProfileSaved(true)
        setTimeout(() => setProfileSaved(false), 2000)
      }
    },
    [user, supabase],
  )

  const saveSettingsField = useCallback(
    async (field: string, value: unknown) => {
      if (!user) return
      setSettingsSaving(true)
      setSettingsSaved(false)
      const payload: Record<string, unknown> = { id: user.id, updated_at: new Date().toISOString() }
      payload[field] = value
      const { error } = await supabase.from('user_settings').upsert(payload as any)
      setSettingsSaving(false)
      if (!error) {
        setSettingsSaved(true)
        setTimeout(() => setSettingsSaved(false), 2000)
      }
    },
    [user, supabase],
  )

  // --- Text field debounce ---
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bioTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const genreTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleNameChange(v: string) {
    if (v.length > 50) return
    setDisplayName(v)
    if (nameTimer.current) clearTimeout(nameTimer.current)
    nameTimer.current = setTimeout(() => saveProfileField('display_name', v), 800)
  }

  function handleBioChange(v: string) {
    if (v.length > 160) return
    setBio(v)
    if (bioTimer.current) clearTimeout(bioTimer.current)
    bioTimer.current = setTimeout(() => saveProfileField('bio', v), 800)
  }

  function handleGenreChange(v: string) {
    setPreferredGenre(v)
    if (genreTimer.current) clearTimeout(genreTimer.current)
    genreTimer.current = setTimeout(() => saveProfileField('preferred_genre', v), 800)
  }

  // --- Avatar crop ---
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('A foto deve ter no máximo 5MB')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Formato inválido. Use JPEG, PNG ou WebP.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setCropImage(reader.result as string)
      setTimeout(() => {
        if (cropperRef.current) {
          if (cropperInstance.current) cropperInstance.current.destroy()
          cropperInstance.current = new Cropper(cropperRef.current, {
            aspectRatio: 1,
            viewMode: 1,
            minCropBoxWidth: 80,
            minCropBoxHeight: 80,
            cropBoxResizable: true,
            dragMode: 'move',
          })
        }
      }, 100)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function confirmCrop() {
    if (!cropperInstance.current || !user) return
    const canvas = cropperInstance.current.getCroppedCanvas({ width: 512, height: 512 })
    if (!canvas) return

    setAvatarUploading(true)
    canvas.toBlob(async (blob) => {
      if (!blob) { setAvatarUploading(false); return }
      const ext = 'png'
      const filePath = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType: 'image/png' })

      if (uploadError) {
        alert('Erro ao fazer upload. Tente novamente.')
        setAvatarUploading(false)
        return
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const publicUrl = urlData.publicUrl
      const { error: updateError } = await supabase.from('profiles').upsert({ id: user.id, avatar_url: publicUrl })
      if (!updateError) {
        setAvatarUrl(publicUrl)
      }
      setAvatarUploading(false)
      setCropImage(null)
      if (cropperInstance.current) { cropperInstance.current.destroy(); cropperInstance.current = null }
    }, 'image/png')
  }

  function cancelCrop() {
    setCropImage(null)
    if (cropperInstance.current) { cropperInstance.current.destroy(); cropperInstance.current = null }
  }

  // --- Theme ---
  function handleThemeChange(theme: string) {
    setSettings((s) => ({ ...s, theme }))
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light')
    } else {
      document.documentElement.classList.remove('theme-light')
    }
    try { localStorage.setItem('ember-theme', theme) } catch { }
    saveSettingsField('theme', theme)
  }

  // --- Language ---
  function handleLanguageChange(lang: string) {
    setSettings((s) => ({ ...s, language: lang }))
    saveSettingsField('language', lang)
    setTimeout(() => {
      if (confirm('A página será recarregada para aplicar o idioma.')) {
        window.location.reload()
      }
    }, 500)
  }

  // --- Delete account ---
  async function handleDeleteAccount() {
    if (!user || deleteConfirm !== 'EXCLUIR') return
    // Delete profile and settings, then sign out
    await supabase.from('profiles').delete().eq('id', user.id)
    await supabase.from('user_settings').delete().eq('id', user.id)
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleSignOutAll() {
    if (!user) return
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/login')
  }

  if (!user || loading) return null

  return (
    <div className="max-w-4xl mx-auto">
      {/* Mobile tabs */}
      <div className="flex md:hidden gap-1 mb-6 overflow-x-auto hide-scrollbar">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className="px-4 py-2 text-sm rounded-full whitespace-nowrap transition-colors"
            style={{
              backgroundColor: activeSection === s.id ? 'var(--bg-elevated)' : 'transparent',
              color: activeSection === s.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-8">
        {/* Desktop sidebar menu */}
        <nav className="hidden md:block w-[200px] shrink-0 sticky top-0 self-start" style={{ paddingTop: '2px' }}>
          <div className="space-y-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors text-left"
                style={{
                  backgroundColor: activeSection === s.id ? 'var(--bg-elevated)' : 'transparent',
                  color: activeSection === s.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                {activeSection === s.id && (
                  <span className="w-0.5 h-4 shrink-0 rounded-full" style={{ background: 'linear-gradient(180deg, var(--accent-from), var(--accent-to))' }} />
                )}
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0" style={{ maxWidth: 680 }}>
          {/* Save indicator */}
          <div className="flex items-center justify-end h-6 mb-4">
            <SaveIndicator saving={settingsSaving} saved={settingsSaved} />
          </div>

          {activeSection === 'perfil' && (
            <section>
              <h2 className="text-2xl font-bold mb-6">Perfil</h2>

              {/* Avatar + Stats */}
              <div className="flex items-start gap-6 mb-8">
                <div className="relative group shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}>
                      {displayName?.[0]?.toUpperCase() || user.email?.[0].toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {avatarUploading ? (
                      <span className="text-xs">Enviando…</span>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-[10px]">Trocar foto</span>
                      </div>
                    )}
                  </button>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <div className="p-3 rounded-lg min-w-[100px] text-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
                    <p className="text-xl font-bold gradient-accent-text">{favCount}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Favoritas</p>
                  </div>
                  <div className="p-3 rounded-lg min-w-[100px] text-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
                    <p className="text-xl font-bold gradient-accent-text">{preferredGenre || '—'}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Gênero</p>
                  </div>
                  <div className="flex items-center">
                    <SaveIndicator saving={profileSaving} saved={profileSaved} />
                  </div>
                </div>
              </div>

              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />

              {/* Crop modal */}
              {cropImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={cancelCrop}>
                  <div
                    className="p-6 rounded-xl max-w-lg w-full mx-4"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-lg font-bold mb-4">Ajustar foto</h3>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Arraste para reposicionar e use as bordas para redimensionar.</p>
                    <div className="w-full max-h-80 flex items-center justify-center overflow-hidden rounded-lg" style={{ backgroundColor: 'var(--bg-base)' }}>
                      <img ref={cropperRef} src={cropImage} alt="Crop" className="max-w-full" style={{ maxHeight: '320px' }} />
                    </div>
                    <div className="flex gap-2 mt-4 justify-end">
                      <button onClick={cancelCrop} className="px-4 py-2 text-sm rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                        Cancelar
                      </button>
                      <button onClick={confirmCrop} disabled={avatarUploading} className="btn-primary text-sm">
                        {avatarUploading ? 'Enviando…' : 'Aplicar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Display name */}
              <div className="mb-5">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Nome de exibição</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  maxLength={50}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-solid)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--bg-elevated)'}
                />
                <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-secondary)' }}>{displayName.length}/50</p>
              </div>

              {/* Gênero favorito */}
              <div className="mb-5">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Gênero musical favorito</label>
                <input
                  type="text"
                  value={preferredGenre}
                  onChange={(e) => handleGenreChange(e.target.value)}
                  placeholder="Ex: rock, jazz, electronic…"
                  className="w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-solid)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--bg-elevated)'}
                />
              </div>

              {/* Bio */}
              <div className="mb-5">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => handleBioChange(e.target.value)}
                  maxLength={160}
                  rows={3}
                  placeholder="Conte um pouco sobre seu gosto musical…"
                  className="w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none resize-y"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-solid)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--bg-elevated)'}
                />
                <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-secondary)' }}>{bio.length}/160</p>
              </div>

              {/* Read-only info */}
              <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <p className="text-sm mb-1">
                  <span style={{ color: 'var(--text-secondary)' }}>E-mail: </span>
                  <span>{email}</span>
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Conta Google — não editável</p>
              </div>
              <p className="text-xs mb-6" style={{ color: 'var(--text-secondary)' }}>{memberSince}</p>

              {/* Danger zone */}
              <hr className="my-8" style={{ borderColor: 'var(--bg-elevated)' }} />
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--error)' }}>Zona de perigo</h3>
              <div className="space-y-3">
                <button onClick={handleSignOutAll} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                  Sair de todos os dispositivos
                </button>
                <div>
                  <button
                    onClick={() => setDeleteModalOpen(true)}
                    className="px-4 py-2 text-sm rounded-lg"
                    style={{ backgroundColor: 'var(--error)', color: '#fff' }}
                  >
                    Excluir conta
                  </button>
                </div>
              </div>

              {/* Delete modal */}
              {deleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteModalOpen(false)}>
                  <div
                    className="p-6 rounded-xl max-w-sm w-full mx-4"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h3 className="text-lg font-bold mb-2">Excluir conta</h3>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                      Esta ação é irreversível. Digite <strong>EXCLUIR</strong> para confirmar.
                    </p>
                    <input
                      type="text"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder="Digite EXCLUIR"
                      className="w-full px-3 py-2 rounded-lg border text-sm mb-4 focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setDeleteModalOpen(false); setDeleteConfirm('') }}
                        className="px-4 py-2 text-sm rounded-lg"
                        style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirm !== 'EXCLUIR'}
                        className="px-4 py-2 text-sm rounded-lg"
                        style={{
                          backgroundColor: deleteConfirm === 'EXCLUIR' ? 'var(--error)' : 'var(--bg-surface)',
                          color: deleteConfirm === 'EXCLUIR' ? '#fff' : 'var(--text-disabled)',
                          cursor: deleteConfirm === 'EXCLUIR' ? 'pointer' : 'not-allowed',
                          opacity: deleteConfirm === 'EXCLUIR' ? 1 : 0.4,
                        }}
                      >
                          Confirmar exclusão
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeSection === 'aparencia' && (
            <section>
              <h2 className="text-2xl font-bold mb-6">Aparência</h2>

              {/* Theme */}
              <div className="mb-8">
                <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Tema</label>
                <div className="grid grid-cols-2 gap-4 max-w-sm">
                  {[
                    { id: 'dark', label: 'Escuro', bg: '#0A0908', surface: '#161311', accent: '#FF6A00' },
                    { id: 'light', label: 'Claro', bg: '#FAF8F5', surface: '#F0EDE8', accent: '#FF6A00' },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeChange(theme.id)}
                      className="p-4 rounded-xl text-left transition-all"
                      style={{
                        backgroundColor: theme.bg,
                        border: `2px solid ${settings.theme === theme.id ? 'var(--accent-solid)' : 'transparent'}`,
                        outline: settings.theme === theme.id ? '2px solid var(--accent-from)' : 'none',
                        outlineOffset: '1px',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.accent }} />
                        <span className="text-xs font-medium" style={{ color: theme.id === 'dark' ? '#F5F1ED' : '#1A1512' }}>{theme.label}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-2 rounded" style={{ backgroundColor: theme.surface, width: '80%' }} />
                        <div className="h-2 rounded" style={{ backgroundColor: theme.surface, width: '60%' }} />
                        <div className="h-2 rounded" style={{ backgroundColor: theme.surface, width: '40%' }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Idioma</label>
                <select
                  value={settings.language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="px-4 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    minWidth: 200,
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent-solid)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--bg-elevated)'}
                >
                  <option value="pt-BR">Português (BR)</option>
                  <option value="en">English</option>
                </select>
              </div>
            </section>
          )}

          {activeSection === 'reproducao' && (
            <section>
              <h2 className="text-2xl font-bold mb-6">Preferências de Reprodução</h2>

              <div className="space-y-6 max-w-sm">
                {/* Audio quality */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Qualidade de áudio</label>
                  <div className="flex gap-3">
                    {[
                      { value: 'normal', label: 'Normal (128kbps)' },
                      { value: 'high', label: 'Alta (256kbps)' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setSettings((s) => ({ ...s, audio_quality: opt.value }))
                          saveSettingsField('audio_quality', opt.value)
                        }}
                        className="px-4 py-2.5 rounded-lg border text-sm transition-colors"
                        style={{
                          backgroundColor: settings.audio_quality === opt.value ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                          borderColor: settings.audio_quality === opt.value ? 'var(--accent-solid)' : 'var(--bg-elevated)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>Qualidade mais alta usa mais dados de internet</p>
                </div>

                {/* Autoplay */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Autoplay</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Tocar automaticamente a próxima faixa</p>
                  </div>
                  <Toggle
                    checked={settings.autoplay}
                    onChange={(v) => {
                      setSettings((s) => ({ ...s, autoplay: v }))
                      saveSettingsField('autoplay', v)
                    }}
                  />
                </div>

                {/* Crossfade */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Crossfade</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Transição suave entre faixas</p>
                  </div>
                  <Toggle
                    checked={settings.crossfade}
                    onChange={(v) => {
                      setSettings((s) => ({ ...s, crossfade: v }))
                      saveSettingsField('crossfade', v)
                    }}
                  />
                </div>
                {settings.crossfade && (
                  <div className="pl-4">
                    <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Transição de {settings.crossfade_duration} segundos entre faixas</p>
                    <Slider
                      value={settings.crossfade_duration}
                      onChange={(v) => {
                        setSettings((s) => ({ ...s, crossfade_duration: v }))
                        saveSettingsField('crossfade_duration', v)
                      }}
                      min={0}
                      max={12}
                      step={1}
                    />
                  </div>
                )}

                {/* Volume normalization */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Normalização de volume</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Equalizar o volume entre faixas</p>
                  </div>
                  <Toggle
                    checked={settings.volume_normalization}
                    onChange={(v) => {
                      setSettings((s) => ({ ...s, volume_normalization: v }))
                      saveSettingsField('volume_normalization', v)
                    }}
                  />
                </div>
              </div>
            </section>
          )}

          {activeSection === 'notificacoes' && (
            <section>
              <h2 className="text-2xl font-bold mb-1">Notificações</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Alertas exibidos dentro do EmberMusic</p>

              <div className="space-y-5 max-w-sm">
                {[
                  { key: 'notif_favorite', label: 'Confirmação ao favoritar', desc: 'Exibir confirmação ao favoritar uma faixa' },
                  { key: 'notif_download', label: 'Aviso de download', desc: 'Notificar quando o download de uma faixa for concluído' },
                  { key: 'notif_error', label: 'Alertas de erro', desc: 'Avisar quando uma faixa não puder ser reproduzida' },
                  { key: 'notif_news', label: 'Novidades do EmberMusic', desc: 'Anúncios sobre novas funcionalidades do app' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                    </div>
                    <Toggle
                      checked={settings[item.key as keyof UserSettings] as boolean}
                      onChange={(v) => {
                        setSettings((s) => ({ ...s, [item.key]: v }))
                        saveSettingsField(item.key, v)
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
