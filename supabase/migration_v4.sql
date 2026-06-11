-- Migration v4: cidade/bairro no chamado, número do chamado, itens estruturados
-- e novas categorias de serviço
-- Execute no SQL Editor do Supabase (seguro rodar mais de uma vez)

-- 1. Cidade, bairro e número do chamado
alter table calls
  add column if not exists call_city text,
  add column if not exists call_neighborhood text,
  add column if not exists call_number text;

-- 2. Numeração automática de chamados por tenant (CH-00001, CH-00002...)
create or replace function generate_call_number()
returns trigger as $$
begin
  if new.call_number is null then
    new.call_number := 'CH-' || lpad(next_tenant_sequence(new.tenant_id, 'call')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_call_number on calls;
create trigger set_call_number
  before insert on calls
  for each row execute function generate_call_number();

-- 3. Numerar os chamados que já existem (em ordem de criação)
with numbered as (
  select id, tenant_id, row_number() over (partition by tenant_id order by created_at) as rn
  from calls where call_number is null
)
update calls set call_number = 'CH-' || lpad(numbered.rn::text, 5, '0')
from numbered where calls.id = numbered.id;

insert into tenant_sequences (tenant_id, sequence_name, current_value)
select tenant_id, 'call', count(*) from calls group by tenant_id
on conflict (tenant_id, sequence_name) do update set current_value = greatest(tenant_sequences.current_value, excluded.current_value);

-- 4. Itens da OS estruturados (categoria, sub-opções e descrição individual)
alter table service_order_items
  add column if not exists category text,
  add column if not exists sub_options text,
  add column if not exists notes text;

-- 5. Novas categorias de serviço (substituem os 8 tipos antigos)
delete from service_types where name in (
  'Desentupidora de Ralo', 'Desentupidora de Pia', 'Desentupidora de Cano',
  'Desentupidora de Vaso', 'Desentupidora de Coluna', 'Desentupidora de Esgoto',
  'Limpa Fossa'
);

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
on conflict (tenant_id, name) do nothing;
