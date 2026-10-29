-- Migration v15 — suporte às funções específicas da Rodrigues Refrigeração
-- (marca do aparelho, status "pagou somente a visita", custo de peças,
-- garantia de 6 meses / 1 ano).
--
-- Tudo aqui é 100% ADITIVO: novas colunas com default e um valor extra
-- permitido no status do chamado. Nenhuma coluna ou valor existente é
-- removido, então é seguro executar para TODOS os tenants — o
-- comportamento de quem não é a Rodrigues não muda em nada, já que essas
-- colunas/valores novos só são preenchidos quando o flag
-- rodrigues_custom estiver ativo (ver enable_rodrigues_custom.sql).

-- Marca do aparelho (ex: Consul, Brastemp...) no chamado
alter table calls add column if not exists device_brand text;

-- Novo status "pagou somente a visita" — adicionado à lista de valores
-- permitidos, sem remover nenhum dos existentes.
alter table calls drop constraint if exists calls_status_check;
alter table calls add constraint calls_status_check
  check (status in ('agendado','aprovado','nao_aprovou','nao_quis_visita','cancelado','pagou_somente_visita'));

-- Custo de peças usadas na OS (desconta do líquido, vira saída automática)
alter table service_orders add column if not exists parts_cost numeric not null default 0;

-- Garantia de 6 meses / 1 ano (além das opções de 30/60/90 dias já existentes)
alter table service_orders add column if not exists has_guarantee_6m boolean not null default false;
alter table service_orders add column if not exists has_guarantee_1y boolean not null default false;
