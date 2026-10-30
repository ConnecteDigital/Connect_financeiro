-- Migration v22 — religa a trava do login de técnico (Rodrigues)
--
-- Reaplica as regras da migration_v19/v21 que foram desligadas pelo
-- emergency_rollback_v19.sql. O erro ao salvar chamado NÃO era causado
-- por elas (era a migration_v18 que não tinha sido rodada).
--
-- Pode rodar mais de uma vez: cada policy é apagada antes de ser criada.
-- Pra quem não é técnico (admin/user) o acesso continua exatamente igual
-- a hoje: tudo do próprio tenant.

begin;

-- calls
drop policy if exists "tenant_isolation" on calls;
drop policy if exists "calls_select" on calls;
drop policy if exists "calls_insert" on calls;
drop policy if exists "calls_update" on calls;
drop policy if exists "calls_delete" on calls;
create policy "calls_select" on calls for select using (
  tenant_id = my_tenant_id() and (my_role() <> 'tecnico' or technician_id = my_auxiliary_id())
);
create policy "calls_insert" on calls for insert with check (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
);
create policy "calls_update" on calls for update using (
  tenant_id = my_tenant_id() and (my_role() <> 'tecnico' or technician_id = my_auxiliary_id())
) with check (
  tenant_id = my_tenant_id() and (my_role() <> 'tecnico' or technician_id = my_auxiliary_id())
);
create policy "calls_delete" on calls for delete using (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
);

-- service_orders
drop policy if exists "tenant_isolation" on service_orders;
drop policy if exists "service_orders_select" on service_orders;
drop policy if exists "service_orders_insert" on service_orders;
drop policy if exists "service_orders_update" on service_orders;
drop policy if exists "service_orders_delete" on service_orders;
create policy "service_orders_select" on service_orders for select using (
  tenant_id = my_tenant_id()
  and (my_role() <> 'tecnico' or call_id in (select id from calls where technician_id = my_auxiliary_id()))
);
create policy "service_orders_insert" on service_orders for insert with check (
  tenant_id = my_tenant_id()
  and (my_role() <> 'tecnico' or call_id in (select id from calls where technician_id = my_auxiliary_id()))
);
create policy "service_orders_update" on service_orders for update using (
  tenant_id = my_tenant_id()
  and (my_role() <> 'tecnico' or call_id in (select id from calls where technician_id = my_auxiliary_id()))
) with check (
  tenant_id = my_tenant_id()
  and (my_role() <> 'tecnico' or call_id in (select id from calls where technician_id = my_auxiliary_id()))
);
create policy "service_orders_delete" on service_orders for delete using (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
);

-- service_order_items
drop policy if exists "tenant_isolation" on service_order_items;
drop policy if exists "service_order_items_all" on service_order_items;
create policy "service_order_items_all" on service_order_items for all using (
  service_order_id in (
    select id from service_orders
    where tenant_id = my_tenant_id()
      and (my_role() <> 'tecnico' or call_id in (select id from calls where technician_id = my_auxiliary_id()))
  )
);

-- service_order_auxiliaries
drop policy if exists "tenant_isolation_soa" on service_order_auxiliaries;
drop policy if exists "service_order_auxiliaries_all" on service_order_auxiliaries;
create policy "service_order_auxiliaries_all" on service_order_auxiliaries for all using (
  service_order_id in (
    select id from service_orders
    where tenant_id = my_tenant_id()
      and (my_role() <> 'tecnico' or call_id in (select id from calls where technician_id = my_auxiliary_id()))
  )
);

-- expenses: técnico só lê a própria comissão
drop policy if exists "tenant_isolation" on expenses;
drop policy if exists "expenses_select" on expenses;
drop policy if exists "expenses_insert" on expenses;
drop policy if exists "expenses_update" on expenses;
drop policy if exists "expenses_delete" on expenses;
create policy "expenses_select" on expenses for select using (
  tenant_id = my_tenant_id() and (my_role() <> 'tecnico' or auxiliary_id = my_auxiliary_id())
);
create policy "expenses_insert" on expenses for insert with check (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
);
create policy "expenses_update" on expenses for update using (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
) with check (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
);
create policy "expenses_delete" on expenses for delete using (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
);

-- clients: técnico só lê
drop policy if exists "tenant_isolation" on clients;
drop policy if exists "clients_select" on clients;
drop policy if exists "clients_insert" on clients;
drop policy if exists "clients_update" on clients;
drop policy if exists "clients_delete" on clients;
create policy "clients_select" on clients for select using (tenant_id = my_tenant_id());
create policy "clients_insert" on clients for insert with check (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
);
create policy "clients_update" on clients for update using (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
) with check (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
);
create policy "clients_delete" on clients for delete using (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
);

-- auxiliaries: técnico só lê
drop policy if exists "tenant_isolation" on auxiliaries;
drop policy if exists "auxiliaries_select" on auxiliaries;
drop policy if exists "auxiliaries_insert" on auxiliaries;
drop policy if exists "auxiliaries_update" on auxiliaries;
drop policy if exists "auxiliaries_delete" on auxiliaries;
create policy "auxiliaries_select" on auxiliaries for select using (tenant_id = my_tenant_id());
create policy "auxiliaries_insert" on auxiliaries for insert with check (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
);
create policy "auxiliaries_update" on auxiliaries for update using (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
) with check (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
);
create policy "auxiliaries_delete" on auxiliaries for delete using (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
);

-- stock_items: técnico só mexe no próprio estoque
drop policy if exists "tenant_isolation" on stock_items;
drop policy if exists "stock_items_select" on stock_items;
drop policy if exists "stock_items_insert" on stock_items;
drop policy if exists "stock_items_update" on stock_items;
drop policy if exists "stock_items_delete" on stock_items;
create policy "stock_items_select" on stock_items for select using (
  tenant_id = my_tenant_id() and (my_role() <> 'tecnico' or auxiliary_id = my_auxiliary_id())
);
create policy "stock_items_insert" on stock_items for insert with check (
  tenant_id = my_tenant_id() and (my_role() <> 'tecnico' or auxiliary_id = my_auxiliary_id())
);
create policy "stock_items_update" on stock_items for update using (
  tenant_id = my_tenant_id() and (my_role() <> 'tecnico' or auxiliary_id = my_auxiliary_id())
) with check (
  tenant_id = my_tenant_id() and (my_role() <> 'tecnico' or auxiliary_id = my_auxiliary_id())
);
create policy "stock_items_delete" on stock_items for delete using (
  tenant_id = my_tenant_id() and (my_role() <> 'tecnico' or auxiliary_id = my_auxiliary_id())
);

-- service_order_parts
drop policy if exists "tenant_isolation" on service_order_parts;
drop policy if exists "service_order_parts_all" on service_order_parts;
create policy "service_order_parts_all" on service_order_parts for all using (
  service_order_id in (
    select id from service_orders
    where tenant_id = my_tenant_id()
      and (my_role() <> 'tecnico' or call_id in (select id from calls where technician_id = my_auxiliary_id()))
  )
);

commit;

notify pgrst, 'reload schema';

select tablename, policyname from pg_policies
where tablename in ('calls','service_orders','service_order_items','service_order_auxiliaries','expenses','clients','auxiliaries','stock_items','service_order_parts')
order by tablename, policyname;
