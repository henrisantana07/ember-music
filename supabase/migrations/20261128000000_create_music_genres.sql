-- Catálogo de gêneros disponível para todos os usuários.
create table if not exists public.music_genres (
  id text primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.music_genres enable row level security;

drop policy if exists "music_genres_public_read" on public.music_genres;
create policy "music_genres_public_read" on public.music_genres
  for select to anon, authenticated using (true);

insert into public.music_genres (id, name) values
  ('pop', 'Pop'),
  ('rock', 'Rock'),
  ('hip-hop', 'Hip-Hop'),
  ('eletronica', 'Eletrônica'),
  ('sertanejo', 'Sertanejo'),
  ('funk', 'Funk'),
  ('mpb', 'MPB'),
  ('rap', 'Rap'),
  ('indie', 'Indie'),
  ('classica', 'Clássica'),
  ('jazz', 'Jazz'),
  ('reggae', 'Reggae'),
  ('country', 'Country'),
  ('metal', 'Metal'),
  ('lofi', 'Lo-fi'),
  ('samba', 'Samba')
on conflict (id) do nothing;

-- Gêneros favoritos de cada usuário (seleção múltipla).
create table if not exists public.user_favorite_genres (
  user_id uuid not null references auth.users(id) on delete cascade,
  genre_id text not null references public.music_genres(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, genre_id)
);

alter table public.user_favorite_genres enable row level security;

drop policy if exists "user_favorite_genres_select_own" on public.user_favorite_genres;
create policy "user_favorite_genres_select_own" on public.user_favorite_genres
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "user_favorite_genres_insert_own" on public.user_favorite_genres;
create policy "user_favorite_genres_insert_own" on public.user_favorite_genres
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "user_favorite_genres_delete_own" on public.user_favorite_genres;
create policy "user_favorite_genres_delete_own" on public.user_favorite_genres
  for delete to authenticated using (auth.uid() = user_id);
