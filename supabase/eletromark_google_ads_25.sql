-- Eletromark: desconto do técnico por chamado agendado passa de R$ 35 pra R$ 25
update tenants
set call_form_config = coalesce(call_form_config, '{}'::jsonb)
  || jsonb_build_object('call_fees', coalesce(call_form_config -> 'call_fees', '{}'::jsonb) || jsonb_build_object('tecnico_amount', 25))
where slug = 'eletromark-refrigeracoes';

-- Ajusta os descontos já lançados (só os que ainda não foram pagos)
update expenses
set amount = -25
where tenant_id = (select id from tenants where slug = 'eletromark-refrigeracoes')
  and notes like 'agenda-tecnico:%' and status = 'pendente';

-- Conferir
select
  (select call_form_config -> 'call_fees' from tenants where slug = 'eletromark-refrigeracoes') as regra,
  count(*) as descontos_lancados,
  sum(amount) as total_descontos
from expenses
where tenant_id = (select id from tenants where slug = 'eletromark-refrigeracoes')
  and notes like 'agenda-tecnico:%';
