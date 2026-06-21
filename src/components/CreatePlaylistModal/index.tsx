'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlaylistsStore } from '@/lib/playlists-store'

interface CreatePlaylistModalProps {
  open: boolean
  onClose: () => void
}

export function CreatePlaylistModal({ open, onClose }: CreatePlaylistModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const { addPlaylist } = usePlaylistsStore()
  const supabase = createClient()

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    const { data, error } = await supabase
      .from('playlists')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        user_id: user.id,
      })
      .select()
      .single()

    if (!error && data) {
      addPlaylist({ ...data, track_count: 0 })
      setName('')
      setDescription('')
      onClose()
    }
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-xl p-6 shadow-xl"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      >
        <h2 className="text-lg font-bold mb-4">Criar playlist</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Minha playlist"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border transition-colors"
              style={{
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                borderColor: name ? 'var(--accent-from)' : 'var(--border-color, rgba(255,255,255,0.1))',
              }}
              autoFocus
              maxLength={100}
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Uma descrição opcional..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border resize-none"
              style={{
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                borderColor: 'rgba(255,255,255,0.1)',
              }}
              maxLength={300}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="px-5 py-2 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
                color: 'var(--bg-base)',
              }}
            >
              {saving ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
