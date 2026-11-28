-- Eletromark Refrigerações: aparelhos e serviços do chamado.
--
-- 1. Aparelhos: só Geladeira, Freezer e Máquina de Lavar (sai Bebedouro,
--    Ar-Condicionado, Câmara Fria, Cooler e Outro). Só pra Eletromark.
-- 2. Serviços (os botões "Serviço (opcional)" depois de escolher o aparelho):
--    troca a lista inteira pela dele. Chamados já criados não mudam.
-- Pode rodar de novo.

update tenants
set call_form_config = coalesce(call_form_config, '{}'::jsonb)
  || jsonb_build_object('appliance_types', jsonb_build_array('Geladeira', 'Freezer', 'Máquina de Lavar'))
where slug = 'eletromark-refrigeracoes';

delete from service_types
where tenant_id = (select id from tenants where slug = 'eletromark-refrigeracoes');

insert into service_types (tenant_id, name)
select t.id, s.name
from tenants t
cross join (values
  ('Não gela refrigerador'),
  ('Não gela nenhuma das duas partes'),
  ('Vazando água'),
  ('Não congela'),
  ('Troca de borracha'),
  ('Limpeza'),
  ('Tirar portas'),
  ('Não desliga')
) as s(name)
where t.slug = 'eletromark-refrigeracoes'
on conflict (tenant_id, name) do nothing;

-- Conferir
select call_form_config -> 'appliance_types' as aparelhos,
  (select string_agg(name, ', ' order by name) from service_types st where st.tenant_id = t.id) as servicos
from tenants t where slug = 'eletromark-refrigeracoes';
