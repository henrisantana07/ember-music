'use client'

import { Suspense } from 'react'
import { ExplorePage } from '@/components/explore/ExplorePage'

function ExploreResultsSkeleton() {
  return (
    <div className="mx-auto space-y-6" style={{ maxWidth: 1100, paddingLeft: 32, paddingRight: 32 }}>
      <div className="h-4 w-24 rounded skeleton mb-2" />
      <div className="h-8 w-64 rounded skeleton mb-8" />
      <div className="flex gap-6">
        <div className="flex-1 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded skeleton" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 rounded skeleton" />
                <div className="h-3 w-1/2 rounded skeleton" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded skeleton" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 rounded skeleton" />
                <div className="h-3 w-1/2 rounded skeleton" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<ExploreResultsSkeleton />}>
      <ExplorePage />
    </Suspense>
  )
}
