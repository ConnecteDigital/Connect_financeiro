-- Migration v34 — Rodrigues: retorno com serviço cobrado, devolução
-- (estorno) ao cliente, novos motivos de encerramento e técnico desfazer
-- "aprovado" clicado por engano.
--
-- Rode DEPOIS da v33. Os outros clientes não usam nada disso.

-- ─── 1. Retorno que gera serviço novo ───────────────────────────────
-- Valor de serviço cobrado no retorno (além da peça). Quando é maior que
-- zero o técnico recebe comissão sobre ele.
alter table service_orders add column if not exists return_service_value numeric not null default 0;

-- ─── 2. Devoluções / estornos ───────────────────────────────────────
create table if not exists os_refunds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  service_order_id uuid not null references service_orders(id) on delete cascade,
  call_id uuid references calls(id) on delete set null,
  auxiliary_id uuid references auxiliaries(id) on delete set null,   -- técnico que teve a comissão descontada
  date date not null default current_date,
  amount numeric not null,                                           -- devolvido ao cliente
  reason text,
  commission_discount numeric not null default 0,                    -- descontado da comissão do técnico
  expense_id uuid references expenses(id) on delete set null,            -- saída "Estorno"
  commission_expense_id uuid references expenses(id) on delete set null, -- lançamento negativo na comissão
  created_at timestamptz default now()
);

create index if not exists os_refunds_so on os_refunds(service_order_id);

alter table os_refunds enable row level security;

-- Leitura: dono vê tudo; técnico vê só os estornos dos serviços dele.
-- Gravação só pelas funções abaixo.
drop policy if exists "os_refunds_select" on os_refunds;
create policy "os_refunds_select" on os_refunds for select using (
  tenant_id = my_tenant_id() and (my_role() <> 'tecnico' or auxiliary_id = my_auxiliary_id())
);

-- Lança a devolução: sai do caixa como "Estorno" (já paga) e desconta do
-- técnico a parte da comissão referente ao valor devolvido (lançamento
-- negativo, pendente, na data da devolução — abate do próximo pagamento).
create or replace function register_os_refund(
  p_service_order_id uuid, p_amount numeric, p_reason text default null, p_date date default null
) returns os_refunds
language plpgsql security definer set search_path = public as $$
declare
  v_so service_orders%rowtype;
  v_call calls%rowtype;
  v_comm expenses%rowtype;
  v_aux auxiliaries%rowtype;
  v_ref os_refunds%rowtype;
  v_date date := coalesce(p_date, (now() at time zone 'America/Sao_Paulo')::date);
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_label text;
  v_prev numeric;
  v_prev_disc numeric;
  v_card numeric;
  v_fee numeric;
  v_base numeric;
  v_rate numeric;
  v_disc numeric := 0;
  v_exp uuid;
  v_cexp uuid;
  v_is_return boolean;
