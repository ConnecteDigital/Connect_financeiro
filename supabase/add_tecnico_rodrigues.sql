-- Cria o login de UM técnico da Rodrigues Refrigeração.
-- Repita esse script (copiando pra um novo, se quiser manter histórico)
-- pra cada técnico novo.
--
-- PASSO 1 — No Supabase Dashboard: Authentication → Users → Add user →
-- "Create new user". Preencha o email e uma senha temporária, e marque
-- "Auto Confirm User" (senão o login não funciona até confirmar o
-- email). Copie o UID gerado.
--
-- PASSO 2 — Troque os valores abaixo e rode este script:
--   COLE_O_UID_AQUI   → o UID copiado no painel
--   Nome do Técnico    → como ele aparece pros clientes e no painel do Rodrigues
--   30                 → % de comissão dele sobre cada serviço (ajuste como combinado)

do $$
declare
  v_uid uuid := 'COLE_O_UID_AQUI';
  v_nome text := 'Nome do Técnico';
  v_percentual numeric := 30;
  v_tenant_id uuid;
  v_auxiliary_id uuid;
begin
  select id into v_tenant_id from tenants where slug = 'rodrigues-refrigeracao';

  -- Cria (ou reaproveita, se já existir com esse nome) o auxiliar que
  -- recebe a comissão desse técnico
  insert into auxiliaries (tenant_id, name, percentage, type, profile_id)
  values (v_tenant_id, v_nome, v_percentual, 'tecnico', v_uid)
  on conflict do nothing
  returning id into v_auxiliary_id;

  if v_auxiliary_id is null then
    select id into v_auxiliary_id from auxiliaries
    where tenant_id = v_tenant_id and name = v_nome;

    update auxiliaries set profile_id = v_uid where id = v_auxiliary_id;
  end if;

  -- Cria/atualiza o perfil de login dele como 'tecnico' nesse tenant
  insert into profiles (id, tenant_id, name, role)
  values (v_uid, v_tenant_id, v_nome, 'tecnico')
  on conflict (id) do update set tenant_id = excluded.tenant_id, role = 'tecnico', name = excluded.name;
end $$;

-- Conferir
select p.id as user_id, p.name, p.role, a.id as auxiliary_id, a.percentage
from profiles p
join auxiliaries a on a.profile_id = p.id
where p.role = 'tecnico';
