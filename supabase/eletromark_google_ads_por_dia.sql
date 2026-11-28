-- Eletromark: R$ 200 de Google Ads da empresa por DIA com chamado (não por chamado).
-- Rode DEPOIS da v43. Pode rodar de novo sem duplicar nada.
update tenants
set call_form_config = call_form_config || jsonb_build_object(
  'call_fees', coalesce(call_form_config -> 'call_fees', '{}'::jsonb)
    || '{"company_amount": 200, "tecnico_amount": 25, "company_per_day": true}'::jsonb)
where slug = 'eletromark-refrigeracoes';

-- Troca as saídas de R$ 200 por chamado por uma por dia
do $$
declare
  v_tenant uuid := (select id from tenants where slug = 'eletromark-refrigeracoes');
  c calls%rowtype;
  r record;
begin
  for c in select * from calls where tenant_id = v_tenant loop
    perform _sync_call_fees(c);
  end loop;
  for r in select distinct technician_id, coalesce(scheduled_date, date) as d from calls where tenant_id = v_tenant loop
    perform _sync_day_fees(v_tenant, r.technician_id, r.d);
  end loop;
end $$;

-- Conferir: empresa − R$ 200 por dia, cada técnico − R$ 25 por dia
select due_date as dia, description, amount
from expenses
where tenant_id = (select id from tenants where slug = 'eletromark-refrigeracoes')
  and (notes like 'agenda-empresa%' or notes like 'agenda-tecnico%')
order by due_date, auxiliary_id nulls first, description;
