-- Migration v32 — Conta "Loja" da Rodrigues: estoque de máquinas e peças.
-- Rode DEPOIS da v31. Só adiciona colunas (os outros clientes não usam).
--
--  • stock_items.kind: 'maquina' ou 'peca'
--  • stock_items.sale_value: preço de venda (unit_value continua = custo)
--  • stock_items.brand / model / notes: dados da máquina

alter table stock_items add column if not exists kind text not null default 'peca';
alter table stock_items add column if not exists sale_value numeric not null default 0;
alter table stock_items add column if not exists brand text;
alter table stock_items add column if not exists model text;
alter table stock_items add column if not exists notes text;

notify pgrst, 'reload schema';