begin
  if my_role() = 'tecnico' then raise exception 'sem permissão'; end if;
  select * into v_so from service_orders where id = p_service_order_id and tenant_id = my_tenant_id();
  if not found then raise exception 'OS não encontrada'; end if;
  if coalesce(p_amount, 0) <= 0 then raise exception 'informe o valor devolvido'; end if;

  select coalesce(sum(amount), 0), coalesce(sum(commission_discount), 0)
    into v_prev, v_prev_disc from os_refunds where service_order_id = v_so.id;
  if v_prev + p_amount > coalesce(v_so.total_value, 0) + 0.005 then
    raise exception 'a devolução passa do valor do serviço';
  end if;

  v_card := _os_card_gross(v_so);
  if v_card > 0 and v_so.card_net_value is null then
    raise exception 'confirme primeiro o valor do cartão desta OS e depois lance a devolução';
  end if;

  select * into v_call from calls where id = v_so.call_id;
  v_label := coalesce(v_so.os_number, '') || ' — ' || coalesce(v_call.contact_name, 'chamado');

  insert into expenses (tenant_id, description, category, amount, type, status, due_date, paid_date, source_service_order_id)
  values (v_so.tenant_id, 'Estorno ao cliente ' || v_label || coalesce(' — ' || v_reason, ''),
          'Estorno', p_amount, 'avulso', 'pago', v_date, v_date, v_so.id)
  returning id into v_exp;

  -- Comissão lançada pra esta OS (se tiver)
  select * into v_comm from expenses
  where source_service_order_id = v_so.id and category = 'Pessoal' and auxiliary_id is not null
  limit 1;
  if found and v_comm.amount > 0 then
    select * into v_aux from auxiliaries where id = v_comm.auxiliary_id;
    v_fee := case when v_card > 0 then greatest(v_card - v_so.card_net_value, 0) else 0 end;
    v_is_return := v_call.status = 'retorno' or v_call.return_of_call_id is not null;
    v_base := case when v_is_return
      then greatest(coalesce(v_so.return_service_value, 0) - coalesce(v_so.uber_cost, 0) - v_fee, 0)
      else greatest(coalesce(v_so.total_value, 0) - coalesce(v_so.parts_cost, 0) - coalesce(v_so.uber_cost, 0) - v_fee, 0) end;
    -- mesma % que gerou a comissão
    v_rate := case when v_base > 0 then v_comm.amount / v_base
      else (case when v_so.after_hours and v_aux.percentage_after_hours is not null
                 then v_aux.percentage_after_hours else coalesce(v_aux.percentage, 0) end) / 100 end;
    v_disc := least(round(p_amount * v_rate, 2), greatest(v_comm.amount - v_prev_disc, 0));
    if v_disc > 0 then
      insert into expenses (tenant_id, description, category, amount, type, status, due_date, auxiliary_id)
      values (v_so.tenant_id, 'Desconto de comissão (estorno) — ' || coalesce(v_aux.name, 'técnico') || ' ' || v_label,
              'Pessoal', -v_disc, 'avulso', 'pendente', v_date, v_comm.auxiliary_id)
      returning id into v_cexp;
    end if;
  end if;

  insert into os_refunds (tenant_id, service_order_id, call_id, auxiliary_id, date, amount, reason,
                          commission_discount, expense_id, commission_expense_id)
  values (v_so.tenant_id, v_so.id, v_so.call_id,
          coalesce(v_comm.auxiliary_id, v_so.auxiliary_id, v_call.technician_id), v_date, p_amount, v_reason,
          v_disc, v_exp, v_cexp)
  returning * into v_ref;
  return v_ref;
end;
$$;

