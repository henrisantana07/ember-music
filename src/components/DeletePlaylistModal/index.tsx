'use client'

import { useState } from 'react'

interface DeletePlaylistModalProps {
  open: boolean
  playlistName: string
  onClose: () => void
  onConfirm: () => void
  deleting?: boolean
}

export function DeletePlaylistModal({ open, playlistName, onClose, onConfirm, deleting }: DeletePlaylistModalProps) {
  const [typed, setTyped] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (!open) return null

  function handleClose() {
    setTyped('')
    setSubmitted(false)
    onClose()
  }

  function handleConfirm() {
    setSubmitted(true)
    onConfirm()
  }

  const canConfirm = typed.toLowerCase() === playlistName.toLowerCase()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-6 shadow-xl"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(229,72,77,0.15)' }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="var(--error)" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold">Excluir playlist?</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>

        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{playlistName}</strong> será excluída permanentemente. Digite o nome da playlist para confirmar.
        </p>

        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Digite o nome da playlist"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none border mb-6"
          style={{
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            borderColor: submitted && !canConfirm ? 'var(--error)' : 'rgba(255,255,255,0.1)',
          }}
          disabled={deleting}
          autoFocus
        />

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ color: 'var(--text-secondary)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || deleting}
            className="px-5 py-2 rounded-lg text-sm font-bold transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--error)', color: 'white', opacity: canConfirm && !deleting ? 1 : 0.5 }}
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}
