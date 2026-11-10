-- Nova Ambiental: liga o relatório com filtros e cria o canal Google Maps.
-- Acha a empresa pelo e-mail de login do cliente. Pode rodar de novo.

update tenants t
set call_form_config = coalesce(t.call_form_config, '{}'::jsonb)
  || jsonb_build_object(
       'novo_ambiental', true,
       'custom_channels', case
         when coalesce(t.call_form_config->'custom_channels', '[]'::jsonb) @> '[{"value":"google_maps"}]'::jsonb
           then t.call_form_config->'custom_channels'
         else coalesce(t.call_form_config->'custom_channels', '[]'::jsonb) || '[{"value":"google_maps","label":"📍 Google Maps"}]'::jsonb
       end
     )
where t.id in (
  select p.tenant_id
  from profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = 'novaambiental@gmail.com'
);

-- Conferir: deve aparecer a empresa da Nova Ambiental com flag = true e o Google Maps
select t.id, t.name, t.slug,
       t.call_form_config->'novo_ambiental' as flag,
       t.call_form_config->'custom_channels' as canais
from tenants t
where t.id in (
  select p.tenant_id from profiles p join auth.users u on u.id = p.id
  where lower(u.email) = 'novaambiental@gmail.com'
);
