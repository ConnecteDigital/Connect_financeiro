-- Migration v39 — Conta Loja da Rodrigues: gastos do aparelho que vai
-- pra venda e gastos da venda (pra calcular o lucro).
--
-- Rode DEPOIS da v38. Os outros clientes não usam.
--   stock_items.costs      = [{"id","kind","description","amount","expense_id"}]
--                            peça usada, conserto, carreto, outro
--   shop_orders.sale_costs = [{"description","amount"}]  (carreto da entrega etc.)

alter table stock_items add column if not exists costs jsonb not null default '[]';
alter table shop_orders add column if not exists sale_costs jsonb not null default '[]';

notify pgrst, 'reload schema';

-- Conferir: tem que aparecer 2 linhas
select table_name, column_name from information_schema.columns
where (table_name = 'stock_items' and column_name = 'costs')
   or (table_name = 'shop_orders' and column_name = 'sale_costs');
