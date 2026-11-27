-- A home chamava "Faixas mais tocadas" mas ordenava por played_at: o
-- listening_history tem uma linha por (user_id, track_id), então ouvir de novo
-- só atualizava a data. Este campo passa a guardar a frequência real.

alter table public.listening_history
  add column if not exists play_count integer not null default 1;

-- Incremento atômico (evita corrida entre duas reproduções quase simultâneas)
-- e com verificação de dono, já que a função é security definer.
create or replace function public.increment_listening_play(
  p_user_id uuid,
  p_track_id text,
  p_track_data jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not authorized';
  end if;

  insert into public.listening_history (user_id, track_id, track_data, played_at, play_count)
  values (p_user_id, p_track_id, p_track_data, now(), 1)
  on conflict (user_id, track_id)
  do update set
    play_count = public.listening_history.play_count + 1,
    played_at = now(),
    track_data = excluded.track_data;
end;
$$;

revoke all on function public.increment_listening_play(uuid, text, jsonb) from public;
grant execute on function public.increment_listening_play(uuid, text, jsonb) to authenticated;
