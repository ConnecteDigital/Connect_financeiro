-- Conta "Rodrigues Refrigerações – Loja": controle de estoque (máquinas e
-- peças), vendas e gastos da loja. Dados separados da conta de chamados.
--
-- ANTES: Supabase → Authentication → Users → Add user (e-mail + senha,
-- marque "Auto Confirm User") e copie o UID pra linha marcada abaixo.
-- Rode a migration_v32.sql antes deste arquivo. Pode rodar de novo.

insert into tenants (slug, name, primary_color, call_origins, call_form_config)
values (
  'rodrigues-loja',
  'Rodrigues Refrigerações – Loja',
  '#ec4899',
  array[]::text[],
  '{"loja_mode": true}'::jsonb
)
on conflict (slug) do update
  set call_form_config = coalesce(tenants.call_form_config, '{}'::jsonb) || '{"loja_mode": true}'::jsonb;

-- Usa a mesma logo da conta principal da Rodrigues, se tiver
update tenants l
set logo_url = r.logo_url, cnpj = coalesce(l.cnpj, r.cnpj), phone = coalesce(l.phone, r.phone), address = coalesce(l.address, r.address)
from tenants r
where l.slug = 'rodrigues-loja' and r.slug = 'rodrigues-refrigeracao' and l.logo_url is null;

insert into profiles (id, tenant_id, name, role)
select
  'aa0b8828-8142-45f0-8b35-59377a505cf1'::uuid,   -- loja@gmail.com
  t.id,
  t.name,
  'admin'
from tenants t
where t.slug = 'rodrigues-loja'
on conflict (id) do update
  set tenant_id = excluded.tenant_id,
      role      = excluded.role;

-- Conferir
select t.name, t.slug, t.call_form_config->'loja_mode' as loja, p.id as user_id, u.email, p.role
from tenants t
left join profiles p on p.tenant_id = t.id
left join auth.users u on u.id = p.id
where t.slug = 'rodrigues-loja';
