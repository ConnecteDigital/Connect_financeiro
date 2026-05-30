-- =============================================
-- MILLENIUM FINANCEIRO - Schema do Banco de Dados
-- Execute no SQL Editor do Supabase
-- =============================================

-- Extensão para UUID
create extension if not exists "uuid-ossp";

-- =============================================
-- EQUIPES
-- =============================================
create table teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now()
);

-- =============================================
-- CLIENTES
-- =============================================
create table clients (
  id uuid primary key default uuid_generate_v4(),
  code text unique,
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
  created_at timestamptz default now()
);

-- =============================================
-- CHAMADOS
-- =============================================
create table calls (
  id uuid primary key default uuid_generate_v4(),
  date date not null default current_date,
  client_id uuid references clients(id) on delete set null,
  origin text not null check (origin in ('site_millenium','site_praja','indicacao','terceirizado')),
  status text not null check (status in ('agendado','aprovado','nao_quis_visita','cancelado')),
  notes text,
  created_at timestamptz default now()
);

-- =============================================
-- ORDENS DE SERVIÇO
-- =============================================
create table service_orders (
  id uuid primary key default uuid_generate_v4(),
  call_id uuid references calls(id) on delete cascade,
  os_number text unique,
  date date not null default current_date,
  client_id uuid references clients(id) on delete set null,
  team_id uuid references teams(id) on delete set null,
  driver text,
  nf_number text,
  vehicle text,
  due_date date,
  -- Tipo de execução
  service_type text not null check (service_type in ('proprio','terceirizado_saida','terceirizado_entrada')),
  -- Sistema de cobrança
  billing_system text check (billing_system in ('metro_linear','metro_cubico','litros','carga','valor_fechado','metro_quadrado')),
  -- Levantamento
  has_floor_plan boolean default false,
  has_hydraulic_plan boolean default false,
  has_guarantee boolean default false,
  -- Financeiro
  equipment_rental_pct numeric(5,2) default 0,
  equipment_rental_value numeric(12,2) default 0,
  subtotal numeric(12,2) default 0,
  discount numeric(12,2) default 0,
  taxes numeric(12,2) default 0,
  total_value numeric(12,2) default 0,
  -- Custos terceirizado
  outsource_fuel_cost numeric(12,2) default 0,
  outsource_meal_cost numeric(12,2) default 0,
  outsource_truck_cost numeric(12,2) default 0,
  outsource_other_cost numeric(12,2) default 0,
  -- Pagamento
  payment_method text,
  payment_status text not null default 'pendente' check (payment_status in ('pago','pago_parcial','pendente')),
  amount_paid numeric(12,2) default 0,
  remaining_amount numeric(12,2) default 0,
  remaining_due_date date,
  conditions text,
  observations text,
  created_at timestamptz default now()
);

-- =============================================
-- ITENS DA OS
-- =============================================
create table service_order_items (
  id uuid primary key default uuid_generate_v4(),
  service_order_id uuid references service_orders(id) on delete cascade,
  quantity numeric(10,3) not null default 1,
  description text not null,
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) generated always as (quantity * unit_price) stored
);

-- =============================================
-- SAÍDAS (DESPESAS)
-- =============================================
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  description text not null,
  category text not null,
  amount numeric(12,2) not null,
  type text not null check (type in ('fixo','avulso')),
  status text not null default 'pendente' check (status in ('pago','pendente')),
  due_date date not null,
  paid_date date,
  recurrence_day int check (recurrence_day between 1 and 31),
  notes text,
  created_at timestamptz default now()
);

-- =============================================
-- NUMERAÇÃO AUTOMÁTICA DE OS
-- =============================================
create sequence os_number_seq start 1;

create or replace function generate_os_number()
returns trigger as $$
begin
  new.os_number := 'OS-' || lpad(nextval('os_number_seq')::text, 5, '0');
  return new;
end;
$$ language plpgsql;

create trigger set_os_number
  before insert on service_orders
  for each row
  when (new.os_number is null)
  execute function generate_os_number();

-- =============================================
-- NUMERAÇÃO AUTOMÁTICA DE CLIENTES
-- =============================================
create sequence client_code_seq start 1;

create or replace function generate_client_code()
returns trigger as $$
begin
  new.code := 'CLI-' || lpad(nextval('client_code_seq')::text, 4, '0');
  return new;
end;
$$ language plpgsql;

create trigger set_client_code
  before insert on clients
  for each row
  when (new.code is null)
  execute function generate_client_code();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
alter table teams enable row level security;
alter table clients enable row level security;
alter table calls enable row level security;
alter table service_orders enable row level security;
alter table service_order_items enable row level security;
alter table expenses enable row level security;

-- Política: apenas usuários autenticados acessam
create policy "Authenticated users only" on teams for all using (auth.role() = 'authenticated');
create policy "Authenticated users only" on clients for all using (auth.role() = 'authenticated');
create policy "Authenticated users only" on calls for all using (auth.role() = 'authenticated');
create policy "Authenticated users only" on service_orders for all using (auth.role() = 'authenticated');
create policy "Authenticated users only" on service_order_items for all using (auth.role() = 'authenticated');
create policy "Authenticated users only" on expenses for all using (auth.role() = 'authenticated');

-- =============================================
-- DADOS INICIAIS
-- =============================================
insert into teams (name) values ('Equipe A'), ('Equipe B');
