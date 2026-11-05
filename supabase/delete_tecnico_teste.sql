-- Apaga o técnico de teste "Técnico 1" da Rodrigues Refrigeração.
--   • apaga as comissões (saídas) dele no financeiro
--   • apaga o estoque dele (as 87 peças copiadas)
--   • tira ele dos chamados em que estava como técnico (o chamado fica sem técnico)
--   • apaga o perfil de login dele
-- Depois, no Supabase: Authentication → Users → apague o usuário
-- tecnico1@gmail.com (isso remove o login de vez).
-- Se não achar exatamente um "Técnico 1", para sem mexer em nada.

do $$
declare
  v_tenant_id uuid;
  v_aux_id uuid;
  v_profile_id uuid;
  v_matches int;
begin
  select id into v_tenant_id from tenants where slug = 'rodrigues-refrigeracao';

  select count(*) into v_matches from auxiliaries
  where tenant_id = v_tenant_id and lower(trim(name)) = 'técnico 1';
  if v_matches <> 1 then
    raise exception 'Esperava 1 "Técnico 1", achei %. Nada foi apagado.', v_matches;
  end if;

  select id, profile_id into v_aux_id, v_profile_id from auxiliaries
  where tenant_id = v_tenant_id and lower(trim(name)) = 'técnico 1';

  delete from expenses where auxiliary_id = v_aux_id;
  update calls set technician_id = null, driver = null where technician_id = v_aux_id;
  delete from auxiliaries where id = v_aux_id;   -- leva junto o estoque dele
  if v_profile_id is not null then
    delete from profiles where id = v_profile_id;
  end if;
end $$;

-- Conferir: técnicos que sobraram
select a.name, a.percentage, a.percentage_after_hours, p.role
from auxiliaries a
left join profiles p on p.id = a.profile_id
where a.tenant_id = (select id from tenants where slug = 'rodrigues-refrigeracao')
  and a.type = 'tecnico'
order by a.name;
