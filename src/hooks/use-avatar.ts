'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

let cachedUrl: string | null | undefined = undefined

export function useAvatar(userId: string | undefined) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(cachedUrl ?? null)

  useEffect(() => {
    if (!userId) return
    if (cachedUrl !== undefined) {
      setAvatarUrl(cachedUrl)
      return
    }
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single()
      .then(({ data: profile }) => {
        const url = profile?.avatar_url ?? null
        cachedUrl = url
        setAvatarUrl(url)
      })
  }, [userId])

  useEffect(() => {
    function onAvatarUpdated() {
      cachedUrl = undefined
      if (!userId) return
      const supabase = createClient()
      supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single()
        .then(({ data: profile }) => {
          const url = profile?.avatar_url ?? null
          cachedUrl = url
          setAvatarUrl(url)
        })
    }
    window.addEventListener('avatar-updated', onAvatarUpdated)
    return () => window.removeEventListener('avatar-updated', onAvatarUpdated)
  }, [userId])

  return avatarUrl
}
