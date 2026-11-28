-- Migration v42 — Google Ads por chamado agendado (Eletromark)
--
-- Substitui a regra dos R$ 100 por dia trabalhado (v40) por esta:
--   • Todo chamado agendado na empresa  → saída de R$ 200 "Google Ads"
--     no financeiro (painel do gestor), já como paga, na data do chamado.
--   • Todo chamado agendado pra um técnico → − R$ 35 na comissão dele
--     (no líquido), na data do chamado.
--
-- Regras:
--   • Trocou o técnico do chamado → os − R$ 35 passam pro técnico novo.
--   • Tirou o técnico → os − R$ 35 saem.
--   • Mudou a data → as duas linhas vão pra data nova.
--   • Apagou o chamado → as duas linhas saem (o − R$ 35 só se a comissão
--     ainda não foi paga).
--   • Chamado cancelado continua cobrando (o anúncio já foi gasto).
--   • Retorno NÃO cobra (não é cliente novo).
--
-- Fica em call_form_config.call_fees; só a Eletromark tem.
-- Rode DEPOIS da v41. Pode rodar de novo sem duplicar nada.

-- ─── 1. Lança / ajusta as linhas de um chamado ──────────────────────
create or replace function _sync_call_fees(p_call calls)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_cfg jsonb;
  v_co numeric;
  v_tec numeric;
  v_label text;
  v_day date;
  v_tag_co text := 'agenda-empresa:' || p_call.id;
  v_tag_tec text := 'agenda-tecnico:' || p_call.id;
  v_num text := coalesce(nullif(p_call.call_number, ''), 'chamado');
  v_aux auxiliaries%rowtype;
  v_desc text;
begin
  select call_form_config -> 'call_fees' into v_cfg from tenants where id = p_call.tenant_id;
  if v_cfg is null or jsonb_typeof(v_cfg) <> 'object' then return; end if;

  v_co := coalesce(nullif(v_cfg ->> 'company_amount', '')::numeric, 0);
  v_tec := coalesce(nullif(v_cfg ->> 'tecnico_amount', '')::numeric, 0);
  v_label := coalesce(nullif(v_cfg ->> 'label', ''), 'Google Ads');
  v_day := coalesce(p_call.scheduled_date, p_call.date);

  -- Retorno não cobra
  if p_call.return_of_call_id is not null then
    delete from expenses where tenant_id = p_call.tenant_id
      and (notes = v_tag_co or (notes = v_tag_tec and status = 'pendente'));
    return;
  end if;

  -- Empresa: R$ 200 de Google Ads
  if v_co > 0 then
    v_desc := v_label || ' — ' || v_num || coalesce(' ' || nullif(trim(p_call.contact_name), ''), '');
    update expenses set due_date = v_day, paid_date = coalesce(paid_date, v_day), description = v_desc
    where tenant_id = p_call.tenant_id and notes = v_tag_co;
    if not found then
      insert into expenses (tenant_id, description, category, amount, type, status, due_date, paid_date, notes)
      values (p_call.tenant_id, v_desc, 'Google Ads', v_co, 'avulso', 'pago', v_day, v_day, v_tag_co);
    end if;
  end if;

  -- Técnico: − R$ 35 na comissão
  if p_call.technician_id is null or v_tec <= 0 then
    delete from expenses where tenant_id = p_call.tenant_id and notes = v_tag_tec and status = 'pendente';
  else
    select * into v_aux from auxiliaries where id = p_call.technician_id;
    v_desc := v_label || ' (agendamento) — ' || coalesce(v_aux.name, 'técnico') || ' ' || v_num || ' ' || to_char(v_day, 'DD/MM');
    update expenses set auxiliary_id = p_call.technician_id, due_date = v_day, description = v_desc
    where tenant_id = p_call.tenant_id and notes = v_tag_tec and status = 'pendente';
    if not found and not exists (select 1 from expenses where tenant_id = p_call.tenant_id and notes = v_tag_tec) then
      insert into expenses (tenant_id, description, category, amount, type, status, due_date, auxiliary_id, notes)
      values (p_call.tenant_id, v_desc, 'Pessoal', -v_tec, 'avulso', 'pendente', v_day, p_call.technician_id, v_tag_tec);
    end if;
  end if;
end;
$$;

-- ─── 2. Gatilho nos chamados ────────────────────────────────────────
create or replace function _calls_fee_trigger()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from expenses where tenant_id = old.tenant_id
      and (notes = 'agenda-empresa:' || old.id
           or (notes = 'agenda-tecnico:' || old.id and status = 'pendente'));
    return old;
  end if;
  perform _sync_call_fees(new);
  return new;
end;
$$;

drop trigger if exists calls_fees on calls;
create trigger calls_fees
  after insert or update of technician_id, scheduled_date, date, return_of_call_id, contact_name or delete on calls
  for each row execute function _calls_fee_trigger();

-- ─── 3. Liga pra Eletromark (e desliga os R$ 100 por dia) ───────────
update tenants
set call_form_config = (coalesce(call_form_config, '{}'::jsonb) - 'daily_tech_fee') || jsonb_build_object(
  'call_fees', jsonb_build_object('company_amount', 200, 'tecnico_amount', 35, 'label', 'Google Ads')
)
where slug = 'eletromark-refrigeracoes';

-- ─── 4. Aplica nos chamados que já existem na Eletromark ────────────
-- (só cria as linhas que faltam, não apaga nada)
do $$
declare
  c calls%rowtype;
begin
  for c in select * from calls where tenant_id = (select id from tenants where slug = 'eletromark-refrigeracoes') loop
    perform _sync_call_fees(c);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- Conferir
with t as (select id from tenants where slug = 'eletromark-refrigeracoes')
select 'v42 ok' as resultado,
  (select call_form_config -> 'call_fees' from tenants where id = (select id from t)) as regra,
  (select count(*) from calls where tenant_id = (select id from t) and return_of_call_id is null) as chamados,
  (select count(*) from expenses where tenant_id = (select id from t) and notes like 'agenda-empresa:%') as linhas_google_ads_200,
  (select count(*) from expenses where tenant_id = (select id from t) and notes like 'agenda-tecnico:%') as linhas_tecnico_35,
  (select count(*) from expenses where tenant_id = (select id from t) and notes like 'taxa-dia:%') as linhas_antigas_100_por_dia;
