INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'playlist-covers',
  'playlist-covers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Playlist covers public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'playlist-covers');

CREATE POLICY "Playlist covers user upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'playlist-covers'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Playlist covers user update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'playlist-covers'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Playlist covers user delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'playlist-covers'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
