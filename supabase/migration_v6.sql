-- migration_v6: Permitir UPDATE no próprio tenant
-- Run this in the Supabase SQL editor
--
-- A tabela tenants só tinha policy de SELECT, então qualquer update feito
-- pelo app (módulo de comissões, origens de chamados, logo, cor) era
-- silenciosamente bloqueado pelo RLS (0 linhas atualizadas, sem erro).

CREATE POLICY "own_tenant_update" ON tenants
  FOR UPDATE
  USING (id = my_tenant_id())
  WITH CHECK (id = my_tenant_id());
