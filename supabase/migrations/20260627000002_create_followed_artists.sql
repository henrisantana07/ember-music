create table if not exists public.followed_artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artist_id text not null,
  artist_name text not null,
  artist_image_url text,
  artist_data jsonb,
  followed_at timestamptz not null default now(),
  unique(user_id, artist_id)
);

alter table public.followed_artists enable row level security;

create policy "Users can read own followed artists"
  on public.followed_artists for select
  using (auth.uid() = user_id);

create policy "Users can insert followed artists"
  on public.followed_artists for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own followed artists"
  on public.followed_artists for delete
  using (auth.uid() = user_id);

create index if not exists followed_artists_user_idx
  on public.followed_artists (user_id, followed_at desc);
