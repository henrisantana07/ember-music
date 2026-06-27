'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePlaylistsStore } from '@/lib/playlists-store'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

const DEFAULT_COVER = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF6A00"/><stop offset="100%" stop-color="#FFC400"/></linearGradient></defs><rect width="512" height="512" fill="url(#g)"/><path d="M256 64v225.2c-12.6-7.3-27.1-11.8-42.7-11.8-47.1 0-85.3 38.2-85.3 85.3s38.2 85.3 85.3 85.3 85.3-38.2 85.3-85.3V149.3h85.3V64H256z" fill="white" opacity="0.6"/></svg>')

interface CreatePlaylistModalProps {
  open: boolean
  onClose: () => void
}

export function CreatePlaylistModal({ open, onClose }: CreatePlaylistModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [defaultCover, setDefaultCover] = useState<string | null>(null)
  const [hasFavorites, setHasFavorites] = useState(false)
  const [cropImage, setCropImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [coverFile, setCoverFile] = useState<Blob | null>(null)
  const { addPlaylist } = usePlaylistsStore()
  const supabase = createClient()
  const router = useRouter()
  const cropperRef = useRef<HTMLImageElement>(null)
  const cropperInstance = useRef<Cropper | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setDescription('')
    setIsPublic(false)
    setDefaultCover(null)
    setCropImage(null)
    setCoverFile(null)
    setHasFavorites(false)
    cancelCrop()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('favorites')
        .select('track_data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.track_data) {
            const track = data.track_data as { image?: string }
            if (track.image) { setDefaultCover(track.image); setHasFavorites(true) }
          }
        })
    })
  }, [open])

  if (!open) return null

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

  function getCoverPreview(): string | null {
    if (cropImage) return cropImage
    if (coverFile) return URL.createObjectURL(coverFile)
    if (defaultCover) return defaultCover
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    let coverUrl: string | null = null
    if (coverFile) {
      setUploading(true)
      const ext = 'png'
      const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('playlist-covers')
        .upload(filePath, coverFile, { upsert: true, contentType: 'image/png' })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('playlist-covers').getPublicUrl(filePath)
        coverUrl = urlData.publicUrl + '?v=' + Date.now()
      }
      setUploading(false)
    }

    const coverSource = coverFile ? 'custom' as const : defaultCover ? 'track' as const : 'branded' as const

    const { data, error } = await supabase
      .from('playlists')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        cover_source: coverSource,
        custom_cover_url: coverFile ? coverUrl : null,
        last_track_cover_url: !coverFile ? defaultCover : null,
        is_public: isPublic,
        user_id: user.id,
      })
      .select()
      .single()

    if (!error && data) {
      addPlaylist({ ...data, track_count: 0, cover_source: (data.cover_source ?? 'branded') as any })
      onClose()
      router.push(`/playlists/${data.id}`)
    }
    setSaving(false)
  }

  const coverPreview = getCoverPreview()
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
        <h2 className="text-lg font-bold mb-4">Nova playlist</h2>

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
                style={{ background: coverPreview ? `url(${coverPreview}) center/cover` : 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
              >
                {!coverPreview && (
                  <svg className="w-10 h-10 absolute inset-0 m-auto opacity-60" fill="white" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                )}
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
            <p className="text-sm font-medium truncate">{name || 'Nova playlist'}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {coverFile ? 'Capa personalizada' : defaultCover ? 'Capa do último favorito' : 'Capa padrão'}
            </p>
            {coverFile && (
              <button
                type="button"
                onClick={() => setCoverFile(null)}
                className="text-xs mt-1 underline"
                style={{ color: 'var(--accent-from)' }}
              >
                Remover capa
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1 flex justify-between" style={{ color: 'var(--text-secondary)' }}>
              <span>Nome</span>
              <span style={{ color: charsLeft < 10 ? 'var(--error)' : 'var(--text-disabled)' }}>{charsLeft}</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 80))}
              placeholder="Minha playlist"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none border transition-colors"
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
              placeholder="Uma descrição opcional..."
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
                  border: isPublic ? '2px solid rgba(255,255,255,0.1)' : '2px solid transparent',
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
              type="submit"
              disabled={!name.trim() || saving || uploading}
              className="px-5 py-2 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
                color: 'var(--bg-base)',
              }}
            >
              {uploading ? 'Enviando capa...' : saving ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
