'use client'

export function ArtistHeaderSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ minHeight: 400, background: 'var(--bg-elevated)' }}>
      <div className="absolute inset-0 skeleton" />
      <div className="relative z-10 flex flex-col items-center justify-center gap-6 px-6 py-16">
        <div className="w-[200px] h-[200px] rounded-full skeleton" />
        <div className="h-10 w-64 rounded-lg skeleton" />
        <div className="h-4 w-40 rounded skeleton" />
        <div className="flex items-center gap-3 mt-2">
          <div className="h-10 w-28 rounded-full skeleton" />
          <div className="h-10 w-28 rounded-full skeleton" />
          <div className="h-10 w-10 rounded-full skeleton" />
        </div>
      </div>
    </div>
  )
}
