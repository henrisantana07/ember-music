create table downloads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  track_id text not null,
  track_name text not null,
  artist_name text not null,
  cover_url text,
  file_size_bytes int,
  track_data jsonb,
  downloaded_at timestamptz default now(),
  unique(user_id, track_id)
);

alter table downloads enable row level security;

create policy "Usuário acessa apenas seus próprios downloads"
  on downloads for all
  using (auth.uid() = user_id);
