-- Migration v14: campo de garantia nos orçamentos
-- (igual já existe nas OS: texto livre, ex: "Garantia de 90 dias...")
-- Execute no SQL Editor do Supabase (seguro rodar mais de uma vez)

alter table quotes
  add column if not exists guarantee text;
