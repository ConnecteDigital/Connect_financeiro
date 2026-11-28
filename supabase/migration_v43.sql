-- Migration v43 — Google Ads do técnico é POR DIA (Eletromark)
--
-- Corrige a v42: o técnico perde R$ 25 por DIA em que tem chamado agendado
-- (2 chamados no mesmo dia = − R$ 25, não − R$ 50).
--
-- Empresa (R$ 200 de Google Ads): continua por chamado. Se for por dia,
-- é só ligar call_fees.company_per_day = true (SQL no fim, comentado).
--
-- Rode DEPOIS da v42. Pode rodar de novo sem duplicar nada.

-- ─── 1. Linhas por dia (técnico e, se ligado, empresa) ───────────────
create or replace function _sync_day_fees(p_tenant uuid, p_aux uuid, p_day date)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_cfg jsonb;
  v_co numeric;
  v_tec numeric;
  v_label text;
  v_tag text;
  v_aux auxiliaries%rowtype;
begin
  if p_tenant is null or p_day is null then return; end if;
  select call_form_config -> 'call_fees' into v_cfg from tenants where id = p_tenant;
  if v_cfg is null or jsonb_typeof(v_cfg) <> 'object' then return; end if;
  v_co := coalesce(nullif(v_cfg ->> 'company_amount', '')::numeric, 0);
  v_tec := coalesce(nullif(v_cfg ->> 'tecnico_amount', '')::numeric, 0);
  v_label := coalesce(nullif(v_cfg ->> 'label', ''), 'Google Ads');

  -- Técnico: − R$ 25 se tem pelo menos 1 chamado agendado no dia
  if p_aux is not null then
    v_tag := 'agenda-tecnico-dia:' || p_aux || ':' || p_day;
    if v_tec > 0 and exists (
      select 1 from calls where tenant_id = p_tenant and technician_id = p_aux
        and coalesce(scheduled_date, date) = p_day and return_of_call_id is null
    ) then
      if not exists (select 1 from expenses where tenant_id = p_tenant and notes = v_tag) then
        select * into v_aux from auxiliaries where id = p_aux;
        insert into expenses (tenant_id, description, category, amount, type, status, due_date, auxiliary_id, notes)
        values (p_tenant, v_label || ' — ' || coalesce(v_aux.name, 'técnico') || ' ' || to_char(p_day, 'DD/MM'),
                'Pessoal', -v_tec, 'avulso', 'pendente', p_day, p_aux, v_tag);
      end if;
    else
      delete from expenses where tenant_id = p_tenant and notes = v_tag and status = 'pendente';
    end if;
  end if;

  -- Empresa por dia (só se company_per_day = true)
  v_tag := 'agenda-empresa-dia:' || p_day;
  if coalesce((v_cfg ->> 'company_per_day')::boolean, false) and v_co > 0 and exists (
    select 1 from calls where tenant_id = p_tenant
      and coalesce(scheduled_date, date) = p_day and return_of_call_id is null
  ) then
    if not exists (select 1 from expenses where tenant_id = p_tenant and notes = v_tag) then
      insert into expenses (tenant_id, description, category, amount, type, status, due_date, paid_date, notes)
      values (p_tenant, v_label || ' — dia ' || to_char(p_day, 'DD/MM'), 'Google Ads', v_co, 'avulso', 'pago', p_day, p_day, v_tag);
    end if;
  else
    delete from expenses where tenant_id = p_tenant and notes = v_tag;
  end if;
end;
$$;

-- ─── 2. Linha por chamado: só a da empresa (quando não é por dia) ────
create or replace function _sync_call_fees(p_call calls)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_cfg jsonb;
  v_co numeric;
  v_label text;
  v_day date := coalesce(p_call.scheduled_date, p_call.date);
  v_tag_co text := 'agenda-empresa:' || p_call.id;
  v_desc text;
