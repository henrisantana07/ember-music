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

  const storePlaylist = usePlaylistsStore((s) => s.playlists.find((p) => p.id === playlist.id))
  const livePlaylist = storePlaylist ?? playlist
  const resolved = resolveCover(livePlaylist as any)
  const charsLeft = 80 - name.length

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <div
          className="w-full max-w-md rounded-xl p-6 shadow-xl overflow-y-auto max-h-[90vh]"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <h2 className="text-lg font-bold mb-4">Editar playlist</h2>

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
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
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
                  borderColor: name ? 'var(--accent-from)' : 'rgba(255,255,255,0.1)',
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
                  borderColor: 'rgba(255,255,255,0.1)',
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
                    border: !isPublic ? '2px solid transparent' : '2px solid rgba(255,255,255,0.1)',
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
                    border: isPublic ? '2px solid transparent' : '2px solid rgba(255,255,255,0.1)',
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
        currentCoverUrl={livePlaylist.custom_cover_url}
      />
    </>
  )
}
