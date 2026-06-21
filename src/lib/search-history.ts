import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export interface SearchHistoryItem {
  id: string
  query: string
  searched_at: string
}

export async function getSearchHistory(user: User | null): Promise<SearchHistoryItem[]> {
  if (!user) return []
  
  const supabase = createClient()
  const { data, error } = await supabase
    .from('search_history')
    .select('id, query, searched_at')
    .eq('user_id', user.id)
    .order('searched_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error('Error fetching search history:', error)
    return []
  }
  
  return data as SearchHistoryItem[]
}

export async function saveSearchHistory(user: User | null, query: string): Promise<void> {
  if (!user || !query.trim()) return
  
  const supabase = createClient()
  const trimmed = query.trim()
  
  // Upsert - update searched_at if already exists, otherwise insert
  const { error } = await supabase
    .from('search_history')
    .upsert(
      { user_id: user.id, query: trimmed, searched_at: new Date().toISOString() },
      { onConflict: 'user_id,query' }
    )
  
  if (error) {
    console.error('Error saving search history:', error)
  }
}

export async function deleteSearchHistoryItem(user: User | null, query: string): Promise<void> {
  if (!user || !query.trim()) return
  
  const supabase = createClient()
  const { error } = await supabase
    .from('search_history')
    .delete()
    .eq('user_id', user.id)
    .eq('query', query.trim())
  
  if (error) {
    console.error('Error deleting search history item:', error)
  }
}

export async function clearSearchHistory(user: User | null): Promise<void> {
  if (!user) return
  
  const supabase = createClient()
  const { error } = await supabase
    .from('search_history')
    .delete()
    .eq('user_id', user.id)
  
  if (error) {
    console.error('Error clearing search history:', error)
  }
}
