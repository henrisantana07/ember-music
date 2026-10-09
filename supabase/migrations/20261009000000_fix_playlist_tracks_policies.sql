-- Corrige 403 ao reordenar/adicionar em playlist_tracks (drift de RLS no banco remoto).
-- Idempotente: pode ser executada mais de uma vez.

alter table public.playlist_tracks enable row level security;

-- playlist_tracks: select
drop policy if exists "Users can read own playlist tracks" on public.playlist_tracks;
create policy "Users can read own playlist tracks"
  on public.playlist_tracks for select
  using (
    exists (
      select 1 from public.playlists
      where playlists.id = playlist_tracks.playlist_id
        and playlists.user_id = auth.uid()
    )
  );

-- playlist_tracks: insert/update/delete (for all) com WITH CHECK explícito
drop policy if exists "Users can manage own playlist tracks" on public.playlist_tracks;
create policy "Users can manage own playlist tracks"
  on public.playlist_tracks for all
  using (
    exists (
      select 1 from public.playlists
      where playlists.id = playlist_tracks.playlist_id
        and playlists.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.playlists
      where playlists.id = playlist_tracks.playlist_id
        and playlists.user_id = auth.uid()
    )
  );

-- playlists: recria policies por segurança (mesmo possível drift)
drop policy if exists "Users can read own playlists" on public.playlists;
create policy "Users can read own playlists"
  on public.playlists for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create playlists" on public.playlists;
create policy "Users can create playlists"
  on public.playlists for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own playlists" on public.playlists;
create policy "Users can update own playlists"
  on public.playlists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own playlists" on public.playlists;
create policy "Users can delete own playlists"
  on public.playlists for delete
  using (auth.uid() = user_id);

-- Garantias de grants (idempotente)
grant all on public.playlist_tracks to authenticated;
grant all on public.playlists to authenticated;
