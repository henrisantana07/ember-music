'use client'

import dynamic from 'next/dynamic'

const NowPlaying = dynamic(() => import('@/components/NowPlaying'), { ssr: false })

export default function ReproducaoPage() {
  return (
    <div className="h-full -m-4 md:-m-6 -mt-5 pb-0">
      <NowPlaying />
    </div>
  )
}
