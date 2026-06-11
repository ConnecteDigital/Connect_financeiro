-- =============================================
-- CONNECTE FINANCEIRO - Schema Multi-Tenant
-- Execute no SQL Editor do Supabase
-- =============================================

create extension if not exists "uuid-ossp";

-- =============================================
-- TENANTS (empresas clientes)
-- =============================================
create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  logo_url text,
  primary_color text default '#f97316',
  call_origins text[] default array['indicacao','terceirizado'],
  active boolean default true,
  created_at timestamptz default now()
);

-- =============================================
-- PROFILES (usuários vinculados a um tenant)
-- =============================================
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  tenant_id uuid not null references tenants(id) on delete restrict,
  name text,
  role text not null default 'user' check (role in ('admin','user')),
  active boolean default true,
  created_at timestamptz default now()
);

-- =============================================
-- EQUIPES
-- =============================================
create table teams (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique (tenant_id, name)
);

-- =============================================
-- TIPOS DE SERVIÇO
-- =============================================
create table service_types (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  category text,
  active boolean default true,
  created_at timestamptz default now(),
  unique (tenant_id, name)
);

-- =============================================
-- AUXILIARES
-- =============================================
create table auxiliaries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  percentage numeric default 0 not null,
  created_at timestamptz default now()
);

-- =============================================
-- FORNECEDORES
-- =============================================
create table suppliers (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  category text,
  contact text,
  phone text,
  email text,
  notes text,
  created_at timestamptz default now()
);

-- =============================================
-- CLIENTES
-- =============================================
create table clients (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  code text,
  name text not null,
  cpf_cnpj text,
  inscr_est text,
  address text,
  neighborhood text,
  city text,
  state text,
  cep text,
  phone text,
  email text,
  created_at timestamptz default now(),
  unique (tenant_id, code)
);

-- =============================================
-- CHAMADOS
-- =============================================
create table calls (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  date date not null default current_date,
  client_id uuid references clients(id) on delete set null,
  contact_name text,
  contact_phone text,
  origin text not null,
  status text not null default 'agendado' check (status in ('agendado','aprovado','nao_aprovou','nao_quis_visita','cancelado')),
  notes text,
  service_category text,
  scheduled_time time,
  scheduled_date date,
  call_address text,
  call_city text,
  call_neighborhood text,
  call_number text,
  created_at timestamptz default now()
);

-- =============================================
-- ORDENS DE SERVIÇO
-- =============================================
create table service_orders (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  call_id uuid references calls(id) on delete cascade,
  os_number text,
  date date not null default current_date,
  client_id uuid references clients(id) on delete set null,
  team_id uuid references teams(id) on delete set null,
  auxiliary_id uuid references auxiliaries(id) on delete set null,
  auxiliary_value numeric default 0,
  driver text,
  nf_number text,
  vehicle text,
  due_date date,
  service_type text not null default 'proprio' check (service_type in ('proprio','terceirizado_saida','terceirizado_entrada')),
  billing_system text check (billing_system in ('metro_linear','metro_cubico','litros','carga','valor_fechado','metro_quadrado')),
  has_floor_plan boolean default false,
  has_no_floor_plan boolean default false,
  has_no_knowledge boolean default false,
  has_hydraulic_plan boolean default false,
  has_no_hydraulic_plan boolean default false,
  has_guarantee boolean default false,
  has_no_guarantee boolean default false,
  has_guarantee_60 boolean default false,
  has_guarantee_90 boolean default false,
  equipment_rental_pct numeric default 0,
  equipment_rental_value numeric default 0,
  subtotal numeric default 0,
  discount numeric default 0,
  taxes numeric default 0,
  total_value numeric default 0,
  other_service_value numeric default 0,
  own_material_cost numeric default 0,
  own_fuel_cost numeric default 0,
  own_other_cost numeric default 0,
  outsource_fuel_cost numeric default 0,
  outsource_meal_cost numeric default 0,
  outsource_truck_cost numeric default 0,
  outsource_other_cost numeric default 0,
  outsource_profit_pct numeric default 50,
  partner_name text,
  my_revenue_pct numeric default 100,
  payment_method text,
  payment_status text not null default 'pendente' check (payment_status in ('pago','pago_parcial','pendente')),
  amount_paid numeric default 0,
  remaining_amount numeric default 0,
  remaining_due_date date,
  conditions text,
  observations text,
  created_at timestamptz default now(),
  unique (tenant_id, os_number)
);

-- =============================================
-- ITENS DA OS
-- =============================================
create table service_order_items (
  id uuid primary key default uuid_generate_v4(),
  service_order_id uuid references service_orders(id) on delete cascade,
  quantity numeric not null default 1,
  description text not null,
  unit_price numeric not null default 0,
  total numeric generated always as (quantity * unit_price) stored,
  category text,
  sub_options text,
  notes text,
  created_at timestamptz default now()
);

