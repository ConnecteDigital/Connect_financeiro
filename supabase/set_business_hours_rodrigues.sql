-- Horário comercial da Rodrigues Refrigeração (rode depois da v25):
--   segunda a sexta 08:00–18:00, sábado 08:00–13:00.
--   Fora disso, domingo e feriado = comissão fora do horário.
-- Mescla com o que já existe em call_form_config (não apaga outras opções).
-- Depois o Rodrigues pode mudar em Configurações.

update tenants
set call_form_config = coalesce(call_form_config, '{}'::jsonb) || jsonb_build_object(
  'business_hours', jsonb_build_object(
    'weekday_start', '08:00',
    'weekday_end', '18:00',
    'saturday_start', '08:00',
    'saturday_end', '13:00'
  )
)
where slug = 'rodrigues-refrigeracao';

select name, call_form_config -> 'business_hours' as horario_comercial
from tenants where slug = 'rodrigues-refrigeracao';
