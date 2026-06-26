insert into storage.buckets (id, name, public)
values ('playlist-covers', 'playlist-covers', true)
on conflict (id) do nothing;

create policy "Usuário pode gerenciar suas próprias capas"
  on storage.objects for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Qualquer um pode ver capas de playlists"
  on storage.objects for select
  using (bucket_id = 'playlist-covers');
