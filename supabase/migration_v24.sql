-- Migration v24 — Retorno (garantia) — Rodrigues Refrigeração
--
-- Retorno = o cliente chama de novo por um problema no serviço já feito.
-- O técnico volta sem cobrar o serviço; só a peça usada pode ser cobrada.
--   • cliente pagou a peça  → receita = valor da peça, custo = peça (zera)
--   • cliente não pagou     → receita 0, custo = peça (retorno negativo)
-- Técnico não ganha comissão sobre retorno.
--
-- Rode DEPOIS da migration_v23. 100% aditivo: status novo permitido e
-- colunas novas opcionais; nada muda para outros tenants.

alter table calls drop constraint if exists calls_status_check;
alter table calls add constraint calls_status_check
  check (status in ('agendado','aprovado','nao_aprovou','nao_quis_visita','cancelado','pagou_somente_visita','retorno'));

alter table calls add column if not exists return_of_call_id uuid references calls(id) on delete set null;
alter table calls add column if not exists return_parts_paid boolean;

-- Mesma função da v23, agora sem comissão quando o chamado é um retorno.
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
begin
  select * into v_so from service_orders where id = p_service_order_id;
  if not found then return; end if;
  if v_so.tenant_id is distinct from my_tenant_id() then
    raise exception 'sem permissão para esta OS';
  end if;

  select * into v_call from calls where id = v_so.call_id;
  if my_role() = 'tecnico' and v_call.technician_id is distinct from my_auxiliary_id() then
    raise exception 'sem permissão para esta OS';
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
    perform _sync_auto_expense(v_so.tenant_id, v_so.id, 'Pessoal', v_aux_id,
      round(v_so.total_value * coalesce(v_aux.percentage, 0) / 100, 2), v_so.date,
      'Comissão — ' || coalesce(v_aux.name, 'técnico') || ' ' || v_label);
  end if;
end;
$$;

grant execute on function sync_os_auto_expenses(uuid) to authenticated;

notify pgrst, 'reload schema';
