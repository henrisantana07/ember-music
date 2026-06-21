create table if not exists public.search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  searched_at timestamptz not null default now(),
  constraint search_history_user_query_key unique (user_id, query)
);

alter table public.search_history enable row level security;

create policy "Users can read own search history"
  on public.search_history
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own search history"
  on public.search_history
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own search history"
  on public.search_history
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own search history"
  on public.search_history
  for delete
  using (auth.uid() = user_id);

create index if not exists search_history_user_searched_at_idx
  on public.search_history (user_id, searched_at desc);
