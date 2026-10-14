-- Adiciona a empresa "Desentupidora Especial BH" como novo tenant
-- Execute no SQL Editor do Supabase, PARTE 1 primeiro.
--
-- O login (debora.castroff@gmail.com) é criado via Supabase:
--   Dashboard → Authentication → Users → Add user → Send invitation
-- Depois que ela existir, copie o UID gerado e cole no lugar de
-- 'COLE_O_UID_AQUI' na PARTE 2 abaixo.

-- ============================================================
-- PARTE 1 — Cria o tenant e os tipos de serviço padrão
-- ============================================================

insert into tenants (slug, name, primary_color, call_origins)
values (
  'desentupidora-especial-bh',
  'Desentupidora Especial BH',
  '#f97316', -- laranja (padrão) — pode trocar depois em Configurações
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
where t.slug = 'desentupidora-especial-bh'
on conflict (tenant_id, name) do nothing;

-- ============================================================
-- PARTE 2 — Vincula o usuário de login (debora.castroff@gmail.com)
-- ao tenant. Rode isso só DEPOIS de criar o convite em
-- Authentication → Users → Add user → Send invitation
-- ============================================================

insert into profiles (id, tenant_id, name, role)
select
  'COLE_O_UID_AQUI'::uuid,
  t.id,
  'Debora Castro',
  'admin'
from tenants t
where t.slug = 'desentupidora-especial-bh'
on conflict (id) do update set tenant_id = excluded.tenant_id;

-- ============================================================
-- Conferir
-- ============================================================
select t.name, t.slug, p.id as user_id, p.role
from tenants t
left join profiles p on p.tenant_id = t.id
where t.slug = 'desentupidora-especial-bh';
