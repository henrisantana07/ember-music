'use client'

import { useEffect, useState } from 'react'

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstall, setShowInstall] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstall(false)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    if (result.outcome === 'accepted') setShowInstall(false)
    setDeferredPrompt(null)
  }

  if (!showInstall) return null

  return (
    <div className="fixed bottom-28 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 rounded-xl p-4 shadow-xl border border-white/5 animate-fade-in"
      style={{ backgroundColor: 'var(--bg-elevated)' }}>
      <p className="text-sm font-semibold mb-1">Instale o Ember Music</p>
      <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
        Adicione à tela inicial para uma experiência completa.
      </p>
      <div className="flex gap-2">
        <button onClick={handleInstall}
          className="btn-primary text-xs flex-1 justify-center py-2">
          Instalar
        </button>
        <button onClick={() => setShowInstall(false)}
          className="btn-secondary text-xs flex-1 justify-center py-2">
          Agora não
        </button>
      </div>
    </div>
  )
}
