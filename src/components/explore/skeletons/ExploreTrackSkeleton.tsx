'use client'

export function ExploreTrackSkeleton({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg skeleton" style={{ minHeight: 64 }}>
        <div className="w-[56px] h-[56px] rounded-md skeleton flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-3/4 rounded skeleton" />
          <div className="h-3 w-1/2 rounded skeleton" />
        </div>
      </div>
    )
  }
  return (
    <div className="p-3 rounded-lg skeleton" style={{ minHeight: 88 }}>
      <div className="flex items-center gap-3">
        <div className="w-[56px] h-[56px] rounded-md skeleton flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-3/4 rounded skeleton" />
          <div className="h-3 w-1/2 rounded skeleton" />
        </div>
      </div>
    </div>
  )
}
