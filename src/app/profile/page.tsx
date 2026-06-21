'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [favCount, setFavCount] = useState(0)
  const [preferredGenre, setPreferredGenre] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return router.push('/login')
      setUser(data.user)
      loadProfile(data.user)
    })
  }, [])

  async function loadProfile(user: User) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      setDisplayName(profile.display_name ?? user.user_metadata?.full_name ?? '')
      setAvatarUrl(profile.avatar_url ?? user.user_metadata?.avatar_url ?? '')
      setPreferredGenre(profile.preferred_genre ?? '')
    }

    const { count } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    setFavCount(count ?? 0)
    setLoading(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    const ext = file.name.split('.').pop()
    const filePath = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const publicUrl = urlData.publicUrl

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, avatar_url: publicUrl })

    if (!updateError) setAvatarUrl(publicUrl)
    setUploading(false)
  }

  async function handleSave() {
    if (!user) return
    await supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName,
      preferred_genre: preferredGenre,
      avatar_url: avatarUrl,
    })
  }

  if (!user || loading) return null

  return (
    <div className="max-w-lg mx-auto pt-8">
      <h1 className="text-3xl font-bold mb-8">Seu Perfil</h1>

      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-24 h-24 rounded-full object-cover" />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}
            >
              {user.email?.[0].toUpperCase()}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center text-xs border-2"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--bg-surface)' }}
          >
            {uploading ? '...' : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
      </div>

      <div className="space-y-4 mb-8">
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Nome de exibição</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              '--tw-ring-color': 'var(--accent-solid)',
            } as React.CSSProperties}
          />
        </div>
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Gênero favorito</label>
          <input
            type="text"
            value={preferredGenre}
            onChange={(e) => setPreferredGenre(e.target.value)}
            placeholder="Ex: rock, jazz, electronic..."
            className="w-full px-4 py-2 rounded-lg border-none focus:ring-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              '--tw-ring-color': 'var(--accent-solid)',
            } as React.CSSProperties}
          />
        </div>
      </div>

      <div className="flex gap-6 mb-8">
        <div className="flex-1 p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <p className="text-2xl font-bold gradient-accent-text">{favCount}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Favoritas</p>
        </div>
        <div className="flex-1 p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <p className="text-2xl font-bold gradient-accent-text">{preferredGenre || '—'}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Gênero</p>
        </div>
      </div>

      <button onClick={handleSave} className="btn-primary w-full py-3">
        Salvar alterações
      </button>
    </div>
  )
}
