-- 1. followed_artists: remove colunas que o app não usa
alter table public.followed_artists
  drop column if exists artist_name,
  drop column if exists artist_image_url;

-- 2. user_settings: chave passa a ser "id" e colunas aceitam nulo
alter table public.user_settings rename column user_id to id;
alter table public.user_settings
  alter column theme drop not null,
  alter column language drop not null,
  alter column audio_quality drop not null,
  alter column autoplay drop not null,
  alter column crossfade drop not null,
  alter column crossfade_duration drop not null,
  alter column volume_normalization drop not null,
  alter column notif_favorite drop not null,
  alter column notif_download drop not null,
  alter column notif_error drop not null,
  alter column notif_news drop not null,
  alter column updated_at drop not null;

-- 3. playlist_tracks: position e added_at opcionais
alter table public.playlist_tracks
  alter column position drop not null,
  alter column added_at drop not null;

-- 4. playlist_albums: tabela que faltava
create table if not exists public.playlist_albums (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  album_id text not null,
  album_data jsonb,
  position integer,
  added_at timestamptz default now()
);
alter table public.playlist_albums enable row level security;
create policy "Users can manage own playlist albums" on public.playlist_albums
  for all using (exists (
    select 1 from public.playlists
    where playlists.id = playlist_albums.playlist_id
      and playlists.user_id = auth.uid()
  ));
