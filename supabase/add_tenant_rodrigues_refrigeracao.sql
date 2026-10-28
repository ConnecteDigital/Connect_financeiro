-- Adiciona a empresa "Rodrigues Refrigeração" (conserto de geladeira/
-- eletrodomésticos, Belo Horizonte) como novo tenant.
--
-- IMPORTANTE: ao contrário dos outros scripts, aqui NÃO inserimos
-- tipos de serviço padrão — o próprio usuário escolhe a área de
-- atuação e as categorias de serviço no assistente de boas-vindas
-- que aparece sozinho no primeiro login dele.
--
-- O login é criado via Supabase: Dashboard → Authentication → Users →
-- Add user → Create new user (defina uma senha temporária e marque
-- "Auto Confirm User"), OU Send invitation. Depois copie o UID e cole
-- no lugar de 'COLE_O_UID_AQUI' na PARTE 2.

-- ============================================================
-- PARTE 1 — Cria o tenant (sem tipos de serviço pré-cadastrados)
-- ============================================================

insert into tenants (slug, name, primary_color, call_origins)
values (
  'rodrigues-refrigeracao',
  'Rodrigues Refrigeração',
  '#f97316', -- laranja (padrão) — ele pode trocar no próprio onboarding
  array['Indicação', 'WhatsApp', 'Terceirizado', 'Telefone', 'Google']
)
on conflict (slug) do nothing;

-- ============================================================
-- PARTE 2 — Vincula o usuário de login ao tenant
-- Rode isso só DEPOIS de criar o usuário em Authentication → Users
-- ============================================================

insert into profiles (id, tenant_id, name, role)
select
  'COLE_O_UID_AQUI'::uuid,
  t.id,
  'Rodrigues Refrigeração',
  'admin'
from tenants t
where t.slug = 'rodrigues-refrigeracao'
on conflict (id) do update set tenant_id = excluded.tenant_id;

-- ============================================================
-- Conferir
-- ============================================================
select t.name, t.slug, p.id as user_id, p.role
from tenants t
left join profiles p on p.tenant_id = t.id
where t.slug = 'rodrigues-refrigeracao';
