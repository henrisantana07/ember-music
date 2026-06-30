'use client'

import dynamic from 'next/dynamic'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const NowPlaying = dynamic(() => import('@/components/NowPlaying'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div
        className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--accent-from)', borderTopColor: 'transparent' }}
      />
    </div>
  ),
})

export default function ReproducaoPage() {
  return (
    <div className="h-full -m-4 md:-m-6 -mt-5 pb-0 overflow-hidden">
      <ErrorBoundary>
        <NowPlaying />
      </ErrorBoundary>
    </div>
  )
}
