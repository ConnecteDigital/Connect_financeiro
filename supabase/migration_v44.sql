-- Migration v44 — Eletromark: comissão do técnico na taxa de visita e
-- acerto da comissão por dia.
--
-- TAXA DE VISITA (call_form_config.visit_fee_commission = true)
--   Chamado encerrado como "Pagou somente a taxa": o técnico ganha a % dele
--   sobre o "Valor da visita" do chamado. Entra na comissão dele na data do
--   chamado. Mudou o valor, o técnico ou o resultado → a linha se ajusta
--   (enquanto não foi paga).
--
-- ACERTO POR DIA (call_form_config.commission_settlement = 'dia')
--   Só muda as telas do técnico ("Comissão a receber · hoje", aba Dia).
--
-- Rode DEPOIS da v43. Pode rodar de novo sem duplicar nada.

create or replace function _sync_visit_fee_commission(p_call calls)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_on boolean;
  v_tag text := 'taxa-visita:' || p_call.id;
  v_aux auxiliaries%rowtype;
  v_pct numeric;
  v_amount numeric;
  v_day date := coalesce(p_call.scheduled_date, p_call.date);
  v_desc text;
begin
  select coalesce((call_form_config ->> 'visit_fee_commission')::boolean, false) into v_on
  from tenants where id = p_call.tenant_id;

  if p_call.technician_id is not null then
    select * into v_aux from auxiliaries where id = p_call.technician_id;
  end if;
  v_pct := coalesce(v_aux.percentage, 0);
  v_amount := round(coalesce(p_call.visit_fee, 0) * v_pct / 100, 2);

  if not coalesce(v_on, false) or p_call.status is distinct from 'pagou_somente_visita'
     or p_call.technician_id is null or v_amount <= 0 then
    delete from expenses where tenant_id = p_call.tenant_id and notes = v_tag and status = 'pendente';
    return;
  end if;

  v_desc := 'Comissão taxa de visita (' || trim_scale(v_pct)::text || '%) — ' || coalesce(v_aux.name, 'técnico')
            || ' ' || coalesce(nullif(p_call.call_number, ''), '') || ' ' || to_char(v_day, 'DD/MM');
  update expenses set amount = v_amount, auxiliary_id = p_call.technician_id, due_date = v_day, description = v_desc
  where tenant_id = p_call.tenant_id and notes = v_tag and status = 'pendente';
  if not found and not exists (select 1 from expenses where tenant_id = p_call.tenant_id and notes = v_tag) then
    insert into expenses (tenant_id, description, category, amount, type, status, due_date, auxiliary_id, notes)
    values (p_call.tenant_id, v_desc, 'Pessoal', v_amount, 'avulso', 'pendente', v_day, p_call.technician_id, v_tag);
  end if;
end;
$$;

create or replace function _calls_visit_fee_trigger()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from expenses where tenant_id = old.tenant_id and notes = 'taxa-visita:' || old.id and status = 'pendente';
    return old;
  end if;
  perform _sync_visit_fee_commission(new);
  return new;
end;
$$;

drop trigger if exists calls_visit_fee_commission on calls;
create trigger calls_visit_fee_commission
  after insert or update of status, visit_fee, technician_id, scheduled_date, date or delete on calls
  for each row execute function _calls_visit_fee_trigger();

-- Liga pra Eletromark
update tenants
set call_form_config = coalesce(call_form_config, '{}'::jsonb)
  || jsonb_build_object('visit_fee_commission', true, 'commission_settlement', 'dia')
where slug = 'eletromark-refrigeracoes';

-- Aplica nos chamados que já pagaram só a taxa
do $$
declare
  c calls%rowtype;
begin
  for c in select * from calls
           where tenant_id = (select id from tenants where slug = 'eletromark-refrigeracoes')
             and status = 'pagou_somente_visita' loop
    perform _sync_visit_fee_commission(c);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- Conferir
with t as (select id from tenants where slug = 'eletromark-refrigeracoes')
select 'v44 ok' as resultado,
  (select call_form_config ->> 'commission_settlement' from tenants where id = (select id from t)) as acerto,
  (select count(*) from calls where tenant_id = (select id from t) and status = 'pagou_somente_visita') as chamados_so_taxa,
  (select count(*) from calls where tenant_id = (select id from t) and status = 'pagou_somente_visita' and coalesce(visit_fee, 0) <= 0) as sem_valor_da_visita,
  (select count(*) from expenses where tenant_id = (select id from t) and notes like 'taxa-visita:%') as comissoes_taxa_lancadas;
