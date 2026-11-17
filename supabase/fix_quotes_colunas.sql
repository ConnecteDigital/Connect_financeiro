-- Correção: "Could not find the 'guarantee' column of 'quotes' in the
-- schema cache" ao salvar orçamento.
--
-- A tela de orçamento grava as colunas guarantee (v14), show_total (v12)
-- e details (v29). Se alguma dessas migrations não rodou neste banco (ou
-- o cache da API ficou velho), o orçamento não salva. Pode rodar mais de
-- uma vez: só cria o que estiver faltando e recarrega o cache.

alter table quotes add column if not exists guarantee text;
alter table quotes add column if not exists show_total boolean default true;
alter table quotes add column if not exists details jsonb;

notify pgrst, 'reload schema';

-- Conferir: tem que aparecer as 3 colunas
select column_name, data_type
from information_schema.columns
where table_name = 'quotes' and column_name in ('guarantee', 'show_total', 'details')
order by column_name;
