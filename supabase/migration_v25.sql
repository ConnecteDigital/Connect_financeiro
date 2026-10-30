-- Migration v25 — Rodrigues: comissão fora do horário comercial e
-- registro de tempo de serviço (iniciar / encerrar).
--
-- Rode DEPOIS da v24. 100% aditivo: colunas/tabela/funções novas; o
-- único objeto redefinido é sync_os_auto_expenses (só usado pela
-- Rodrigues), mantendo as regras da v24 (retorno sem comissão).

-- ─── 1. Comissão em dois níveis ────────────────────────────────────
-- percentage            = comissão em horário comercial (já existia)
-- percentage_after_hours = comissão fora do horário (vazio = igual à comercial)
alter table auxiliaries add column if not exists percentage_after_hours numeric;
alter table service_orders add column if not exists after_hours boolean not null default false;

-- ─── 2. Visitas (cada "Iniciar serviço" = uma visita) ──────────────
create table if not exists service_visits (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  call_id uuid not null references calls(id) on delete cascade,
  auxiliary_id uuid references auxiliaries(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  -- aprovado | remarcado | cliente_ausente | nao_aprovou | pagou_somente_visita | outro
  outcome text,
  notes text,
  created_at timestamptz default now()
);

-- No máximo uma visita em andamento por chamado
create unique index if not exists service_visits_one_open
  on service_visits (call_id) where finished_at is null;

alter table service_visits enable row level security;

-- Leitura: dono/usuário vê tudo do tenant; técnico só as visitas dos
-- chamados dele. Escrita direta só pro dono (correções no relatório) —
-- o técnico inicia/encerra pelas funções abaixo, que usam o relógio do
-- servidor (ele não consegue inventar horário).
drop policy if exists "service_visits_select" on service_visits;
drop policy if exists "service_visits_write" on service_visits;
create policy "service_visits_select" on service_visits for select using (
  tenant_id = my_tenant_id()
  and (my_role() <> 'tecnico' or call_id in (select id from calls where technician_id = my_auxiliary_id()))
);
create policy "service_visits_write" on service_visits for all using (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
) with check (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
);

-- Confere se quem chama pode mexer nesse chamado
create or replace function _can_work_call(p_call_id uuid)
returns calls
language plpgsql security definer stable set search_path = public as $$
declare
  v_call calls%rowtype;
begin
  select * into v_call from calls where id = p_call_id;
  if not found or v_call.tenant_id is distinct from my_tenant_id() then
    raise exception 'chamado não encontrado';
  end if;
  if my_role() = 'tecnico' and v_call.technician_id is distinct from my_auxiliary_id() then
    raise exception 'sem permissão para este chamado';
  end if;
  return v_call;
end;
$$;

-- Iniciar serviço: abre uma visita com o horário do servidor.
-- Se já tiver uma aberta, devolve ela (clicar duas vezes não duplica).
create or replace function start_service_visit(p_call_id uuid)
returns service_visits
language plpgsql security definer set search_path = public as $$
declare
  v_call calls%rowtype;
  v_visit service_visits%rowtype;
begin
  v_call := _can_work_call(p_call_id);

  select * into v_visit from service_visits
  where call_id = p_call_id and finished_at is null;
  if found then return v_visit; end if;

  insert into service_visits (tenant_id, call_id, auxiliary_id)
  values (v_call.tenant_id, v_call.id, v_call.technician_id)
  returning * into v_visit;
  return v_visit;
end;
$$;

-- Encerrar a visita em andamento com um resultado.
--   aprovado               → chamado vira 'aprovado' (técnico completa a OS)
--   nao_aprovou            → chamado vira 'nao_aprovou'
--   pagou_somente_visita   → chamado vira 'pagou_somente_visita'
--   remarcado              → continua 'agendado'; se vier p_new_date, remarca
--   cliente_ausente/outro  → continua 'agendado' (p_new_date opcional)
create or replace function finish_service_visit(
  p_call_id uuid, p_outcome text, p_notes text default null, p_new_date date default null
) returns service_visits
language plpgsql security definer set search_path = public as $$
declare
  v_call calls%rowtype;
  v_visit service_visits%rowtype;
begin
  if p_outcome not in ('aprovado','remarcado','cliente_ausente','nao_aprovou','pagou_somente_visita','outro') then
    raise exception 'resultado inválido';
  end if;
  v_call := _can_work_call(p_call_id);

  update service_visits
  set finished_at = now(), outcome = p_outcome, notes = nullif(trim(coalesce(p_notes, '')), '')
  where call_id = p_call_id and finished_at is null
  returning * into v_visit;
  if not found then raise exception 'nenhum serviço em andamento neste chamado'; end if;

  if p_outcome in ('aprovado','nao_aprovou','pagou_somente_visita') then
    update calls set status = p_outcome where id = p_call_id;
  elsif p_new_date is not null then
    update calls set status = 'agendado', scheduled_date = p_new_date where id = p_call_id;
  end if;

  return v_visit;
end;
$$;

-- ─── 3. Fora do horário comercial ──────────────────────────────────
-- Horário vem de tenants.call_form_config.business_hours, por exemplo:
--   {"weekday_start":"08:00","weekday_end":"18:00",
--    "saturday_start":null,"saturday_end":null}
-- Sem configuração: seg–sex 08:00–18:00; sábado e domingo fora.
-- Referência de horário: início real da última visita; se não houver,
-- data/hora agendada; se não houver, a criação da OS. Fuso de Brasília.
create or replace function compute_after_hours(p_service_order_id uuid)
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
  if not found or v_so.tenant_id is distinct from my_tenant_id() then return false; end if;
  select * into v_call from calls where id = v_so.call_id;
  select call_form_config -> 'business_hours' into v_cfg from tenants where id = v_so.tenant_id;

  select started_at at time zone 'America/Sao_Paulo' into v_ts
  from service_visits where call_id = v_call.id
  order by started_at desc limit 1;

  if v_ts is null and v_call.scheduled_date is not null then
    v_ts := v_call.scheduled_date + coalesce(v_call.scheduled_time, time '12:00');
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

-- ─── 4. Saídas automáticas da OS (substitui a versão da v24) ───────
-- Igual à v24, mais: quando quem salva é o técnico, "fora do horário"
-- é sempre recalculado pelo banco (ele não escolhe). O dono pode
-- marcar/desmarcar na tela e o valor dele é respeitado.
create or replace function sync_os_auto_expenses(p_service_order_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_so service_orders%rowtype;
  v_call calls%rowtype;
  v_aux auxiliaries%rowtype;
  v_aux_id uuid;
  v_label text;
  v_fee numeric;
  v_pct numeric;
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
    update service_orders set after_hours = compute_after_hours(v_so.id)
    where id = v_so.id returning * into v_so;
  end if;

  v_label := coalesce(v_so.os_number, '') || ' — ' || coalesce(v_call.contact_name, 'chamado');

  perform _sync_auto_expense(v_so.tenant_id, v_so.id, 'Peças', null,
    v_so.parts_cost, v_so.date, 'Peça utilizada ' || v_label);

  v_fee := case when v_so.card_net_value is not null
                then v_so.total_value - v_so.card_net_value else 0 end;
  perform _sync_auto_expense(v_so.tenant_id, v_so.id, 'Taxa Maquininha', null,
    v_fee, v_so.date, 'Taxa da maquininha ' || v_label);

  v_aux_id := case when v_call.status = 'retorno' then null
                   else coalesce(v_so.auxiliary_id, v_call.technician_id) end;
  delete from expenses
  where source_service_order_id = v_so.id and category = 'Pessoal'
    and auxiliary_id is not null and auxiliary_id is distinct from v_aux_id;

  if v_aux_id is not null then
    select * into v_aux from auxiliaries where id = v_aux_id;
    v_pct := case when v_so.after_hours and v_aux.percentage_after_hours is not null
                  then v_aux.percentage_after_hours
                  else coalesce(v_aux.percentage, 0) end;
    perform _sync_auto_expense(v_so.tenant_id, v_so.id, 'Pessoal', v_aux_id,
      round(v_so.total_value * v_pct / 100, 2), v_so.date,
      'Comissão — ' || coalesce(v_aux.name, 'técnico')
        || case when v_so.after_hours then ' (fora do horário) ' else ' ' end
        || v_label);
  end if;
end;
$$;

revoke all on function _can_work_call(uuid) from public, anon, authenticated;
grant execute on function start_service_visit(uuid) to authenticated;
grant execute on function finish_service_visit(uuid, text, text, date) to authenticated;
grant execute on function compute_after_hours(uuid) to authenticated;
grant execute on function sync_os_auto_expenses(uuid) to authenticated;

notify pgrst, 'reload schema';
