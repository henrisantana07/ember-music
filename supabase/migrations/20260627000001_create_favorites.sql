create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id text not null,
  track_data jsonb,
  created_at timestamptz not null default now(),
  unique(user_id, track_id)
);

alter table public.favorites enable row level security;

create policy "Users can read own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "Users can insert own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);

create index if not exists favorites_user_track_idx
  on public.favorites (user_id, track_id);

create index if not exists favorites_created_at_idx
  on public.favorites (user_id, created_at desc);
