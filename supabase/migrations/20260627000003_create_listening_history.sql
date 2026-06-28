create table if not exists public.listening_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id text not null,
  track_data jsonb,
  played_at timestamptz not null default now()
);

alter table public.listening_history enable row level security;

create policy "Users can read own listening history"
  on public.listening_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own listening history"
  on public.listening_history for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own listening history"
  on public.listening_history for delete
  using (auth.uid() = user_id);

create index if not exists listening_history_user_played_at_idx
  on public.listening_history (user_id, played_at desc);
