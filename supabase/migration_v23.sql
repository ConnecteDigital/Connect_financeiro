-- Migration v23 — Rodrigues: endereço completo, valor líquido do cartão
-- e saídas automáticas da OS calculadas pelo banco.
--
-- 100% aditivo (colunas novas opcionais + uma função nova). Não muda
-- nada para outros tenants: a função só é chamada pela tela da Rodrigues.

-- 1. Endereço: número, complemento (bloco/casa/apto) e referência
alter table calls   add column if not exists address_number     text;
alter table calls   add column if not exists address_complement text;
alter table calls   add column if not exists address_reference  text;
alter table clients add column if not exists address_number     text;
alter table clients add column if not exists address_complement text;
alter table clients add column if not exists address_reference  text;

-- 2. Cartão: valor líquido que caiu da maquininha (o bruto é o total da OS)
alter table service_orders add column if not exists card_net_value numeric;

-- 3. Saídas automáticas de uma OS (peças, taxa da maquininha, comissão do
--    técnico), calculadas aqui no banco a partir dos dados da própria OS.
--    É "security definer" porque o técnico não tem permissão de escrever
--    no financeiro — mas ele também não escolhe valor nenhum: o banco
--    calcula tudo. Quem chama precisa poder ver a OS (dono/usuário do
--    tenant, ou o técnico designado pro chamado).
create or replace function _sync_auto_expense(
  p_tenant uuid, p_so uuid, p_category text, p_aux uuid,
  p_amount numeric, p_due date, p_description text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  select id into v_id from expenses
  where source_service_order_id = p_so
    and category = p_category
    and auxiliary_id is not distinct from p_aux
  limit 1;

  if coalesce(p_amount, 0) <= 0 then
    if v_id is not null then delete from expenses where id = v_id; end if;
    return;
  end if;

  if v_id is not null then
    update expenses set amount = p_amount, due_date = p_due, description = p_description where id = v_id;
  else
    insert into expenses (tenant_id, description, category, amount, type, status, due_date, source_service_order_id, auxiliary_id)
    values (p_tenant, p_description, p_category, p_amount, 'avulso', 'pendente', p_due, p_so, p_aux);
  end if;
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

  -- Peças usadas
  perform _sync_auto_expense(v_so.tenant_id, v_so.id, 'Peças', null,
    v_so.parts_cost, v_so.date, 'Peça utilizada ' || v_label);

  -- Taxa da maquininha = bruto (total da OS) − líquido que caiu
  v_fee := case when v_so.card_net_value is not null
                then v_so.total_value - v_so.card_net_value else 0 end;
  perform _sync_auto_expense(v_so.tenant_id, v_so.id, 'Taxa Maquininha', null,
    v_fee, v_so.date, 'Taxa da maquininha ' || v_label);

  -- Comissão do técnico (o da OS, ou o técnico designado no chamado).
  -- Antes, remove comissões automáticas de outro técnico se trocaram.
  v_aux_id := coalesce(v_so.auxiliary_id, v_call.technician_id);
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

revoke all on function _sync_auto_expense(uuid, uuid, text, uuid, numeric, date, text) from public, anon, authenticated;
grant execute on function sync_os_auto_expenses(uuid) to authenticated;

notify pgrst, 'reload schema';