begin
  -- o desconto do técnico por chamado (v42) não existe mais
  delete from expenses where tenant_id = p_call.tenant_id and notes = 'agenda-tecnico:' || p_call.id and status = 'pendente';

  select call_form_config -> 'call_fees' into v_cfg from tenants where id = p_call.tenant_id;
  if v_cfg is null or jsonb_typeof(v_cfg) <> 'object' then return; end if;
  v_co := coalesce(nullif(v_cfg ->> 'company_amount', '')::numeric, 0);
  v_label := coalesce(nullif(v_cfg ->> 'label', ''), 'Google Ads');

  if p_call.return_of_call_id is not null or v_co <= 0
     or coalesce((v_cfg ->> 'company_per_day')::boolean, false) then
    delete from expenses where tenant_id = p_call.tenant_id and notes = v_tag_co;
    return;
  end if;

  v_desc := v_label || ' — ' || coalesce(nullif(p_call.call_number, ''), 'chamado')
            || coalesce(' ' || nullif(trim(p_call.contact_name), ''), '');
  update expenses set due_date = v_day, paid_date = coalesce(paid_date, v_day), description = v_desc
  where tenant_id = p_call.tenant_id and notes = v_tag_co;
  if not found then
    insert into expenses (tenant_id, description, category, amount, type, status, due_date, paid_date, notes)
    values (p_call.tenant_id, v_desc, 'Google Ads', v_co, 'avulso', 'pago', v_day, v_day, v_tag_co);
  end if;
end;
$$;

-- ─── 3. Gatilho ─────────────────────────────────────────────────────
create or replace function _calls_fee_trigger()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from expenses where tenant_id = old.tenant_id
      and (notes = 'agenda-empresa:' || old.id
           or (notes = 'agenda-tecnico:' || old.id and status = 'pendente'));
    perform _sync_day_fees(old.tenant_id, old.technician_id, coalesce(old.scheduled_date, old.date));
    return old;
  end if;
  perform _sync_call_fees(new);
  perform _sync_day_fees(new.tenant_id, new.technician_id, coalesce(new.scheduled_date, new.date));
  if tg_op = 'UPDATE' then
    perform _sync_day_fees(old.tenant_id, old.technician_id, coalesce(old.scheduled_date, old.date));
  end if;
  return new;
end;
$$;

drop trigger if exists calls_fees on calls;
create trigger calls_fees
  after insert or update of technician_id, scheduled_date, date, return_of_call_id, contact_name or delete on calls
  for each row execute function _calls_fee_trigger();

-- ─── 4. Refaz os chamados que já existem na Eletromark ──────────────
-- Tira os − R$ 25 por chamado (v42, ainda não pagos) e lança 1 por técnico por dia
do $$
declare
  v_tenant uuid := (select id from tenants where slug = 'eletromark-refrigeracoes');
  c calls%rowtype;
  r record;
begin
  for c in select * from calls where tenant_id = v_tenant loop
    perform _sync_call_fees(c);
  end loop;
  for r in select distinct technician_id, coalesce(scheduled_date, date) as d
           from calls where tenant_id = v_tenant loop
    perform _sync_day_fees(v_tenant, r.technician_id, r.d);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- Conferir: 1 linha de − R$ 25 por técnico por dia
select e.description, e.amount, e.status
from expenses e
where e.tenant_id = (select id from tenants where slug = 'eletromark-refrigeracoes')
  and (e.notes like 'agenda-tecnico%')
order by e.due_date, e.description;

-- ─── OPCIONAL: R$ 200 da empresa por DIA em vez de por chamado ──────
-- update tenants
-- set call_form_config = call_form_config || jsonb_build_object('call_fees', (call_form_config -> 'call_fees') || '{"company_per_day": true}'::jsonb)
-- where slug = 'eletromark-refrigeracoes';
-- do $$
-- declare v_tenant uuid := (select id from tenants where slug = 'eletromark-refrigeracoes'); c calls%rowtype; r record;
-- begin
--   for c in select * from calls where tenant_id = v_tenant loop perform _sync_call_fees(c); end loop;
--   for r in select distinct coalesce(scheduled_date, date) as d from calls where tenant_id = v_tenant loop
--     perform _sync_day_fees(v_tenant, null, r.d);
--   end loop;
-- end $$;
