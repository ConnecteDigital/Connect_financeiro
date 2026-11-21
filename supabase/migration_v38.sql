-- Migration v38 — Rodrigues: assinatura fixa do técnico, "aprovado, fazer
-- em outro horário" e venda / revenda na conta Loja.
--
-- Rode DEPOIS da v37. Os outros clientes não usam nada disso.

-- ─── 1. Assinatura fixa de cada técnico ─────────────────────────────
-- O técnico assina uma vez em "Ajustes"; a OS, o certificado e o
-- relatório dos serviços dele já saem assinados.
create table if not exists tecnico_signatures (
  auxiliary_id uuid primary key references auxiliaries(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  image text not null,                       -- imagem (PNG) da assinatura
  updated_at timestamptz not null default now()
);

alter table tecnico_signatures enable row level security;

-- Todos da empresa enxergam (o gestor também gera a OS); cada técnico só
-- grava a própria.
drop policy if exists "tecnico_signatures_select" on tecnico_signatures;
create policy "tecnico_signatures_select" on tecnico_signatures for select using (tenant_id = my_tenant_id());

drop policy if exists "tecnico_signatures_write" on tecnico_signatures;
create policy "tecnico_signatures_write" on tecnico_signatures for all using (
  tenant_id = my_tenant_id() and (my_role() <> 'tecnico' or auxiliary_id = my_auxiliary_id())
) with check (
  tenant_id = my_tenant_id() and (my_role() <> 'tecnico' or auxiliary_id = my_auxiliary_id())
);

-- ─── 2. Encerrar: "aprovado, fazer em outro horário" ────────────────
-- Cliente aprovou, mas o técnico tem outro serviço agora: o chamado
-- continua AGENDADO, na nova data/horário, e a visita fica marcada como
-- aprovada. A função ganha o horário (p_new_time), então a versão antiga
-- (sem ele) é trocada.
drop function if exists finish_service_visit(uuid, text, text, date);

create or replace function finish_service_visit(
  p_call_id uuid, p_outcome text, p_notes text default null,
  p_new_date date default null, p_new_time time default null
) returns service_visits
language plpgsql security definer set search_path = public as $$
declare
  v_call calls%rowtype;
  v_visit service_visits%rowtype;
begin
  if p_outcome not in ('aprovado','aprovado_reagendado','orcamento','remarcado','faltou_peca','cliente_ausente',
                       'nao_aprovou','sem_conserto','pagou_somente_visita','outro') then
    raise exception 'resultado inválido';
  end if;
  if p_outcome = 'aprovado_reagendado' and p_new_date is null then
    raise exception 'informe a nova data do serviço';
  end if;
  v_call := _can_work_call(p_call_id);

  update service_visits
  set finished_at = now(), outcome = p_outcome, notes = nullif(trim(coalesce(p_notes, '')), '')
  where call_id = p_call_id and finished_at is null
  returning * into v_visit;
  if not found then raise exception 'nenhum serviço em andamento neste chamado'; end if;

  if p_outcome = 'aprovado' then
    update calls
    set status = case when v_call.return_of_call_id is not null then 'retorno' else 'aprovado' end
    where id = p_call_id;
  elsif p_outcome in ('orcamento','nao_aprovou','pagou_somente_visita') then
    update calls set status = p_outcome where id = p_call_id;
  elsif p_outcome = 'sem_conserto' then
    update calls set status = 'nao_aprovou' where id = p_call_id;
  elsif p_new_date is not null then
    -- remarcado / faltou peça / cliente ausente / aprovado pra outro horário
    update calls
    set status = 'agendado', scheduled_date = p_new_date,
        scheduled_time = coalesce(p_new_time, scheduled_time)
    where id = p_call_id;
  end if;

  return v_visit;
end;
$$;

grant execute on function finish_service_visit(uuid, text, text, date, time) to authenticated;

-- ─── 3. Loja: venda e revenda ───────────────────────────────────────
--   kind: 'servico' (conserto/orçamento, como era), 'venda' (produto da
--   loja) ou 'revenda' (produto de um cliente, vendido pela loja)
alter table shop_orders add column if not exists kind text not null default 'servico';
alter table shop_orders add column if not exists client_cpf text;
alter table shop_orders add column if not exists owner_name text;                        -- revenda: dono do produto
alter table shop_orders add column if not exists owner_phone text;
alter table shop_orders add column if not exists owner_amount numeric not null default 0; -- revenda: quanto repassar pro dono
alter table shop_orders add column if not exists card_fee_pct numeric not null default 0; -- taxa da maquininha (%)
alter table shop_orders add column if not exists sale_received boolean not null default true;

notify pgrst, 'reload schema';

-- Conferir
select 'v38 ok' as resultado,
  (select count(*) from information_schema.tables where table_name = 'tecnico_signatures') as tabela_assinatura_tecnico,
  (select count(*) from information_schema.columns where table_name = 'shop_orders' and column_name in ('kind','client_cpf','owner_name','owner_phone','owner_amount','card_fee_pct','sale_received')) as colunas_venda,
  (select count(*) from pg_proc where proname = 'finish_service_visit') as funcao_encerrar;
