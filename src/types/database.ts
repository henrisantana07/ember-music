export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      favorites: {
        Row: {
          created_at: string | null
          id: string
          track_data: Json | null
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          track_data?: Json | null
          track_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          track_data?: Json | null
          track_id?: string
          user_id?: string
        }
        Relationships: []
      }
      followed_artists: {
        Row: {
          artist_data: Json | null
          artist_id: string
          followed_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          artist_data?: Json | null
          artist_id: string
          followed_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          artist_data?: Json | null
          artist_id?: string
          followed_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      listening_history: {
        Row: {
          id: string
          played_at: string | null
          track_data: Json | null
          track_id: string
          user_id: string
        }
        Insert: {
          id?: string
          played_at?: string | null
          track_data?: Json | null
          track_id: string
          user_id: string
        }
        Update: {
          id?: string
          played_at?: string | null
          track_data?: Json | null
          track_id?: string
          user_id?: string
        }
        Relationships: []
      }
      playlist_tracks: {
        Row: {
          added_at: string | null
          id: string
          playlist_id: string
          position: number | null
          track_data: Json | null
          track_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          playlist_id: string
          position?: number | null
          track_data?: Json | null
          track_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          playlist_id?: string
          position?: number | null
          track_data?: Json | null
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_albums: {
        Row: {
          added_at: string | null
          album_data: Json | null
          album_id: string
          id: string
          playlist_id: string
          position: number | null
        }
        Insert: {
          added_at?: string | null
          album_data?: Json | null
          album_id: string
          id?: string
          playlist_id: string
          position?: number | null
        }
        Update: {
          added_at?: string | null
          album_data?: Json | null
          album_id?: string
          id?: string
          playlist_id?: string
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "playlist_albums_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          collaborative: boolean | null
          cover_source: string
          cover_url: string | null
          created_at: string | null
          custom_cover_url: string | null
          description: string | null
          id: string
          is_public: boolean
          last_track_cover_url: string | null
          name: string
          share_token: string | null
          user_id: string
        }
        Insert: {
          collaborative?: boolean | null
          cover_source?: string
          cover_url?: string | null
          created_at?: string | null
          custom_cover_url?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          last_track_cover_url?: string | null
          name: string
          share_token?: string | null
          user_id: string
        }
        Update: {
          collaborative?: boolean | null
          cover_source?: string
          cover_url?: string | null
          created_at?: string | null
          custom_cover_url?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          last_track_cover_url?: string | null
          name?: string
          share_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string
          preferred_genre: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          preferred_genre?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          preferred_genre?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          id: string
          theme: string | null
          language: string | null
          audio_quality: string | null
          autoplay: boolean | null
          crossfade: boolean | null
          crossfade_duration: number | null
          volume_normalization: boolean | null
          notif_favorite: boolean | null
          notif_download: boolean | null
          notif_error: boolean | null
          notif_news: boolean | null
          updated_at: string | null
        }
        Insert: {
          id: string
          theme?: string | null
          language?: string | null
          audio_quality?: string | null
          autoplay?: boolean | null
          crossfade?: boolean | null
          crossfade_duration?: number | null
          volume_normalization?: boolean | null
          notif_favorite?: boolean | null
          notif_download?: boolean | null
          notif_error?: boolean | null
          notif_news?: boolean | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          theme?: string | null
          language?: string | null
          audio_quality?: string | null
          autoplay?: boolean | null
          crossfade?: boolean | null
          crossfade_duration?: number | null
          volume_normalization?: boolean | null
          notif_favorite?: boolean | null
          notif_download?: boolean | null
          notif_error?: boolean | null
          notif_news?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          id: string
          query: string
          searched_at: string
          user_id: string
        }
        Insert: {
          id?: string
          query: string
          searched_at?: string
          user_id: string
        }
        Update: {
          id?: string
          query?: string
          searched_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_albums: {
        Row: {
          id: string
          user_id: string
          album_id: string
          album_data: Json | null
          saved_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          album_id: string
          album_data?: Json | null
          saved_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          album_id?: string
          album_data?: Json | null
          saved_at?: string | null
        }
        Relationships: []
      }
      downloads: {
        Row: {
          id: string
          user_id: string
          track_id: string
          track_name: string
          artist_name: string
          cover_url: string | null
          file_size_bytes: number | null
          track_data: Json | null
          downloaded_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          track_id: string
          track_name: string
          artist_name: string
          cover_url?: string | null
          file_size_bytes?: number | null
          track_data?: Json | null
          downloaded_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          track_id?: string
          track_name?: string
          artist_name?: string
          cover_url?: string | null
          file_size_bytes?: number | null
          track_data?: Json | null
          downloaded_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
