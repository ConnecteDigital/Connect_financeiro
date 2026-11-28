-- Migration v41 — Rodrigues: retorno "Resolvido".
--
-- Rode DEPOIS da v40. No retorno, além de Serviço aprovado / Não aprovado,
-- o técnico pode marcar "Resolvido" com a descrição do que fez. O chamado
-- fica como retorno concluído (sem OS e sem cobrança; se usou peça ou
-- cobrou algo, ele ainda pode completar a OS depois).
-- Só troca a função de encerrar (mesma da v38 + 'resolvido').

create or replace function finish_service_visit(
  p_call_id uuid, p_outcome text, p_notes text default null,
  p_new_date date default null, p_new_time time default null
) returns service_visits
language plpgsql security definer set search_path = public as $$
declare
  v_call calls%rowtype;
  v_visit service_visits%rowtype;
begin
  if p_outcome not in ('aprovado','aprovado_reagendado','resolvido','orcamento','remarcado','faltou_peca','cliente_ausente',
                       'nao_aprovou','sem_conserto','pagou_somente_visita','outro') then
    raise exception 'resultado inválido';
  end if;
  if p_outcome = 'aprovado_reagendado' and p_new_date is null then
    raise exception 'informe a nova data do serviço';
  end if;
  v_call := _can_work_call(p_call_id);
  if p_outcome = 'resolvido' then
    if v_call.return_of_call_id is null then raise exception '"Resolvido" é só pra retorno'; end if;
    if nullif(trim(coalesce(p_notes, '')), '') is null then raise exception 'descreva o que foi resolvido'; end if;
  end if;

  update service_visits
  set finished_at = now(), outcome = p_outcome, notes = nullif(trim(coalesce(p_notes, '')), '')
  where call_id = p_call_id and finished_at is null
  returning * into v_visit;
  if not found then raise exception 'nenhum serviço em andamento neste chamado'; end if;

  if p_outcome in ('aprovado', 'resolvido') then
    update calls
    set status = case when v_call.return_of_call_id is not null then 'retorno' else 'aprovado' end
    where id = p_call_id;
  elsif p_outcome in ('orcamento','nao_aprovou','pagou_somente_visita') then
    update calls set status = p_outcome where id = p_call_id;
  elsif p_outcome = 'sem_conserto' then
    update calls set status = 'nao_aprovou' where id = p_call_id;
  elsif p_new_date is not null then
    update calls
    set status = 'agendado', scheduled_date = p_new_date,
        scheduled_time = coalesce(p_new_time, scheduled_time)
    where id = p_call_id;
  end if;

  return v_visit;
end;
$$;

grant execute on function finish_service_visit(uuid, text, text, date, time) to authenticated;

notify pgrst, 'reload schema';

select 'v41 ok' as resultado;
