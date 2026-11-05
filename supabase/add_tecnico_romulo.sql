-- Cria o login do técnico Romulo (Rodrigues Refrigeração) e copia para ele
-- as peças do técnico que tem o estoque mais completo (hoje o Victor Emanoel).
-- Pode rodar de novo sem duplicar técnico nem peças.

do $$
declare
  v_uid uuid := '0f7bb0b9-d710-44c2-b438-aec6b979d8b5';
  v_nome text := 'Romulo';
  v_tenant_id uuid;
  v_auxiliary_id uuid;
  v_source_id uuid;
  v_copied int;
begin
  select id into v_tenant_id from tenants where slug = 'rodrigues-refrigeracao';
  if v_tenant_id is null then
    raise exception 'Empresa rodrigues-refrigeracao não encontrada.';
  end if;

  -- Perfil de login como técnico
  insert into profiles (id, tenant_id, name, role)
  values (v_uid, v_tenant_id, v_nome, 'tecnico')
  on conflict (id) do update
    set tenant_id = excluded.tenant_id, role = 'tecnico', name = excluded.name;

  -- Cadastro de técnico (comissão começa em 0; ajustar em Configurações)
  select id into v_auxiliary_id from auxiliaries
  where tenant_id = v_tenant_id and lower(trim(name)) = lower(v_nome)
  limit 1;

  if v_auxiliary_id is null then
    insert into auxiliaries (tenant_id, name, percentage, type, profile_id)
    values (v_tenant_id, v_nome, 0, 'tecnico', v_uid)
    returning id into v_auxiliary_id;
  else
    update auxiliaries set profile_id = v_uid, type = 'tecnico'
    where id = v_auxiliary_id;
  end if;

  -- Estoque: copia do técnico com mais peças cadastradas
  select a.id into v_source_id
  from auxiliaries a
  join stock_items s on s.auxiliary_id = a.id
  where a.tenant_id = v_tenant_id and a.type = 'tecnico' and a.id <> v_auxiliary_id
  group by a.id
  order by count(*) desc
  limit 1;

  if v_source_id is not null then
    insert into stock_items (tenant_id, auxiliary_id, name, quantity, unit_value)
    select v_tenant_id, v_auxiliary_id, s.name, s.quantity, s.unit_value
    from stock_items s
    where s.auxiliary_id = v_source_id
      and not exists (
        select 1 from stock_items x
        where x.auxiliary_id = v_auxiliary_id and lower(x.name) = lower(s.name)
      );
    get diagnostics v_copied = row_count;
    raise notice '% peças copiadas para %.', v_copied, v_nome;
  end if;
end $$;

-- Conferir: técnicos, login ligado e quantidade de peças
select a.name as tecnico, p.role, a.percentage, count(s.id) as pecas
from auxiliaries a
left join profiles p on p.id = a.profile_id
left join stock_items s on s.auxiliary_id = a.id
where a.tenant_id = (select id from tenants where slug = 'rodrigues-refrigeracao')
  and a.type = 'tecnico'
group by a.name, p.role, a.percentage
order by a.name;
