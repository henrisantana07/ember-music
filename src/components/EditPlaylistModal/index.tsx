'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlaylistsStore } from '@/lib/playlists-store'
import { resolveCover } from '@/lib/playlist/resolveCover'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
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
  const [cropImage, setCropImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [coverFile, setCoverFile] = useState<Blob | null>(null)
  const { updatePlaylist } = usePlaylistsStore()
  const supabase = createClient()
  const cropperRef = useRef<HTMLImageElement>(null)
  const cropperInstance = useRef<Cropper | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (playlist) {
      setName(playlist.name)
      setDescription(playlist.description ?? '')
      setIsPublic(playlist.is_public)
      setCoverFile(null)
      setCropImage(null)
      cancelCrop()
    }
  }, [playlist, open])

  if (!open || !playlist) return null

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('A imagem deve ter no máximo 5MB'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { alert('Formato inválido. Use JPEG, PNG ou WebP.'); return }
    const reader = new FileReader()
    reader.onload = () => {
      setCropImage(reader.result as string)
      setCoverFile(null)
      setTimeout(() => {
        if (cropperRef.current) {
          if (cropperInstance.current) cropperInstance.current.destroy()
          cropperInstance.current = new Cropper(cropperRef.current, {
            aspectRatio: 1,
            viewMode: 1,
            minCropBoxWidth: 120,
            minCropBoxHeight: 120,
            cropBoxResizable: true,
            dragMode: 'move',
          })
        }
      }, 100)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function confirmCrop() {
    if (!cropperInstance.current) return
    const canvas = cropperInstance.current.getCroppedCanvas({ width: 512, height: 512 })
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (blob) setCoverFile(blob)
      setCropImage(null)
      if (cropperInstance.current) { cropperInstance.current.destroy(); cropperInstance.current = null }
    }, 'image/png')
  }

  function cancelCrop() {
    setCropImage(null)
    if (cropperInstance.current) { cropperInstance.current.destroy(); cropperInstance.current = null }
  }

  async function handleSave() {
    if (!name.trim() || !playlist) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    let newCustomCoverUrl = playlist.custom_cover_url

    if (coverFile) {
      setUploading(true)
      const filePath = `${user.id}/${playlist.id}/cover.png`
      const { error: uploadError } = await supabase.storage
        .from('playlist-covers')
        .upload(filePath, coverFile, { upsert: true, contentType: 'image/png' })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('playlist-covers').getPublicUrl(filePath)
        newCustomCoverUrl = urlData.publicUrl + '?v=' + Date.now()
      }
      setUploading(false)
    }

    const baseUpdate = {
      name: name.trim(),
      description: description.trim() || null,
      is_public: isPublic,
    }

    const updatePayload = coverFile
      ? { ...baseUpdate, cover_source: 'custom' as const, custom_cover_url: newCustomCoverUrl }
      : baseUpdate

    const { data } = await supabase
      .from('playlists')
      .update(updatePayload)
      .eq('id', playlist.id)
      .select()
      .single()

    if (data) {
      updatePlaylist(playlist.id, data as any)
    }
    setSaving(false)
    onClose()
  }

  function getPreview(): string | null {
    if (cropImage) return cropImage
    if (coverFile) return URL.createObjectURL(coverFile)
    const resolved = resolveCover(playlist! as any)
    return resolved.url
  }

  const preview = getPreview()
  const charsLeft = 80 - name.length

  return (
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
            {cropImage ? (
              <div className="w-28 h-28 rounded-lg overflow-hidden">
                <img ref={cropperRef} src={cropImage} alt="Cortar" className="max-w-full" style={{ maxHeight: '200px' }} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-28 h-28 rounded-lg overflow-hidden relative group cursor-pointer"
                style={{ background: preview ? `url(${preview}) center/cover` : 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
              >
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
          </div>

          <div className="flex-1 min-w-0 self-center">
            <p className="text-sm font-medium truncate">{name || 'Sem nome'}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {coverFile ? 'Nova capa selecionada' : 'Clique na capa para alterar'}
            </p>
            {coverFile && (
              <button
                type="button"
                onClick={() => setCoverFile(null)}
                className="text-xs mt-1 underline"
                style={{ color: 'var(--accent-from)' }}
              >
                Remover
              </button>
            )}
            {cropImage && (
              <div className="flex gap-2 mt-2">
                <button onClick={confirmCrop} className="text-xs px-3 py-1 rounded font-bold" style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}>Aplicar</button>
                <button onClick={cancelCrop} className="text-xs px-3 py-1 rounded" style={{ color: 'var(--text-secondary)' }}>Cancelar</button>
              </div>
            )}
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
              disabled={!name.trim() || saving || uploading}
              className="px-5 py-2 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
                color: 'var(--bg-base)',
              }}
            >
              {uploading ? 'Enviando capa...' : saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
