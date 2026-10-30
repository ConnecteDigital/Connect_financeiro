-- Copia as peças do estoque "Victor" para todos os outros técnicos da
-- Rodrigues Refrigeração (uma vez só, pra não cadastrar tudo à mão).
-- Depois é só apagar, em cada técnico, o que não fica com ele.
--
-- • Copia nome, quantidade e valor de cada peça.
-- • Se o técnico já tem uma peça com o mesmo nome, ela não é duplicada.
-- • Pode rodar de novo sem duplicar nada.
-- • Se não achar exatamente UM estoque com nome "Victor", para e avisa,
--   sem mexer em nada.

do $$
declare
  v_tenant_id uuid;
  v_source_id uuid;
  v_matches int;
  v_copied int;
begin
  select id into v_tenant_id from tenants where slug = 'rodrigues-refrigeracao';

  select count(*) into v_matches from auxiliaries
  where tenant_id = v_tenant_id and lower(trim(name)) = 'victor';

  if v_matches <> 1 then
    raise exception 'Esperava 1 estoque chamado "Victor", achei %. Nada foi copiado.', v_matches;
  end if;

  select id into v_source_id from auxiliaries
  where tenant_id = v_tenant_id and lower(trim(name)) = 'victor';

  insert into stock_items (tenant_id, auxiliary_id, name, quantity, unit_value)
  select v_tenant_id, a.id, s.name, s.quantity, s.unit_value
  from stock_items s
  cross join auxiliaries a
  where s.auxiliary_id = v_source_id
    and a.tenant_id = v_tenant_id
    and a.type = 'tecnico'
    and a.id <> v_source_id
    and not exists (
      select 1 from stock_items x
      where x.auxiliary_id = a.id and lower(x.name) = lower(s.name)
    );

  get diagnostics v_copied = row_count;
  raise notice '% peças copiadas.', v_copied;
end $$;

-- Conferir: quantas peças cada técnico tem agora
select a.name as tecnico, count(s.id) as pecas
from auxiliaries a
left join stock_items s on s.auxiliary_id = a.id
where a.tenant_id = (select id from tenants where slug = 'rodrigues-refrigeracao')
  and a.type = 'tecnico'
group by a.name
order by a.name;
