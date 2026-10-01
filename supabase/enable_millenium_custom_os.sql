-- Liga o modo de OS personalizado SOMENTE para o tenant Millenium
-- (equipe/auxiliar digitados à mão, pagamento com débito/crédito + taxa,
--  campo "recebido/passado por" no terceirizado, categorias Sucção e
--  Hidrojateamento sem sub-opção fixa, levantamento completo na OS impressa,
--  unidade M/L ao lado da quantidade)
-- Execute no SQL Editor do Supabase.

update tenants
set call_form_config = coalesce(call_form_config, '{}'::jsonb) || '{"millenium_custom_os": true}'::jsonb
where name ilike '%millenium%' or name ilike '%milenium%' or slug ilike '%mill%';

-- Conferir
select name, slug, call_form_config from tenants where name ilike '%mill%' or slug ilike '%mill%';
