'use client'

import { WifiOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function OfflinePage() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-6 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <WifiOff size={40} style={{ color: 'var(--text-secondary)' }} />
      </div>
      <div>
        <h1 className="text-2xl font-bold mb-2">Você está offline</h1>
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
          Conecte-se à internet para continuar ouvindo música. Suas músicas em cache ainda podem estar disponíveis.
        </p>
      </div>
      <button
        onClick={() => router.refresh()}
        className="btn-primary text-sm"
      >
        Tentar novamente
      </button>
    </div>
  )
}
