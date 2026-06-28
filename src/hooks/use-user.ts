'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

let cachedUser: User | null | undefined = undefined
let loadingPromise: Promise<User | null> | null = null

export function useUser() {
  const [user, setUser] = useState<User | null>(cachedUser ?? null)
  const [loading, setLoading] = useState(cachedUser === undefined)

  useEffect(() => {
    if (cachedUser !== undefined) {
      setUser(cachedUser)
      setLoading(false)
      return
    }
    if (!loadingPromise) {
      const supabase = createClient()
      loadingPromise = supabase.auth.getUser().then(({ data }) => {
        cachedUser = data.user ?? null
        return cachedUser
      })
    }
    loadingPromise.then((u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  return { user, loading }
}