-- =============================================
-- SAÍDAS (DESPESAS)
-- =============================================
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  description text not null,
  category text not null,
  amount numeric not null default 0,
  type text not null default 'avulso' check (type in ('fixo','avulso')),
  status text not null default 'pendente' check (status in ('pago','pendente')),
  due_date date not null,
  paid_date date,
  recurrence_day int check (recurrence_day between 1 and 31),
  notes text,
  supplier_id uuid references suppliers(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  google_site text,
  created_at timestamptz default now()
);

-- =============================================
-- SEQUÊNCIAS DE NUMERAÇÃO POR TENANT
-- =============================================
create table tenant_sequences (
  tenant_id uuid not null references tenants(id) on delete cascade,
  sequence_name text not null,
  current_value bigint not null default 0,
  primary key (tenant_id, sequence_name)
);

create or replace function next_tenant_sequence(p_tenant_id uuid, p_name text)
returns bigint as $$
declare
  v_next bigint;
begin
  insert into tenant_sequences (tenant_id, sequence_name, current_value)
    values (p_tenant_id, p_name, 1)
    on conflict (tenant_id, sequence_name) do update
      set current_value = tenant_sequences.current_value + 1
    returning current_value into v_next;
  return v_next;
end;
$$ language plpgsql;

-- =============================================
-- TRIGGER: NUMERAÇÃO AUTOMÁTICA DE OS POR TENANT
-- =============================================
create or replace function generate_os_number()
returns trigger as $$
begin
  if new.os_number is null then
    new.os_number := 'OS-' || lpad(next_tenant_sequence(new.tenant_id, 'os')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger set_os_number
  before insert on service_orders
  for each row execute function generate_os_number();

-- =============================================
-- TRIGGER: NUMERAÇÃO AUTOMÁTICA DE CLIENTES POR TENANT
-- =============================================
create or replace function generate_client_code()
returns trigger as $$
begin
  if new.code is null then
    new.code := 'CLI-' || lpad(next_tenant_sequence(new.tenant_id, 'client')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger set_client_code
  before insert on clients
  for each row execute function generate_client_code();

-- =============================================
-- TRIGGER: NUMERAÇÃO AUTOMÁTICA DE CHAMADOS POR TENANT
-- =============================================
create or replace function generate_call_number()
returns trigger as $$
begin
  if new.call_number is null then
    new.call_number := 'CH-' || lpad(next_tenant_sequence(new.tenant_id, 'call')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger set_call_number
  before insert on calls
  for each row execute function generate_call_number();

-- =============================================
-- TRIGGER: CRIAR PROFILE AUTOMÁTICO NO SIGNUP
-- =============================================
create or replace function handle_new_user()
returns trigger as $$
begin
  if new.raw_user_meta_data->>'tenant_id' is not null then
    insert into profiles (id, tenant_id, name, role)
    values (
      new.id,
      (new.raw_user_meta_data->>'tenant_id')::uuid,
      coalesce(new.raw_user_meta_data->>'name', new.email),
      coalesce(new.raw_user_meta_data->>'role', 'user')
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table tenants enable row level security;
alter table profiles enable row level security;
alter table teams enable row level security;
alter table service_types enable row level security;
alter table auxiliaries enable row level security;
alter table suppliers enable row level security;
alter table clients enable row level security;
alter table calls enable row level security;
alter table service_orders enable row level security;
alter table service_order_items enable row level security;
alter table expenses enable row level security;
alter table tenant_sequences enable row level security;

-- Função auxiliar: retorna o tenant_id do usuário logado
create or replace function my_tenant_id()
returns uuid as $$
  select tenant_id from profiles where id = auth.uid()
$$ language sql security definer stable;

-- Policies: cada usuário vê apenas dados do seu tenant
create policy "tenant_isolation" on teams for all using (tenant_id = my_tenant_id());
create policy "tenant_isolation" on service_types for all using (tenant_id = my_tenant_id());
create policy "tenant_isolation" on auxiliaries for all using (tenant_id = my_tenant_id());
create policy "tenant_isolation" on suppliers for all using (tenant_id = my_tenant_id());
create policy "tenant_isolation" on clients for all using (tenant_id = my_tenant_id());
create policy "tenant_isolation" on calls for all using (tenant_id = my_tenant_id());
create policy "tenant_isolation" on service_orders for all using (tenant_id = my_tenant_id());
create policy "tenant_isolation" on expenses for all using (tenant_id = my_tenant_id());
create policy "tenant_isolation" on tenant_sequences for all using (tenant_id = my_tenant_id());

create policy "tenant_isolation" on service_order_items for all
  using (service_order_id in (
    select id from service_orders where tenant_id = my_tenant_id()
  ));

create policy "own_profile" on profiles for select using (tenant_id = my_tenant_id());
create policy "own_profile_update" on profiles for update using (id = auth.uid());
create policy "own_tenant" on tenants for select using (id = my_tenant_id());
