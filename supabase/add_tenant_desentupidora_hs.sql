-- Adiciona a empresa "Desentupidora HS" como novo tenant
-- Execute no SQL Editor do Supabase, PARTE 1 primeiro.
-- Antes de rodar a PARTE 2, crie o usuário de login no Supabase:
--   Dashboard → Authentication → Users → Add user
--   Email: desentupidorahs@gmail.com
--   Defina uma senha temporária e marque "Auto Confirm User"
--   Depois copie o UID gerado e cole no lugar de 'COLE_O_UID_AQUI' abaixo.

-- ============================================================
-- PARTE 1 — Cria o tenant e os tipos de serviço padrão
-- ============================================================

insert into tenants (slug, name, primary_color, call_origins)
values (
  'desentupidora-hs',
  'Desentupidora HS',
  '#f97316', -- cor principal padrão (laranja) — troque se quiser outra
  array['Indicação', 'WhatsApp', 'Terceirizado', 'Telefone', 'Google']
)
on conflict (slug) do nothing;

insert into service_types (tenant_id, name)
select t.id, s.name
from tenants t
cross join (values
  ('Sucção'),
  ('Desobstrução'),
  ('Limpeza'),
  ('Hidrojateamento'),
  ('Aplicação de CO2'),
  ('Outros')
) as s(name)
where t.slug = 'desentupidora-hs'
on conflict (tenant_id, name) do nothing;

-- ============================================================
-- PARTE 2 — Vincula o usuário de login ao tenant
-- Rode isso só DEPOIS de criar o usuário em Authentication → Users
-- ============================================================

insert into profiles (id, tenant_id, name, role)
select
  'COLE_O_UID_AQUI'::uuid,
  t.id,
  'Desentupidora HS',
  'admin'
from tenants t
where t.slug = 'desentupidora-hs'
on conflict (id) do update set tenant_id = excluded.tenant_id;

-- ============================================================
-- Conferir se deu tudo certo
-- ============================================================
select t.name, t.slug, p.id as user_id, p.role
from tenants t
left join profiles p on p.tenant_id = t.id
where t.slug = 'desentupidora-hs';
