import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Check your environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          preferred_genre: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          preferred_genre?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          preferred_genre?: string | null
          created_at?: string
        }
      }
      favorites: {
        Row: { id: string; user_id: string; track_id: string; track_data: Json; created_at: string }
        Insert: { id?: string; user_id: string; track_id: string; track_data: Json; created_at?: string }
        Update: { id?: string; user_id?: string; track_id?: string; track_data?: Json; created_at?: string }
      }
      followed_artists: {
        Row: { id: string; user_id: string; artist_id: string; artist_data: Json; followed_at: string }
        Insert: { id?: string; user_id: string; artist_id: string; artist_data: Json; followed_at?: string }
        Update: { id?: string; user_id?: string; artist_id?: string; artist_data?: Json; followed_at?: string }
      }
      listening_history: {
        Row: { id: string; user_id: string; track_id: string; track_data: Json; played_at: string }
        Insert: { id?: string; user_id: string; track_id: string; track_data: Json; played_at?: string }
        Update: { id?: string; user_id?: string; track_id?: string; track_data?: Json; played_at?: string }
      }
      playlists: {
        Row: { id: string; user_id: string; name: string; description: string | null; cover_url: string | null; cover_source: string; custom_cover_url: string | null; last_track_cover_url: string | null; collaborative: boolean | null; share_token: string | null; created_at: string }
        Insert: { id?: string; user_id: string; name: string; description?: string | null; cover_url?: string | null; cover_source?: string; custom_cover_url?: string | null; last_track_cover_url?: string | null; collaborative?: boolean | null; share_token?: string | null; created_at?: string }
        Update: { id?: string; user_id?: string; name?: string; description?: string | null; cover_url?: string | null; cover_source?: string; custom_cover_url?: string | null; last_track_cover_url?: string | null; collaborative?: boolean | null; share_token?: string | null; created_at?: string }
      }
      playlist_tracks: {
        Row: { id: string; playlist_id: string; track_id: string; track_data: Json; position: number; added_at: string }
        Insert: { id?: string; playlist_id: string; track_id: string; track_data: Json; position: number; added_at?: string }
        Update: { id?: string; playlist_id?: string; track_id?: string; track_data?: Json; position?: number; added_at?: string }
      }
      user_settings: {
        Row: { id: string; theme: string | null; language: string | null; audio_quality: string | null; autoplay: boolean | null; crossfade: boolean | null; crossfade_duration: number | null; volume_normalization: boolean | null; notif_favorite: boolean | null; notif_download: boolean | null; notif_error: boolean | null; notif_news: boolean | null; updated_at: string }
        Insert: { id?: string; theme?: string | null; language?: string | null; audio_quality?: string | null; autoplay?: boolean | null; crossfade?: boolean | null; crossfade_duration?: number | null; volume_normalization?: boolean | null; notif_favorite?: boolean | null; notif_download?: boolean | null; notif_error?: boolean | null; notif_news?: boolean | null; updated_at?: string }
        Update: { id?: string; theme?: string | null; language?: string | null; audio_quality?: string | null; autoplay?: boolean | null; crossfade?: boolean | null; crossfade_duration?: number | null; volume_normalization?: boolean | null; notif_favorite?: boolean | null; notif_download?: boolean | null; notif_error?: boolean | null; notif_news?: boolean | null; updated_at?: string }
      }
      search_history: {
        Row: { id: string; user_id: string; query: string; searched_at: string }
        Insert: { id?: string; user_id: string; query: string; searched_at?: string }
        Update: { id?: string; user_id?: string; query?: string; searched_at?: string }
      }
      push_tokens: {
        Row: { id: string; user_id: string; token: string; platform: string | null; created_at: string }
        Insert: { id?: string; user_id: string; token: string; platform?: string | null; created_at?: string }
        Update: { id?: string; user_id?: string; token?: string; platform?: string | null; created_at?: string }
      }
    }
  }
}
