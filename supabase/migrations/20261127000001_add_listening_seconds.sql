-- "Mais ouvidas" deve refletir TEMPO ACUMULADO de escuta por faixa,
-- não quantidade de reproduções nem recência.

alter table public.listening_history
  add column if not exists listened_seconds integer not null default 0;

create or replace function public.add_listening_seconds(
  p_user_id uuid,
  p_track_id text,
  p_seconds integer,
  p_track_data jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id or p_seconds <= 0 then
    return;
  end if;

  insert into public.listening_history (user_id, track_id, track_data, played_at, play_count, listened_seconds)
  values (p_user_id, p_track_id, p_track_data, now(), 1, p_seconds)
  on conflict (user_id, track_id)
  do update set
    listened_seconds = public.listening_history.listened_seconds + excluded.listened_seconds,
    played_at = now(),
    track_data = excluded.track_data;
end;
$$;

revoke all on function public.add_listening_seconds(uuid, text, integer, jsonb) from public;
grant execute on function public.add_listening_seconds(uuid, text, integer, jsonb) to authenticated;
