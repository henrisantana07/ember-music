'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlaylistsStore } from '@/lib/playlists-store'
import { resolveCover } from '@/lib/playlist/resolveCover'
import { PlaylistCoverModal } from '@/components/playlist/PlaylistCoverModal'
import type { Database } from '@/types/database'

type PlaylistRow = Database['public']['Tables']['playlists']['Row']

interface EditPlaylistModalProps {
  open: boolean
  playlist: PlaylistRow | null
  onClose: () => void
}

export function EditPlaylistModal({ open, playlist, onClose }: EditPlaylistModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [coverModalOpen, setCoverModalOpen] = useState(false)
  const { updatePlaylist } = usePlaylistsStore()
  const supabase = createClient()

  useEffect(() => {
    if (playlist) {
      setName(playlist.name)
      setDescription(playlist.description ?? '')
      setIsPublic(playlist.is_public)
    }
  }, [playlist, open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !playlist) return null

  async function handleSave() {
    if (!name.trim() || !playlist) return
    setSaving(true)

    const { data } = await supabase
      .from('playlists')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        is_public: isPublic,
      })
      .eq('id', playlist.id)
      .select()
      .single()

    if (data) {
      updatePlaylist(playlist.id, data as any)
    }
    setSaving(false)
    onClose()
  }

  const resolved = resolveCover(playlist as any)
  const charsLeft = 80 - name.length

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--scrim)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-playlist-title"
          className="w-full max-w-md rounded-xl p-6 shadow-xl overflow-y-auto max-h-[90vh]"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <h2 id="edit-playlist-title" className="text-lg font-bold mb-4">Editar playlist</h2>

          <div className="flex gap-4 mb-5">
            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={() => setCoverModalOpen(true)}
                className="w-28 h-28 rounded-lg overflow-hidden relative group cursor-pointer"
                style={{ background: resolved.url ? `url(${resolved.url}) center/cover` : 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
              >
                {!resolved.url && (
                  <svg className="w-10 h-10 absolute inset-0 m-auto opacity-60" fill="white" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-scrim py-1 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                  <span className="text-label-small text-white">Trocar capa</span>
                </div>
              </button>
            </div>

            <div className="flex-1 min-w-0 self-center">
              <p className="text-sm font-medium truncate">{name || 'Sem nome'}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {resolved.source === 'custom' ? 'Capa personalizada' : resolved.source === 'track' ? 'Capa do último favorito' : 'Capa padrão'}
              </p>
              <button
                type="button"
                onClick={() => setCoverModalOpen(true)}
                className="text-xs mt-1 underline"
                style={{ color: 'var(--accent-from)' }}
              >
                Trocar imagem
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1 flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                <span>Nome</span>
                <span style={{ color: charsLeft < 10 ? 'var(--error)' : 'var(--text-disabled)' }}>{charsLeft}</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 80))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none border"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  borderColor: name ? 'var(--accent-from)' : 'var(--outline-variant)',
                }}
                autoFocus
                maxLength={80}
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Adicione uma descrição..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none border resize-none"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--outline-variant)',
                }}
                maxLength={300}
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                Visibilidade
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-all"
                  style={{
                    border: !isPublic ? '2px solid transparent' : '2px solid var(--outline-variant)',
                    background: !isPublic ? 'linear-gradient(var(--bg-elevated), var(--bg-elevated)) padding-box, linear-gradient(135deg, var(--accent-from), var(--accent-to)) border-box' : 'var(--bg-surface)',
                  }}
                >
                  <span className="text-lg">🔒</span>
                  <span className="text-sm font-medium">Privada</span>
                  <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>Só você pode ver e ouvir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-all"
                  style={{
                    border: isPublic ? '2px solid transparent' : '2px solid var(--outline-variant)',
                    background: isPublic ? 'linear-gradient(var(--bg-elevated), var(--bg-elevated)) padding-box, linear-gradient(135deg, var(--accent-from), var(--accent-to)) border-box' : 'var(--bg-surface)',
                  }}
                >
                  <span className="text-lg">🌐</span>
                  <span className="text-sm font-medium">Pública</span>
                  <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>Qualquer pessoa pode encontrar e ouvir</span>
                </button>
              </div>
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
                type="button"
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="px-5 py-2 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
                  color: 'var(--bg-base)',
                }}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <PlaylistCoverModal
        open={coverModalOpen}
        onClose={() => setCoverModalOpen(false)}
        playlistId={playlist.id}
        currentCoverSource={resolved.source}
        currentCoverUrl={playlist.custom_cover_url}
      />
    </>
  )
}
