create table if not exists public.youtube_search_cache (
  id uuid primary key default gen_random_uuid(),
  query_key text not null unique,
  query text not null,
  results jsonb not null,
  next_page_token text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.youtube_search_cache enable row level security;

create index if not exists youtube_search_cache_query_key_idx on public.youtube_search_cache (query_key);
create index if not exists youtube_search_cache_expires_at_idx on public.youtube_search_cache (expires_at);

create or replace function public.youtube_cache_get(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return (
    select results
    from public.youtube_search_cache
    where query_key = p_key
      and expires_at > now()
  );
end;
$$;

revoke execute on function public.youtube_cache_get(text) from public;
grant execute on function public.youtube_cache_get(text) to anon, authenticated;

create or replace function public.youtube_cache_set(
  p_key text,
  p_query text,
  p_results jsonb,
  p_next_page_token text,
  p_ttl_seconds int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.youtube_search_cache (query_key, query, results, next_page_token, expires_at)
  values (p_key, p_query, p_results, p_next_page_token, now() + (p_ttl_seconds || ' seconds')::interval)
  on conflict (query_key) do update set
    query = excluded.query,
    results = excluded.results,
    next_page_token = excluded.next_page_token,
    expires_at = excluded.expires_at;
end;
$$;

revoke execute on function public.youtube_cache_set(text, text, jsonb, text, int) from public;
grant execute on function public.youtube_cache_set(text, text, jsonb, text, int) to anon, authenticated;