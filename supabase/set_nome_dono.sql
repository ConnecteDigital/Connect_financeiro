-- Nome do dono que aparece nos avisos do técnico
-- ("Cartão aguardando confirmação do Marcos — sua comissão aparece depois disso.")
update tenants
set call_form_config = coalesce(call_form_config, '{}'::jsonb) || jsonb_build_object('owner_name', 'Marcos')
where slug = 'eletromark-refrigeracoes';

update tenants
set call_form_config = coalesce(call_form_config, '{}'::jsonb) || jsonb_build_object('owner_name', 'Rodrigues')
where slug = 'rodrigues-refrigeracao';

-- Conferir
select name, call_form_config ->> 'owner_name' as nome_do_dono
from tenants where slug in ('eletromark-refrigeracoes', 'rodrigues-refrigeracao');
