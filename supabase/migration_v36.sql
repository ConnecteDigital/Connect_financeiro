-- Migration v36 — Rodrigues: garantia por peça na ordem de serviço.
--
-- Rode DEPOIS da v35. Além da garantia da mão de obra (que já existe),
-- cada peça trocada pode ter o prazo dela (ex.: compressor, 6 meses):
--   service_orders.parts_guarantee = [{"part":"Compressor","period":"6 meses"}]
-- No orçamento e no pedido da loja não precisa de coluna nova (vai dentro
-- de campos que já existem). Os outros clientes não usam.

alter table service_orders add column if not exists parts_guarantee jsonb not null default '[]';

notify pgrst, 'reload schema';

-- Conferir: tem que aparecer 1 linha
select column_name, data_type
from information_schema.columns
where table_name = 'service_orders' and column_name = 'parts_guarantee';
