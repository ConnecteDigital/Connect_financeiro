-- EMERGÊNCIA — desfaz as policies de RLS da migration_v19 (login de
-- técnico) que pararam "salvar chamado" pra TODOS os tenants, não só
-- a Rodrigues.
--
-- Isso volta tudo pro comportamento de antes: qualquer usuário logado
-- do tenant vê/edita tudo do próprio tenant, como sempre foi. A
-- restrição de "técnico só vê o próprio chamado" fica pausada — volta
-- depois, com mais calma, já corrigida.
--
-- Rode isso inteiro agora no SQL Editor do Supabase.

begin;

-- calls
drop policy if exists "calls_select" on calls;
drop policy if exists "calls_insert" on calls;
drop policy if exists "calls_update" on calls;
drop policy if exists "calls_delete" on calls;
create policy "tenant_isolation" on calls for all using (tenant_id = my_tenant_id());

-- service_orders
drop policy if exists "service_orders_select" on service_orders;
drop policy if exists "service_orders_insert" on service_orders;
drop policy if exists "service_orders_update" on service_orders;
drop policy if exists "service_orders_delete" on service_orders;
create policy "tenant_isolation" on service_orders for all using (tenant_id = my_tenant_id());

-- service_order_items
drop policy if exists "service_order_items_all" on service_order_items;
create policy "tenant_isolation" on service_order_items for all
  using (service_order_id in (select id from service_orders where tenant_id = my_tenant_id()));

-- service_order_auxiliaries
drop policy if exists "service_order_auxiliaries_all" on service_order_auxiliaries;
create policy "tenant_isolation_soa" on service_order_auxiliaries for all
  using (service_order_id in (select id from service_orders where tenant_id = my_tenant_id()));

-- expenses
drop policy if exists "expenses_select" on expenses;
drop policy if exists "expenses_insert" on expenses;
drop policy if exists "expenses_update" on expenses;
drop policy if exists "expenses_delete" on expenses;
create policy "tenant_isolation" on expenses for all using (tenant_id = my_tenant_id());

-- clients
drop policy if exists "clients_select" on clients;
drop policy if exists "clients_insert" on clients;
drop policy if exists "clients_update" on clients;
drop policy if exists "clients_delete" on clients;
create policy "tenant_isolation" on clients for all using (tenant_id = my_tenant_id());

-- auxiliaries
drop policy if exists "auxiliaries_select" on auxiliaries;
drop policy if exists "auxiliaries_insert" on auxiliaries;
drop policy if exists "auxiliaries_update" on auxiliaries;
drop policy if exists "auxiliaries_delete" on auxiliaries;
create policy "tenant_isolation" on auxiliaries for all using (tenant_id = my_tenant_id());

-- profiles
drop policy if exists "own_profile" on profiles;
create policy "own_profile" on profiles for select using (tenant_id = my_tenant_id());

-- stock_items / service_order_parts (migration_v21 — mesma pausa por segurança)
drop policy if exists "stock_items_select" on stock_items;
drop policy if exists "stock_items_insert" on stock_items;
drop policy if exists "stock_items_update" on stock_items;
drop policy if exists "stock_items_delete" on stock_items;
create policy "tenant_isolation" on stock_items for all using (tenant_id = my_tenant_id());

drop policy if exists "service_order_parts_all" on service_order_parts;
create policy "tenant_isolation" on service_order_parts for all
  using (service_order_id in (select id from service_orders where tenant_id = my_tenant_id()));

commit;

-- Conferir que voltou tudo pro normal
select tablename, policyname from pg_policies
where tablename in ('calls','service_orders','service_order_items','service_order_auxiliaries','expenses','clients','auxiliaries','profiles','stock_items','service_order_parts')
order by tablename, policyname;
