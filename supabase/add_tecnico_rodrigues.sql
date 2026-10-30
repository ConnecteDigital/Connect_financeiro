-- Cria o login de UM técnico da Rodrigues Refrigeração.
--
-- PASSO 1 — Supabase: Authentication → Users → Add user → "Create new
-- user". Email + senha, e marque "Auto Confirm User". Copie o UID.
--
-- PASSO 2 — Troque os 3 valores abaixo e rode este script inteiro.
-- Pode rodar de novo com o mesmo nome sem duplicar o técnico.

do $$
declare
  v_uid uuid := 'COLE_O_UID_AQUI';
  v_nome text := 'Nome do Técnico';
  v_percentual numeric := 30;      -- % de comissão sobre cada serviço
  v_tenant_id uuid;
  v_auxiliary_id uuid;
begin
  select id into v_tenant_id from tenants where slug = 'rodrigues-refrigeracao';

  -- Perfil de login como técnico
  insert into profiles (id, tenant_id, name, role)
  values (v_uid, v_tenant_id, v_nome, 'tecnico')
  on conflict (id) do update
    set tenant_id = excluded.tenant_id, role = 'tecnico', name = excluded.name;

  -- Auxiliar (quem recebe comissão) ligado a esse login
  select id into v_auxiliary_id from auxiliaries
  where tenant_id = v_tenant_id and lower(name) = lower(v_nome)
  limit 1;

  if v_auxiliary_id is null then
    insert into auxiliaries (tenant_id, name, percentage, type, profile_id)
    values (v_tenant_id, v_nome, v_percentual, 'tecnico', v_uid);
  else
    update auxiliaries
    set profile_id = v_uid, type = 'tecnico', percentage = v_percentual
    where id = v_auxiliary_id;
  end if;
end $$;

-- Conferir: deve aparecer o técnico com role = tecnico e um auxiliary_id
select p.id as user_id, p.name, p.role, a.id as auxiliary_id, a.percentage
from profiles p
left join auxiliaries a on a.profile_id = p.id
where p.role = 'tecnico';
