-- Novo Ambiental: liga o relatório com filtros e cria o canal Google Maps.
-- Procura a empresa pelo nome (tem "ambiental" no nome). Pode rodar de novo.

update tenants
set call_form_config = coalesce(call_form_config, '{}'::jsonb)
  || jsonb_build_object(
       'novo_ambiental', true,
       'custom_channels', coalesce(
         case when (call_form_config->'custom_channels') @> '[{"value":"google_maps"}]'::jsonb
              then call_form_config->'custom_channels' end,
         coalesce(call_form_config->'custom_channels', '[]'::jsonb) || '[{"value":"google_maps","label":"📍 Google Maps"}]'::jsonb
       )
     )
where name ilike '%ambiental%';

-- Conferir: deve aparecer só a Novo Ambiental, com novo_ambiental = true e o Google Maps
select id, name, slug, call_form_config->'novo_ambiental' as flag, call_form_config->'custom_channels' as canais
from tenants
where name ilike '%ambiental%';
