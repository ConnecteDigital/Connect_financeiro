-- Migration v30 — Rodrigues: bloqueios de agenda e duração do serviço.
--
-- Rode DEPOIS da v29. Aditivo: tabela nova + coluna nova. Os outros
-- clientes não usam nada disso.
--
--  • schedule_blocks: horário em que o técnico não pode ser agendado
--    (lava-louça na loja, cabelo toda terça, pessoal...). Pode ser de um
--    dia só ou repetir toda semana no mesmo dia da semana.
--  • calls.duration_minutes: quanto tempo o serviço deve levar (padrão
--    na tela: 60). Serve pro painel do dia e pro aviso de conflito.

create table if not exists schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  auxiliary_id uuid references auxiliaries(id) on delete cascade,  -- null = todos os técnicos
  date date not null,                 -- dia (ou primeiro dia, se repete)
  all_day boolean not null default false,
  start_time time,                    -- null quando all_day
  end_time time,
  reason text,
  repeat_weekly boolean not null default false,
  repeat_until date,                  -- null = sem fim
  created_at timestamptz default now()
);

create index if not exists schedule_blocks_tenant_date on schedule_blocks(tenant_id, date);

alter table schedule_blocks enable row level security;

drop policy if exists "schedule_blocks_select" on schedule_blocks;
create policy "schedule_blocks_select" on schedule_blocks for select
  using (tenant_id = my_tenant_id());

drop policy if exists "schedule_blocks_write" on schedule_blocks;
create policy "schedule_blocks_write" on schedule_blocks for all
  using (tenant_id = my_tenant_id() and my_role() <> 'tecnico')
  with check (tenant_id = my_tenant_id() and my_role() <> 'tecnico');

alter table calls add column if not exists duration_minutes int;

notify pgrst, 'reload schema';
