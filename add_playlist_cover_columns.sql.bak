alter table playlists
  add column cover_source text not null default 'branded'
    check (cover_source in ('custom', 'track', 'branded')),
  add column custom_cover_url text,
  add column last_track_cover_url text;

create index if not exists idx_playlist_tracks_added_at
  on playlist_tracks (playlist_id, added_at desc);
