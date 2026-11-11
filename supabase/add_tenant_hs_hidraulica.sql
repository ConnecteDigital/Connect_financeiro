-- Adiciona a empresa "HS Hidráulica" como novo tenant (cliente comum,
-- sem nenhuma flag de call_form_config).
--
-- >>> NOME DA EMPRESA: para trocar, altere só a linha marcada com
-- >>> "TROQUE O NOME AQUI" na PARTE 1. O nome do perfil admin é
-- >>> copiado do tenant, e rodar o arquivo de novo atualiza o nome.
--
-- slug: hs-hidraulica  (NÃO confundir com o tenant 'desentupidora-hs',
-- que é outro cliente)
--
-- O usuário de login já foi criado em Authentication → Users:
--   Email: hshidraulica@gmail.com
--   UID:   d4e0831d-abe1-455d-bbef-78255be3b7a9
-- Por isso PARTE 1 e PARTE 2 podem rodar juntas, de uma vez só, no
-- SQL Editor do Supabase. O script é idempotente: pode rodar de novo
-- sem duplicar nada.

-- ============================================================
-- PARTE 1 — Cria o tenant e os tipos de serviço padrão
-- ============================================================

insert into tenants (slug, name, primary_color, call_origins)
values (
  'hs-hidraulica',
  'HS Hidráulica', -- TROQUE O NOME AQUI
  '#2563eb', -- azul
  array['WhatsApp', 'Ligação', 'Indicação', 'Google']
)
on conflict (slug) do update set name = excluded.name;

insert into service_types (tenant_id, name)
select t.id, s.name
from tenants t
cross join (values
  ('Desentupimento'),
  ('Hidrojateamento'),
  ('Caça vazamento'),
  ('Limpeza de caixa d''água'),
  ('Limpeza de fossa'),
  ('Outros')
) as s(name)
where t.slug = 'hs-hidraulica'
on conflict (tenant_id, name) do nothing;

-- ============================================================
-- PARTE 2 — Vincula o usuário de login (hshidraulica@gmail.com)
-- ao tenant como admin
-- ============================================================

insert into profiles (id, tenant_id, name, role)
select
  'd4e0831d-abe1-455d-bbef-78255be3b7a9'::uuid,
  t.id,
  t.name,
  'admin'
from tenants t
where t.slug = 'hs-hidraulica'
on conflict (id) do update
  set tenant_id = excluded.tenant_id,
      role      = excluded.role;

-- ============================================================
-- Conferir se deu tudo certo
-- ============================================================
select t.name, t.slug, p.id as user_id, u.email, p.role
from tenants t
left join profiles p on p.tenant_id = t.id
left join auth.users u on u.id = p.id
where t.slug = 'hs-hidraulica';
