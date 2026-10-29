-- Migration v20 — "Agendado por" na tela do chamado (Rodrigues)
--
-- Registra quem criou/agendou cada chamado, pra mostrar "Agendado por
-- <nome>" na tela simplificada. 100% aditivo: a coluna só é preenchida
-- em chamados novos a partir de agora (default = usuário logado),
-- chamados antigos ficam com esse campo vazio, sem problema.
--
-- Também desfaz a restrição que a migration_v19 colocou em "quem pode
-- ler profiles": o técnico precisa poder ler o NOME de quem criou um
-- chamado (ex: o Rodrigues), não só o próprio perfil. Não tem dado
-- sensível em profiles além do nome/papel, então liberar a leitura do
-- tenant inteiro de volta (como era antes da v19) é seguro.

alter table calls add column if not exists created_by uuid references profiles(id) on delete set null default auth.uid();

drop policy if exists "own_profile" on profiles;
create policy "own_profile" on profiles for select using (tenant_id = my_tenant_id());
