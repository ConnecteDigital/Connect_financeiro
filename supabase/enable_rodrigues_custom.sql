-- Liga o modo de personalização SOMENTE para o tenant Rodrigues Refrigeração
-- (autocompletar endereço por CEP, botão "Abrir no Maps" nos chamados,
-- e as próximas funções específicas dele)
-- Execute no SQL Editor do Supabase.

update tenants
set call_form_config = coalesce(call_form_config, '{}'::jsonb) || '{"rodrigues_custom": true}'::jsonb
where slug = 'rodrigues-refrigeracao';

-- Conferir
select name, slug, call_form_config from tenants where slug = 'rodrigues-refrigeracao';
