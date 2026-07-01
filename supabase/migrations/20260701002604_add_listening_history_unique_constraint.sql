-- Remove duplicates keeping only the latest entry per (user_id, track_id)
delete from public.listening_history
where id in (
  select id from (
    select id, row_number() over (partition by user_id, track_id order by played_at desc) as rn
    from public.listening_history
  ) t where t.rn > 1
);

-- Add unique constraint for upsert support
alter table public.listening_history
add constraint listening_history_user_track_unique unique (user_id, track_id);

-- Add update policy so upsert works with RLS
create policy "Users can update own listening history"
  on public.listening_history for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
