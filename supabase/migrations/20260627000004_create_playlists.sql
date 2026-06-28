create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  cover_url text,
  cover_source text not null default 'branded',
  custom_cover_url text,
  last_track_cover_url text,
  is_public boolean not null default false,
  collaborative boolean default false,
  share_token text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  track_id text not null,
  track_data jsonb,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  unique(playlist_id, track_id)
);

alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;

create policy "Users can read own playlists"
  on public.playlists for select
  using (auth.uid() = user_id);

create policy "Users can create playlists"
  on public.playlists for insert
  with check (auth.uid() = user_id);

create policy "Users can update own playlists"
  on public.playlists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own playlists"
  on public.playlists for delete
  using (auth.uid() = user_id);

create policy "Users can read own playlist tracks"
  on public.playlist_tracks for select
  using (
    exists (
      select 1 from public.playlists
      where playlists.id = playlist_tracks.playlist_id
        and playlists.user_id = auth.uid()
    )
  );

create policy "Users can manage own playlist tracks"
  on public.playlist_tracks for all
  using (
    exists (
      select 1 from public.playlists
      where playlists.id = playlist_tracks.playlist_id
        and playlists.user_id = auth.uid()
    )
  );

create index if not exists playlists_user_idx
  on public.playlists (user_id, created_at desc);

create index if not exists playlist_tracks_playlist_position_idx
  on public.playlist_tracks (playlist_id, position);
