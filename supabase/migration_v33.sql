-- Migration v33 — Conta Loja da Rodrigues: PEDIDOS (orçamento / ordem de
-- serviço / laudo técnico de aparelhos que entram na loja).
-- Rode DEPOIS da v32. Só tabelas novas (os outros clientes não usam).

create table if not exists shop_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  seq int not null,                    -- 11  → "011-2026"
  year int not null,
  date date not null default current_date,
  status text not null default 'pendente',
  -- cliente
  client_name text not null,
  client_phone text,
  client_address text,
  client_city text,
  client_cep text,
  -- informações básicas
  validity_days int,
  brand text,
  model text,
  appliance text,
  serial_number text,
  defect text,
  observations text,
  -- compromisso
  visit_date date,
  visit_time time,
  visit_notes text,
  -- pedido
  services jsonb not null default '[]',   -- [{description, details, unit, unit_price, quantity}]
  parts jsonb not null default '[]',      -- [{description, unit_price, quantity, stock_item_id}]
  discount numeric not null default 0,
  delivery_fee numeric not null default 0,
  freight numeric not null default 0,
  other_fees numeric not null default 0,
  total numeric not null default 0,
  -- detalhes
  payment_conditions text,
  payment_methods text[] not null default '{}',
  guarantee text,
  notes text,                             -- anotações internas (não saem no documento)
  -- controle
  cash_entry_id uuid references cash_entries(id) on delete set null,  -- pagamento lançado
  stock_applied boolean not null default false,                       -- peças já baixadas do estoque
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, year, seq)
);

create index if not exists shop_orders_tenant_date on shop_orders(tenant_id, date desc);

-- Catálogo de serviços (pra não digitar tudo de novo)
create table if not exists shop_catalog (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  details text,
  unit text,
  unit_price numeric not null default 0,
  created_at timestamptz default now()
);

alter table shop_orders enable row level security;
alter table shop_catalog enable row level security;

drop policy if exists "shop_orders_tenant" on shop_orders;
create policy "shop_orders_tenant" on shop_orders for all
  using (tenant_id = my_tenant_id()) with check (tenant_id = my_tenant_id());

drop policy if exists "shop_catalog_tenant" on shop_catalog;
create policy "shop_catalog_tenant" on shop_catalog for all
  using (tenant_id = my_tenant_id()) with check (tenant_id = my_tenant_id());

notify pgrst, 'reload schema';
