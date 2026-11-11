-- Migration v31 — Rodrigues: comissão pelo HORÁRIO AGENDADO e motivo de
-- "sem garantia" na OS.
--
-- Rode DEPOIS da v30. Os outros clientes não usam nada disso.
--
-- Regra nova da comissão fora do horário:
--   vale o horário em que o serviço foi AGENDADO, não quando o técnico
--   começou ou terminou. Agendado 17:59 de segunda = horário comercial,
--   mesmo que termine às 22h. Agendado 18:01, sábado depois do horário
--   de sábado ou domingo = fora do horário.
--   Sem horário agendado: usa o início do primeiro atendimento.
--
-- No fim, recalcula as comissões AINDA PENDENTES da Rodrigues com a
-- regra nova (as já pagas não mudam).

alter table service_orders add column if not exists no_guarantee_reason text;

-- Cálculo puro (sem checar quem está logado) — usado pelas funções abaixo
create or replace function _after_hours_of(p_service_order_id uuid)
returns boolean
language plpgsql security definer stable set search_path = public as $$
declare
  v_so service_orders%rowtype;
  v_call calls%rowtype;
  v_cfg jsonb;
  v_ts timestamp;
  v_dow int;
  v_t time;
  v_start time;
  v_end time;
begin
  select * into v_so from service_orders where id = p_service_order_id;
  if not found then return false; end if;
  select * into v_call from calls where id = v_so.call_id;
  select call_form_config -> 'business_hours' into v_cfg from tenants where id = v_so.tenant_id;

  -- 1º: o horário agendado
  if v_call.scheduled_time is not null then
    v_ts := coalesce(v_call.scheduled_date, v_call.date) + v_call.scheduled_time;
  end if;
  -- 2º: o início do PRIMEIRO atendimento
  if v_ts is null then
    select started_at at time zone 'America/Sao_Paulo' into v_ts
    from service_visits where call_id = v_call.id
    order by started_at asc limit 1;
  end if;
  -- 3º: a data agendada (meio-dia) ou a criação da OS
  if v_ts is null and coalesce(v_call.scheduled_date, v_call.date) is not null then
    v_ts := coalesce(v_call.scheduled_date, v_call.date) + time '12:00';
  end if;
  if v_ts is null then
    v_ts := coalesce(v_so.created_at, now()) at time zone 'America/Sao_Paulo';
  end if;

  v_dow := extract(dow from v_ts);   -- 0 = domingo, 6 = sábado
  v_t := v_ts::time;

  if v_dow = 0 then return true; end if;
  if v_dow = 6 then
    v_start := nullif(v_cfg ->> 'saturday_start', '')::time;
    v_end   := nullif(v_cfg ->> 'saturday_end', '')::time;
    if v_start is null or v_end is null then return true; end if;
  else
    v_start := coalesce(nullif(v_cfg ->> 'weekday_start', '')::time, time '08:00');
    v_end   := coalesce(nullif(v_cfg ->> 'weekday_end', '')::time, time '18:00');
  end if;

  return v_t < v_start or v_t >= v_end;
end;
$$;

create or replace function compute_after_hours(p_service_order_id uuid)
returns boolean
language plpgsql security definer stable set search_path = public as $$
begin
  if not exists (select 1 from service_orders where id = p_service_order_id and tenant_id = my_tenant_id()) then
    return false;
  end if;
  return _after_hours_of(p_service_order_id);
end;
$$;

