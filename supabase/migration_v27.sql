-- Migration v27 — Rodrigues: pagamento dividido, comissão sobre o líquido,
-- resultado "Orçamento" e retorno agendado pro técnico.
--
-- Rode DEPOIS da v26. Aditivo: status novo permitido, coluna nova e
-- funções redefinidas (só usadas pela Rodrigues).
--
-- Regras:
--  • Pagamento pode ser dividido: service_orders.payments =
--      [{"method":"Cartão","amount":100,"card_type":"credito","installments":3},
--       {"method":"PIX","amount":100}, {"method":"Dinheiro","amount":200}]
--  • Cartão só fica confirmado quando o DONO informa card_net_value
--    (quanto caiu de fato). Taxa da maquininha = total em cartão − líquido.
--  • Comissão do técnico = % × (total − peças − taxa da maquininha).
--    Se tem cartão ainda não confirmado, a comissão NÃO é lançada (fica
--    aguardando o dono confirmar).
--  • Retorno (chamado com return_of_call_id) nunca gera comissão.
--  • Encerrar com "orcamento" = técnico avaliou e passou o preço; o
--    chamado fica com status 'orcamento' esperando o cliente decidir.

alter table calls drop constraint if exists calls_status_check;
alter table calls add constraint calls_status_check
  check (status in ('agendado','aprovado','nao_aprovou','nao_quis_visita','cancelado',
                    'pagou_somente_visita','retorno','orcamento'));

alter table service_orders add column if not exists payments jsonb;

-- Total pago em cartão numa OS (pagamento dividido ou o formato antigo)
create or replace function _os_card_gross(v_so service_orders)
returns numeric
language sql immutable as $$
  select case
    when v_so.payments is not null and jsonb_typeof(v_so.payments) = 'array' then
      coalesce((select sum((p ->> 'amount')::numeric)
                from jsonb_array_elements(v_so.payments) p
                where p ->> 'method' = 'Cartão'), 0)
    when v_so.card_net_value is not null then v_so.total_value
    else 0
  end
$$;

create or replace function finish_service_visit(
  p_call_id uuid, p_outcome text, p_notes text default null, p_new_date date default null
) returns service_visits
language plpgsql security definer set search_path = public as $$
declare
  v_call calls%rowtype;
  v_visit service_visits%rowtype;
begin
  if p_outcome not in ('aprovado','orcamento','remarcado','cliente_ausente','nao_aprovou','pagou_somente_visita','outro') then
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
  elsif p_new_date is not null then
    update calls set status = 'agendado', scheduled_date = p_new_date where id = p_call_id;
  end if;

  return v_visit;
end;
$$;

create or replace function sync_os_auto_expenses(p_service_order_id uuid)
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

  -- Peças
  perform _sync_auto_expense(v_so.tenant_id, v_so.id, 'Peças', null,
    v_so.parts_cost, v_so.date, 'Peça utilizada ' || v_label);

  -- Taxa da maquininha (só sobre a parte paga em cartão, depois de confirmada)
  v_card := _os_card_gross(v_so);
  v_card_pending := v_card > 0 and v_so.card_net_value is null;
  v_fee := case when v_card > 0 and v_so.card_net_value is not null
                then greatest(v_card - v_so.card_net_value, 0) else 0 end;
  perform _sync_auto_expense(v_so.tenant_id, v_so.id, 'Taxa Maquininha', null,
    v_fee, v_so.date, 'Taxa da maquininha ' || v_label);

  -- Comissão: nunca em retorno; espera o cartão ser confirmado
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
    v_base := greatest(coalesce(v_so.total_value, 0) - coalesce(v_so.parts_cost, 0) - v_fee, 0);
    perform _sync_auto_expense(v_so.tenant_id, v_so.id, 'Pessoal', v_aux_id,
      round(v_base * v_pct / 100, 2), v_so.date,
      'Comissão — ' || coalesce(v_aux.name, 'técnico')
        || case when v_so.after_hours then ' (fora do horário) ' else ' ' end
        || v_label);
  end if;
end;
$$;

grant execute on function finish_service_visit(uuid, text, text, date) to authenticated;
grant execute on function sync_os_auto_expenses(uuid) to authenticated;

notify pgrst, 'reload schema';
