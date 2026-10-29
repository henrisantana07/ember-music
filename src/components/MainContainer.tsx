'use client'

import { CustomScroll } from '@/components/CustomScroll'

export function MainContainer({ children }: { children: React.ReactNode }) {
  return (
    <CustomScroll
      className="px-4 md:px-6 py-5 flex flex-col pb-24 md:pb-5"
      wrapperClassName="main-container flex-1 min-h-0"
    >
      {children}
    </CustomScroll>
  )
}
