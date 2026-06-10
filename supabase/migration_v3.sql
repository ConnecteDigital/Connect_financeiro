-- Migration v3: status "Não aprovou" nos chamados, campos extras e tipos de serviço padrão
-- Execute no SQL Editor do Supabase

-- 1. Novo status "nao_aprovou" nos chamados
alter table calls drop constraint if exists calls_status_check;
alter table calls add constraint calls_status_check
  check (status in ('agendado','aprovado','nao_aprovou','nao_quis_visita','cancelado'));

-- 2. Campos do chamado (caso o banco tenha sido criado antes deles existirem no schema)
alter table calls
  add column if not exists contact_phone text,
  add column if not exists scheduled_date date;

-- 3. Campos da OS (caso o banco tenha sido criado antes deles existirem no schema)
alter table service_orders
  add column if not exists own_material_cost numeric default 0,
  add column if not exists own_fuel_cost numeric default 0,
  add column if not exists own_other_cost numeric default 0,
  add column if not exists other_service_value numeric default 0,
  add column if not exists has_guarantee_60 boolean default false,
  add column if not exists has_guarantee_90 boolean default false;

-- 4. Tipos de serviço padrão para todos os tenants
insert into service_types (tenant_id, name)
select t.id, s.name
from tenants t
cross join (values
  ('Desentupidora de Ralo'),
  ('Desentupidora de Pia'),
  ('Desentupidora de Cano'),
  ('Desentupidora de Vaso'),
  ('Desentupidora de Coluna'),
  ('Desentupidora de Esgoto'),
  ('Limpa Fossa'),
  ('Hidrojateamento')
) as s(name)
on conflict (tenant_id, name) do nothing;
