-- Migration v21 — Controle de Estoque (Rodrigues Refrigeração)
--
-- Dois escopos de estoque na mesma tabela, diferenciados por
-- auxiliary_id:
--   • auxiliary_id = null  → estoque geral da loja física do Rodrigues
--   • auxiliary_id = X     → estoque pessoal que o técnico X carrega
--                            no carro (cada técnico só mexe no dele)
--
-- Quando um técnico usa uma peça do próprio estoque ao finalizar um
-- chamado, o sistema desconta a quantidade automaticamente e grava o
-- uso em service_order_parts (fica o histórico mesmo que o item do
-- estoque seja depois renomeado ou excluído).
--
-- 100% aditivo e isolado por tenant/papel — não afeta nenhum outro
-- cliente nem os módulos existentes.

create table if not exists stock_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  auxiliary_id uuid references auxiliaries(id) on delete cascade,
  name text not null,
  quantity integer not null default 0,
  unit_value numeric not null default 0,
  created_at timestamptz default now()
);

create table if not exists service_order_parts (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references service_orders(id) on delete cascade,
  stock_item_id uuid references stock_items(id) on delete set null,
  item_name text not null,
  quantity integer not null default 1,
  unit_value numeric not null default 0,
  total_value numeric not null default 0,
  created_at timestamptz default now()
);

alter table stock_items enable row level security;
alter table service_order_parts enable row level security;

-- stock_items: admin/user do tenant veem e mexem em tudo (loja geral +
-- estoque de todos os técnicos, pra saber quem precisa repor). Um
-- técnico só vê e mexe no próprio estoque (auxiliary_id = o dele).
create policy "stock_items_select" on stock_items for select using (
  tenant_id = my_tenant_id()
  and (my_role() <> 'tecnico' or auxiliary_id = my_auxiliary_id())
);

create policy "stock_items_insert" on stock_items for insert with check (
  tenant_id = my_tenant_id()
  and (my_role() <> 'tecnico' or auxiliary_id = my_auxiliary_id())
);

create policy "stock_items_update" on stock_items for update using (
  tenant_id = my_tenant_id()
  and (my_role() <> 'tecnico' or auxiliary_id = my_auxiliary_id())
) with check (
  tenant_id = my_tenant_id()
  and (my_role() <> 'tecnico' or auxiliary_id = my_auxiliary_id())
);

create policy "stock_items_delete" on stock_items for delete using (
  tenant_id = my_tenant_id()
  and (my_role() <> 'tecnico' or auxiliary_id = my_auxiliary_id())
);

-- service_order_parts: segue a mesma regra da OS vinculada (mesmo
-- padrão já usado em service_order_items/service_order_auxiliaries)
create policy "service_order_parts_all" on service_order_parts for all using (
  service_order_id in (
    select id from service_orders
    where tenant_id = my_tenant_id()
      and (my_role() <> 'tecnico' or call_id in (select id from calls where technician_id = my_auxiliary_id()))
  )
);
