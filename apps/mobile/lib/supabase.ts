import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Check your environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