-- Desfaz uma devolução lançada por engano (apaga a saída e o desconto)
create or replace function undo_os_refund(p_refund_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_ref os_refunds%rowtype;
begin
  if my_role() = 'tecnico' then raise exception 'sem permissão'; end if;
  select * into v_ref from os_refunds where id = p_refund_id and tenant_id = my_tenant_id();
  if not found then raise exception 'devolução não encontrada'; end if;
  delete from os_refunds where id = v_ref.id;
  delete from expenses where id in (v_ref.expense_id, v_ref.commission_expense_id);
end;
$$;

grant execute on function register_os_refund(uuid, numeric, text, date) to authenticated;
grant execute on function undo_os_refund(uuid) to authenticated;

-- ─── 3. Comissão: retorno com serviço cobrado ───────────────────────
-- Igual à v31, mais: retorno com return_service_value > 0 gera comissão
-- sobre (serviço do retorno − Uber − taxa da maquininha).
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
  v_is_return boolean;
  v_ret_service numeric;
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

  v_is_return := v_call.status = 'retorno' or v_call.return_of_call_id is not null;
  v_ret_service := coalesce(v_so.return_service_value, 0);

  v_aux_id := case
    when v_is_return and v_ret_service <= 0 then null
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
    v_base := case when v_is_return
      then greatest(v_ret_service - coalesce(v_so.uber_cost, 0) - v_fee, 0)
      else greatest(coalesce(v_so.total_value, 0) - coalesce(v_so.parts_cost, 0)
                    - coalesce(v_so.uber_cost, 0) - v_fee, 0) end;
    perform _sync_auto_expense(v_so.tenant_id, v_so.id, 'Pessoal', v_aux_id,
      round(v_base * v_pct / 100, 2), v_so.date,
      'Comissão — ' || coalesce(v_aux.name, 'técnico')
        || case when v_is_return then ' (retorno)' else '' end
        || case when v_so.after_hours then ' (fora do horário) ' else ' ' end
        || v_label);
  end if;
end;
$$;

revoke all on function _sync_os_auto_expenses_core(uuid) from public, anon, authenticated;

-- ─── 4. Encerrar serviço: motivos novos ─────────────────────────────
--   sem_conserto  → chamado vira 'nao_aprovou' (o motivo fica na visita)
--   faltou_peca   → continua 'agendado' (nova data opcional)
create or replace function finish_service_visit(
  p_call_id uuid, p_outcome text, p_notes text default null, p_new_date date default null
) returns service_visits
language plpgsql security definer set search_path = public as $$
declare
  v_call calls%rowtype;
  v_visit service_visits%rowtype;
begin
  if p_outcome not in ('aprovado','orcamento','remarcado','faltou_peca','cliente_ausente',
                       'nao_aprovou','sem_conserto','pagou_somente_visita','outro') then
    raise exception 'resultado inválido';
  end if;
  v_call := _can_work_call(p_call_id);

  update service_visits
  set finished_at = now(), outcome = p_outcome, notes = nullif(trim(coalesce(p_notes, '')), '')
  where call_id = p_call_id and finished_at is null
  returning * into v_visit;
  if not found then raise exception 'nenhum serviço em andamento neste chamado'; end if;

  if p_outcome = 'aprovado' then
    update calls
    set status = case when v_call.return_of_call_id is not null then 'retorno' else 'aprovado' end
    where id = p_call_id;
  elsif p_outcome in ('orcamento','nao_aprovou','pagou_somente_visita') then
    update calls set status = p_outcome where id = p_call_id;
  elsif p_outcome = 'sem_conserto' then
    update calls set status = 'nao_aprovou' where id = p_call_id;
  elsif p_new_date is not null then
    update calls set status = 'agendado', scheduled_date = p_new_date where id = p_call_id;
  end if;

  return v_visit;
end;
$$;

grant execute on function finish_service_visit(uuid, text, text, date) to authenticated;

-- ─── 5. Técnico desfaz o resultado clicado por engano ───────────────
-- Agora também aceita voltar pra 'agendado' (ex.: apertou "Serviço
-- aprovado" sem querer). Só enquanto a OS não foi lançada.
create or replace function tecnico_change_outcome(p_call_id uuid, p_status text)
returns calls
language plpgsql security definer set search_path = public as $$
declare
  v_call calls%rowtype;
begin
  if p_status not in ('aprovado','orcamento','nao_aprovou','pagou_somente_visita','agendado') then
    raise exception 'resultado inválido';
  end if;
  v_call := _can_work_call(p_call_id);
  if v_call.status not in ('aprovado','orcamento','nao_aprovou','pagou_somente_visita','retorno') then
    raise exception 'este chamado ainda não foi encerrado';
  end if;
  if exists (select 1 from service_orders where call_id = p_call_id) and p_status <> 'aprovado' then
    raise exception 'este chamado já tem OS lançada; peça pro escritório alterar';
  end if;

  -- A última visita passa a mostrar o resultado certo
  update service_visits
  set outcome = case when p_status = 'agendado' then 'outro' else p_status end,
      notes = case when p_status = 'agendado'
                   then coalesce(notes || ' · ', '') || 'Resultado marcado por engano; voltou pra agendado'
                   else notes end
  where id = (select id from service_visits
              where call_id = p_call_id and finished_at is not null
              order by finished_at desc limit 1);

  update calls
  set status = case when p_status = 'aprovado' and v_call.return_of_call_id is not null then 'retorno' else p_status end
  where id = p_call_id
  returning * into v_call;
  return v_call;
end;
$$;

grant execute on function tecnico_change_outcome(uuid, text) to authenticated;

notify pgrst, 'reload schema';

-- Conferir
select 'v34 ok' as resultado,
  (select count(*) from information_schema.columns where table_name = 'service_orders' and column_name = 'return_service_value') as coluna_retorno,
  (select count(*) from information_schema.tables where table_name = 'os_refunds') as tabela_estornos;
