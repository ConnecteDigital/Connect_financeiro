-- Migration v35 — Conta Loja da Rodrigues: equipamento com tipo, número de
-- série e fotos/vídeos.
--
-- Rode DEPOIS da v34. Os outros clientes não usam nada disso.
-- As 5 primeiras linhas repetem a v32 de propósito: se ela não rodou neste
-- banco (ou o cache da API ficou velho), o cadastro de peça/equipamento
-- da loja não salva. Pode rodar mais de uma vez.

alter table stock_items add column if not exists kind text not null default 'peca';
alter table stock_items add column if not exists sale_value numeric not null default 0;
alter table stock_items add column if not exists brand text;
alter table stock_items add column if not exists model text;
alter table stock_items add column if not exists notes text;

-- Novo na v35
alter table stock_items add column if not exists equipment_type text;              -- Geladeira, Freezer...
alter table stock_items add column if not exists serial_number text;
alter table stock_items add column if not exists media jsonb not null default '[]'; -- [{path, video}]

notify pgrst, 'reload schema';

-- Conferir: tem que listar as 8 colunas
select column_name, data_type
from information_schema.columns
where table_name = 'stock_items'
  and column_name in ('kind', 'sale_value', 'brand', 'model', 'notes', 'equipment_type', 'serial_number', 'media')
order by column_name;
