-- Migration v19 — login do técnico (Rodrigues Refrigeração)
--
-- Cria o papel 'tecnico' e restringe, DENTRO DO PRÓPRIO BANCO (via Row
-- Level Security — não é só esconder tela), o que um usuário técnico
-- pode ver e editar: só os chamados e ordens de serviço que o dono
-- atribuiu a ele, e só a própria comissão no financeiro. Nunca os
-- chamados de outro técnico, nem Clientes/Relatórios/Configurações/
-- despesas gerais.
--
-- Todas as policies abaixo liberam acesso total quando o papel não é
-- 'tecnico' (my_role() <> 'tecnico'), então o comportamento de
-- admin/user continua idêntico ao de hoje — isso não afeta nenhum
-- outro tenant nem os usuários atuais da Rodrigues.

-- 1. Novo papel 'tecnico'
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin','user','tecnico'));

-- 2. Liga o login do técnico ao auxiliar que recebe a comissão dele
--    (o Rodrigues confirmou: quem atende é sempre quem fica com a
--    comissão daquele serviço)
alter table auxiliaries add column if not exists profile_id uuid references profiles(id) on delete set null;

-- 3. O chamado passa a saber qual técnico foi designado
alter table calls add column if not exists technician_id uuid references auxiliaries(id) on delete set null;

-- 4. Funções auxiliares pra RLS
create or replace function my_role()
returns text as $$
  select role from profiles where id = auth.uid()
$$ language sql security definer stable;

create or replace function my_auxiliary_id()
returns uuid as $$
  select id from auxiliaries where profile_id = auth.uid()
$$ language sql security definer stable;

-- 5. calls — técnico só vê/edita os que são dele; não cria nem exclui
drop policy if exists "tenant_isolation" on calls;

create policy "calls_select" on calls for select using (
  tenant_id = my_tenant_id()
  and (my_role() <> 'tecnico' or technician_id = my_auxiliary_id())
);

create policy "calls_insert" on calls for insert with check (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
);

create policy "calls_update" on calls for update using (
  tenant_id = my_tenant_id()
  and (my_role() <> 'tecnico' or technician_id = my_auxiliary_id())
) with check (
  tenant_id = my_tenant_id()
  and (my_role() <> 'tecnico' or technician_id = my_auxiliary_id())
);

create policy "calls_delete" on calls for delete using (
  tenant_id = my_tenant_id() and my_role() <> 'tecnico'
);

-- 6. service_orders — mesma regra, seguindo o chamado vinculado
drop policy if exists "tenant_isolation" on service_orders;

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

-- 7. service_order_items — segue a OS
drop policy if exists "tenant_isolation" on service_order_items;

create policy "service_order_items_all" on service_order_items for all using (
  service_order_id in (
    select id from service_orders
    where tenant_id = my_tenant_id()
      and (my_role() <> 'tecnico' or call_id in (select id from calls where technician_id = my_auxiliary_id()))
  )
);

-- 8. service_order_auxiliaries — segue a OS
drop policy if exists "tenant_isolation_soa" on service_order_auxiliaries;

create policy "service_order_auxiliaries_all" on service_order_auxiliaries for all using (
  service_order_id in (
    select id from service_orders
    where tenant_id = my_tenant_id()
      and (my_role() <> 'tecnico' or call_id in (select id from calls where technician_id = my_auxiliary_id()))
  )
);

-- 9. expenses — técnico só enxerga a PRÓPRIA comissão (leitura); nada
--    de escrita e nada de despesas gerais da empresa
drop policy if exists "tenant_isolation" on expenses;

create policy "expenses_select" on expenses for select using (
  tenant_id = my_tenant_id()
  and (my_role() <> 'tecnico' or auxiliary_id = my_auxiliary_id())
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

-- 10. clients — técnico mantém leitura (precisa do endereço/telefone
--     do cliente do próprio chamado), mas não cadastra/edita/exclui
drop policy if exists "tenant_isolation" on clients;

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

-- 11. auxiliaries — técnico mantém leitura (precisa existir a lista
--     pra funcionar o resto), mas não cria/edita/exclui comissões
drop policy if exists "tenant_isolation" on auxiliaries;

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

-- 12. profiles — técnico só enxerga o próprio perfil, não a lista
--     inteira de usuários do tenant (continua podendo editar só o
--     próprio, como já era)
drop policy if exists "own_profile" on profiles;
create policy "own_profile" on profiles for select using (
  tenant_id = my_tenant_id() and (my_role() <> 'tecnico' or id = auth.uid())
);

-- Conferir que tudo foi criado
select policyname, tablename from pg_policies
where tablename in ('calls','service_orders','service_order_items','service_order_auxiliaries','expenses','clients','auxiliaries','profiles')
order by tablename, policyname;
