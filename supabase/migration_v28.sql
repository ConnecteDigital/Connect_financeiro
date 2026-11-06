-- Migration v28 — Rodrigues: custo de Uber (entrega de peça) na OS.
--
-- Rode DEPOIS da v27. Aditivo: coluna nova + função redefinida (a mesma da
-- v27 com o Uber). Só a Rodrigues preenche essa coluna; nos outros clientes
-- ela fica 0 e nada muda.
--
-- Regras:
--  • service_orders.uber_cost = quanto foi gasto de Uber pra levar peça.
--  • Vira uma despesa "Uber" da OS (como Peças e Taxa Maquininha).
--  • É descontado da base da comissão, igual à peça:
--      comissão = % × (total − peças − Uber − taxa da maquininha)

alter table service_orders add column if not exists uber_cost numeric(12,2) not null default 0;

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

  -- Uber (entrega de peça)
  perform _sync_auto_expense(v_so.tenant_id, v_so.id, 'Uber', null,
    v_so.uber_cost, v_so.date, 'Uber (entrega de peça) ' || v_label);

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

grant execute on function sync_os_auto_expenses(uuid) to authenticated;

notify pgrst, 'reload schema';
