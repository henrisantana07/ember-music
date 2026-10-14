-- A política de DELETE da tabela listening_history existe apenas no schema
-- versionado localmente (20260627000003), mas está ausente no banco remoto,
-- o que faz o botão "Limpar histórico" da biblioteca falhar em silêncio
-- (RLS filtra todas as linhas e o PostgREST responde sem erro, apagando 0 linhas).
-- Recria a política para o próprio usuário poder apagar seu histórico.
create policy "Users can delete own listening history"
  on public.listening_history for delete
  using (auth.uid() = user_id);
