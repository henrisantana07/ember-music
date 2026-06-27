'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlaylistsStore } from '@/lib/playlists-store'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import type { CoverSource } from '@/lib/playlist/resolveCover'

interface Props {
  open: boolean
  onClose: () => void
  playlistId: string
  currentCoverSource: CoverSource
  currentCoverUrl: string | null
}

export function PlaylistCoverModal({ open, onClose, playlistId, currentCoverSource, currentCoverUrl }: Props) {
  const [cropImage, setCropImage] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<Blob | null>(null)
  const [uploading, setUploading] = useState(false)
  const { updatePlaylistCover } = usePlaylistsStore()
  const supabase = createClient()
  const cropperRef = useRef<HTMLImageElement>(null)
  const cropperInstance = useRef<Cropper | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) {
      setCropImage(null)
      setCoverFile(null)
      cancelCrop()
    }
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

  async function handleUpload() {
    if (!coverFile) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    const filePath = `${user.id}/${playlistId}/cover.png`
    const { error: uploadError } = await supabase.storage
      .from('playlist-covers')
      .upload(filePath, coverFile, { upsert: true, contentType: 'image/png' })

    if (uploadError) {
      setUploading(false)
      alert('Erro ao enviar imagem')
      return
    }

    const { data: urlData } = supabase.storage.from('playlist-covers').getPublicUrl(filePath)
    const publicUrl = urlData.publicUrl + '?v=' + Date.now()

    await supabase
      .from('playlists')
      .update({
        cover_source: 'custom',
        custom_cover_url: publicUrl,
      })
      .eq('id', playlistId)

    updatePlaylistCover(playlistId, {
      cover_source: 'custom',
      custom_cover_url: publicUrl,
    })

    setCoverFile(null)
    setUploading(false)
    onClose()
  }

  async function handleRemove() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.storage
      .from('playlist-covers')
      .remove([`${user.id}/${playlistId}/cover.png`])

    const { count } = await supabase
      .from('playlist_tracks')
      .select('id', { count: 'exact', head: true })
      .eq('playlist_id', playlistId)

    if (count && count > 0) {
      const { data: lastTrack } = await supabase
        .from('playlist_tracks')
        .select('track_data')
        .eq('playlist_id', playlistId)
        .order('added_at', { ascending: false })
        .limit(1)
        .single()

      const lastCoverUrl = lastTrack?.track_data
        ? (lastTrack.track_data as { image?: string })?.image ?? null
        : null

      await supabase
        .from('playlists')
        .update({
          cover_source: 'track',
          custom_cover_url: null,
          last_track_cover_url: lastCoverUrl,
        })
        .eq('id', playlistId)

      updatePlaylistCover(playlistId, {
        cover_source: 'track',
        custom_cover_url: null,
        last_track_cover_url: lastCoverUrl,
      })
    } else {
      await supabase
        .from('playlists')
        .update({
          cover_source: 'branded',
          custom_cover_url: null,
          last_track_cover_url: null,
        })
        .eq('id', playlistId)

      updatePlaylistCover(playlistId, {
        cover_source: 'branded',
        custom_cover_url: null,
        last_track_cover_url: null,
      })
    }

    onClose()
  }

  const previewUrl = cropImage
    ? cropImage
    : coverFile
      ? URL.createObjectURL(coverFile)
      : currentCoverSource === 'custom'
        ? currentCoverUrl
        : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-6 shadow-xl"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      >
        <h2 className="text-lg font-bold mb-4">Foto da playlist</h2>

        {cropImage ? (
          <div className="mb-4">
            <div className="w-full max-h-80 flex items-center justify-center overflow-hidden rounded-lg">
              <img ref={cropperRef} src={cropImage} alt="Cortar" className="max-w-full" style={{ maxHeight: '320px' }} />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={confirmCrop}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}
              >
                Aplicar
              </button>
              <button
                onClick={cancelCrop}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className="w-28 h-28 mx-auto rounded-lg overflow-hidden mb-4"
              style={{
                background: previewUrl
                  ? `url(${previewUrl}) center/cover`
                  : 'linear-gradient(135deg, var(--accent-from), var(--accent-to))',
              }}
            >
              {!previewUrl && (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-10 h-10 opacity-50" fill="white" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              )}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-2 rounded-lg text-sm font-bold mb-3"
              style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}
            >
              {currentCoverSource === 'custom' ? 'Trocar imagem' : 'Selecionar imagem'}
            </button>

            {currentCoverSource === 'custom' && (
              <>
                <div className="border-t mb-3" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <button
                  onClick={handleRemove}
                  className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Remover capa personalizada
                </button>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
          </>
        )}

        {coverFile && !cropImage && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))', color: 'var(--bg-base)' }}
            >
              {uploading ? 'Enviando...' : 'Confirmar'}
            </button>
            <button
              onClick={() => setCoverFile(null)}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancelar
            </button>
          </div>
        )}

        {!cropImage && !coverFile && (
          <div className="flex justify-end mt-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
