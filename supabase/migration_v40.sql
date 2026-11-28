-- Migration v40 — Abastecimento do técnico e taxa diária do Google Ads
-- (ligados por empresa; hoje só a Eletromark).
--
-- Rode DEPOIS da v39.
--
-- ABASTECIMENTO (call_form_config.fuel_logs = true)
--   O técnico paga a gasolina na bomba e lança no app (valor + foto da nota).
--   Na comissão dele entram duas linhas, pagas junto com a comissão da semana:
--     + Reembolso da gasolina (o valor inteiro que ele pagou)
--     − Gasolina na base da comissão (% do técnico × valor)
--   Ou seja: a gasolina sai da base antes da % — com 25%, de R$ 80 de
--   gasolina ele recebe R$ 80 de volta e perde R$ 20 de comissão.
--
-- TAXA DIÁRIA (call_form_config.daily_tech_fee = {"amount": 100, "label": "Google Ads"})
--   No primeiro serviço que o técnico INICIA no dia, entra na comissão dele
--   "− Google Ads dd/mm: R$ 100". Uma vez por dia, só nos dias trabalhados.

-- ─── 1. Abastecimentos ──────────────────────────────────────────────
create table if not exists fuel_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  auxiliary_id uuid not null references auxiliaries(id) on delete cascade,
  date date not null,
  amount numeric not null,
  photo_path text,                         -- foto da nota (bucket chamados-anexos)
  notes text,
  commission_pct numeric not null default 0,
  created_at timestamptz default now()
);

create index if not exists fuel_logs_tenant_date on fuel_logs(tenant_id, date desc);

alter table fuel_logs enable row level security;

drop policy if exists "fuel_logs_select" on fuel_logs;
create policy "fuel_logs_select" on fuel_logs for select using (
  tenant_id = my_tenant_id() and (my_role() <> 'tecnico' or auxiliary_id = my_auxiliary_id())
);
-- Gravação só pelas funções abaixo

create or replace function register_fuel(
  p_amount numeric, p_date date default null, p_photo_path text default null,
  p_notes text default null, p_auxiliary_id uuid default null
) returns fuel_logs
language plpgsql security definer set search_path = public as $$
declare
  v_aux auxiliaries%rowtype;
  v_log fuel_logs%rowtype;
  v_date date := coalesce(p_date, (now() at time zone 'America/Sao_Paulo')::date);
  v_pct numeric;
  v_label text;
begin
  if coalesce(p_amount, 0) <= 0 then raise exception 'informe o valor do abastecimento'; end if;
  -- Técnico lança o dele; o gestor pode lançar por um técnico
  if my_role() = 'tecnico' then
    select * into v_aux from auxiliaries where id = my_auxiliary_id();
  else
    select * into v_aux from auxiliaries where id = p_auxiliary_id and tenant_id = my_tenant_id();
  end if;
  if not found then raise exception 'técnico não encontrado'; end if;

  v_pct := coalesce(v_aux.percentage, 0);
  insert into fuel_logs (tenant_id, auxiliary_id, date, amount, photo_path, notes, commission_pct)
  values (v_aux.tenant_id, v_aux.id, v_date, p_amount, nullif(trim(coalesce(p_photo_path, '')), ''),
          nullif(trim(coalesce(p_notes, '')), ''), v_pct)
  returning * into v_log;

  v_label := coalesce(v_aux.name, 'técnico') || ' ' || to_char(v_date, 'DD/MM');
  insert into expenses (tenant_id, description, category, amount, type, status, due_date, auxiliary_id, notes)
  values (v_aux.tenant_id, 'Reembolso da gasolina — ' || v_label, 'Pessoal', p_amount, 'avulso', 'pendente', v_date, v_aux.id, 'combustivel:' || v_log.id);
  if v_pct > 0 then
    insert into expenses (tenant_id, description, category, amount, type, status, due_date, auxiliary_id, notes)
    values (v_aux.tenant_id, 'Gasolina na base da comissão (' || trim_scale(v_pct)::text || '%) — ' || v_label,
            'Pessoal', -round(p_amount * v_pct / 100, 2), 'avulso', 'pendente', v_date, v_aux.id, 'combustivel:' || v_log.id);
  end if;
  return v_log;
end;
$$;

-- Apagar um abastecimento lançado errado (enquanto a comissão não foi paga)
create or replace function delete_fuel(p_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_log fuel_logs%rowtype;
begin
  select * into v_log from fuel_logs where id = p_id and tenant_id = my_tenant_id();
  if not found then raise exception 'abastecimento não encontrado'; end if;
  if my_role() = 'tecnico' and v_log.auxiliary_id is distinct from my_auxiliary_id() then
    raise exception 'sem permissão';
  end if;
  if exists (select 1 from expenses where notes = 'combustivel:' || v_log.id and status = 'pago') then
    raise exception 'a comissão com esse abastecimento já foi paga; peça pro escritório ajustar';
  end if;
  delete from expenses where notes = 'combustivel:' || v_log.id;
  delete from fuel_logs where id = v_log.id;
  return v_log.photo_path;
end;
$$;

grant execute on function register_fuel(numeric, date, text, text, uuid) to authenticated;
grant execute on function delete_fuel(uuid) to authenticated;

-- ─── 2. Taxa diária (Google Ads) ────────────────────────────────────
create or replace function _apply_daily_tech_fee()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_cfg jsonb;
  v_amount numeric;
  v_label text;
  v_day date;
  v_aux auxiliaries%rowtype;
  v_tag text;
begin
  if new.auxiliary_id is null then return new; end if;
  select call_form_config -> 'daily_tech_fee' into v_cfg from tenants where id = new.tenant_id;
  v_amount := coalesce(nullif(v_cfg ->> 'amount', '')::numeric, 0);
  if v_amount <= 0 then return new; end if;

  v_label := coalesce(nullif(v_cfg ->> 'label', ''), 'Taxa diária');
  v_day := (coalesce(new.started_at, now()) at time zone 'America/Sao_Paulo')::date;
  v_tag := 'taxa-dia:' || new.auxiliary_id || ':' || v_day;
  if exists (select 1 from expenses where tenant_id = new.tenant_id and notes = v_tag) then return new; end if;

  select * into v_aux from auxiliaries where id = new.auxiliary_id;
  insert into expenses (tenant_id, description, category, amount, type, status, due_date, auxiliary_id, notes)
  values (new.tenant_id, v_label || ' — ' || coalesce(v_aux.name, 'técnico') || ' ' || to_char(v_day, 'DD/MM'),
          'Pessoal', -v_amount, 'avulso', 'pendente', v_day, new.auxiliary_id, v_tag);
  return new;
end;
$$;

drop trigger if exists service_visits_daily_fee on service_visits;
create trigger service_visits_daily_fee after insert on service_visits
  for each row execute function _apply_daily_tech_fee();

-- ─── 3. Liga pra Eletromark ─────────────────────────────────────────
update tenants
set call_form_config = coalesce(call_form_config, '{}'::jsonb) || jsonb_build_object(
  'fuel_logs', true,
  'daily_tech_fee', jsonb_build_object('amount', 100, 'label', 'Google Ads')
)
where slug = 'eletromark-refrigeracoes';

notify pgrst, 'reload schema';

-- Conferir
select 'v40 ok' as resultado,
  (select count(*) from information_schema.tables where table_name = 'fuel_logs') as tabela_abastecimento,
  (select count(*) from pg_trigger where tgname = 'service_visits_daily_fee') as taxa_diaria,
  (select call_form_config -> 'daily_tech_fee' from tenants where slug = 'eletromark-refrigeracoes') as config_eletromark;