-- Lança/atualiza peças, Uber, maquininha e comissão de uma OS (sem checar
-- quem está logado). Mesma regra da v28.
create or replace function _sync_os_auto_expenses_core(p_service_order_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_so service_orders%rowtype;
  v_call calls%rowtype;
  v_aux auxiliaries%rowtype;
  v_aux_id uuid;
  v_label text;
  v_card numeric;
  v_fee numeric;
  v_card_pending boolean;
  v_base numeric;
  v_pct numeric;
begin
  select * into v_so from service_orders where id = p_service_order_id;
  if not found then return; end if;
  select * into v_call from calls where id = v_so.call_id;

  v_label := coalesce(v_so.os_number, '') || ' — ' || coalesce(v_call.contact_name, 'chamado');

  perform _sync_auto_expense(v_so.tenant_id, v_so.id, 'Peças', null,
    v_so.parts_cost, v_so.date, 'Peça utilizada ' || v_label);

  perform _sync_auto_expense(v_so.tenant_id, v_so.id, 'Uber', null,
    v_so.uber_cost, v_so.date, 'Uber (entrega de peça) ' || v_label);

  v_card := _os_card_gross(v_so);
  v_card_pending := v_card > 0 and v_so.card_net_value is null;
  v_fee := case when v_card > 0 and v_so.card_net_value is not null
                then greatest(v_card - v_so.card_net_value, 0) else 0 end;
  perform _sync_auto_expense(v_so.tenant_id, v_so.id, 'Taxa Maquininha', null,
    v_fee, v_so.date, 'Taxa da maquininha ' || v_label);

  v_aux_id := case
    when v_call.status = 'retorno' or v_call.return_of_call_id is not null then null
    when v_card_pending then null
    else coalesce(v_so.auxiliary_id, v_call.technician_id) end;

  delete from expenses
  where source_service_order_id = v_so.id and category = 'Pessoal'
    and auxiliary_id is not null and auxiliary_id is distinct from v_aux_id;

  if v_aux_id is not null then
    select * into v_aux from auxiliaries where id = v_aux_id;
    v_pct := case when v_so.after_hours and v_aux.percentage_after_hours is not null
                  then v_aux.percentage_after_hours
                  else coalesce(v_aux.percentage, 0) end;
    v_base := greatest(coalesce(v_so.total_value, 0) - coalesce(v_so.parts_cost, 0)
                       - coalesce(v_so.uber_cost, 0) - v_fee, 0);
    perform _sync_auto_expense(v_so.tenant_id, v_so.id, 'Pessoal', v_aux_id,
      round(v_base * v_pct / 100, 2), v_so.date,
      'Comissão — ' || coalesce(v_aux.name, 'técnico')
        || case when v_so.after_hours then ' (fora do horário) ' else ' ' end
        || v_label);
  end if;
end;
$$;

-- Chamada pelo app: confere permissão; quando é o técnico, recalcula o
-- "fora do horário" pela regra (o dono pode marcar à mão, ex.: feriado).
create or replace function sync_os_auto_expenses(p_service_order_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_so service_orders%rowtype;
  v_call calls%rowtype;
begin
  select * into v_so from service_orders where id = p_service_order_id;
  if not found then return; end if;
  if v_so.tenant_id is distinct from my_tenant_id() then
    raise exception 'sem permissão para esta OS';
  end if;
  select * into v_call from calls where id = v_so.call_id;
  if my_role() = 'tecnico' then
    if v_call.technician_id is distinct from my_auxiliary_id() then
      raise exception 'sem permissão para esta OS';
    end if;
    update service_orders set after_hours = _after_hours_of(v_so.id) where id = v_so.id;
  end if;
  perform _sync_os_auto_expenses_core(p_service_order_id);
end;
$$;

revoke all on function _after_hours_of(uuid) from public, anon, authenticated;
revoke all on function _sync_os_auto_expenses_core(uuid) from public, anon, authenticated;
grant execute on function compute_after_hours(uuid) to authenticated;
grant execute on function sync_os_auto_expenses(uuid) to authenticated;

-- Técnico muda o resultado de um chamado já encerrado por ele (ex.: o
-- orçamento virou aprovado, ou marcou "não aprovou" por engano).
-- Ele não tem UPDATE direto em calls (v26); por isso a função.
create or replace function tecnico_change_outcome(p_call_id uuid, p_status text)
returns calls
language plpgsql security definer set search_path = public as $$
declare
  v_call calls%rowtype;
begin
  if p_status not in ('aprovado','orcamento','nao_aprovou','pagou_somente_visita') then
    raise exception 'resultado inválido';
  end if;
  v_call := _can_work_call(p_call_id);
  if v_call.status not in ('aprovado','orcamento','nao_aprovou','pagou_somente_visita','retorno') then
    raise exception 'este chamado ainda não foi encerrado';
  end if;
  if exists (select 1 from service_orders where call_id = p_call_id) and p_status <> 'aprovado' then
    raise exception 'este chamado já tem OS lançada; peça pro escritório alterar';
  end if;
  update calls
  set status = case when p_status = 'aprovado' and v_call.return_of_call_id is not null then 'retorno' else p_status end
  where id = p_call_id
  returning * into v_call;
  return v_call;
end;
$$;

grant execute on function tecnico_change_outcome(uuid, text) to authenticated;

-- Recalcula as comissões ainda pendentes da Rodrigues pela regra nova
do $$
declare
  r record;
  v_count int := 0;
begin
  for r in
    select distinct so.id
    from service_orders so
    join tenants t on t.id = so.tenant_id
    join expenses e on e.source_service_order_id = so.id
    where t.call_form_config ->> 'rodrigues_custom' = 'true'
      and e.category = 'Pessoal' and e.auxiliary_id is not null and e.status = 'pendente'
  loop
    update service_orders set after_hours = _after_hours_of(r.id) where id = r.id;
    perform _sync_os_auto_expenses_core(r.id);
    v_count := v_count + 1;
  end loop;
  raise notice '% OS recalculadas.', v_count;
end $$;

notify pgrst, 'reload schema';

-- Conferir: comissões pendentes da Rodrigues depois do recálculo
select e.description, e.amount, so.after_hours, c.scheduled_date, c.scheduled_time
from expenses e
join service_orders so on so.id = e.source_service_order_id
join calls c on c.id = so.call_id
join tenants t on t.id = so.tenant_id
where t.call_form_config ->> 'rodrigues_custom' = 'true'
  and e.category = 'Pessoal' and e.status = 'pendente'
order by c.scheduled_date desc;
