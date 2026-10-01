-- Migration v13: campos extras na OS para personalizações específicas
-- (equipe digitada à mão, cartão débito/crédito com taxa)
-- Execute no SQL Editor do Supabase (seguro rodar mais de uma vez)

alter table service_orders
  add column if not exists team_name text,
  add column if not exists card_type text check (card_type in ('debito','credito')),
  add column if not exists card_fee_pct numeric default 0;
