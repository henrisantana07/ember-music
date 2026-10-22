'use client'

import { useRouter } from 'next/navigation'
import { Share2, Trash2 } from 'lucide-react'
import { MenuItem } from '@/components/ui/Menu'
import { shareContent } from '@/components/ShareButton'
import type { Track } from '@/types/music'

/**
 * Itens do menu "Mais opções" das faixas — fonte única de verdade.
 *
 * A fila da hero (`/reproducao`) e as tabelas de faixas (biblioteca →
 * Favoritos/Recentes/Baixadas, busca) compartilham os MESMOS ícones e as
 * MESMAS ações: quando um item ganha uma ação nova, os outros lugares
 * acompanham em vez de ficarem com o menu pela metade.
 *
 * Cada item recebe `onDone` para FECHAR o menu antes da ação — a ordem
 * importa no compartilhamento (a folha nativa do sistema precisa abrir sem o
 * menu por cima) e no "ver artista" (a rota troca a tela).
 */
export function MenuAddToPlaylistItem({ onClick }: { onClick: () => void }) {
  return (
    <MenuItem onClick={onClick}>
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Adicionar à playlist
    </MenuItem>
  )
}

export function MenuShareItem({ track, onDone }: { track: Track; onDone: () => void }) {
  return (
    <MenuItem
      onClick={() => {
        onDone()
        void shareContent({ title: track.name, text: `Ouça "${track.name}" de ${track.artist_name} no Ember Music` })
      }}
    >
      <Share2 className="w-5 h-5 flex-shrink-0" />
      Compartilhar
    </MenuItem>
  )
}

export function MenuArtistItem({
  track,
  onDone,
  onVisit,
}: {
  track: Track
  onDone: () => void
  /** Substitui a navegação padrão — a hero usa para fechar a si mesma antes de trocar de rota. */
  onVisit?: (artistId: string) => void
}) {
  const router = useRouter()

  return (
    <MenuItem
      onClick={() => {
        onDone()
        if (!track.artist_id) return
        if (onVisit) onVisit(track.artist_id)
        else router.push(`/artists/${track.artist_id}`)
      }}
    >
      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      Ver artista
    </MenuItem>
  )
}

/** Ação destrutiva — mesma lixeira da "Remover da fila" da hero. */
export function MenuRemoveItem({ label = 'Remover', onClick }: { label?: string; onClick: () => void }) {
  return (
    <MenuItem danger onClick={onClick}>
      <Trash2 className="w-5 h-5 flex-shrink-0" />
      {label}
    </MenuItem>
  )
}
