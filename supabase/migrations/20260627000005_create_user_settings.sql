create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark',
  language text not null default 'pt-BR',
  audio_quality text not null default 'medium',
  autoplay boolean not null default true,
  crossfade boolean not null default false,
  crossfade_duration numeric not null default 3,
  volume_normalization boolean not null default false,
  notif_favorite boolean not null default true,
  notif_download boolean not null default true,
  notif_error boolean not null default true,
  notif_news boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users can read own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
