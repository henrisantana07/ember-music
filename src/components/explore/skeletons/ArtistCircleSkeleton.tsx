'use client'

export function ArtistCircleSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 w-24 flex-shrink-0">
      <div className="w-[96px] h-[96px] rounded-full skeleton" />
      <div className="h-3 w-20 rounded skeleton" />
    </div>
  )
}
