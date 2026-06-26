'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function FavoritesRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/biblioteca')
  }, [router])

  return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-from)', borderTopColor: 'transparent' }} />
    </div>
  )
}
