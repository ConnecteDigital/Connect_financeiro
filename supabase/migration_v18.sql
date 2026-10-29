-- Migration v18 — tipo do aparelho (calls) e parcelamento no cartão
-- (service_orders), pra Rodrigues Refrigeração.
--
-- 100% aditivo: novas colunas opcionais, sem afetar outros tenants.

alter table calls add column if not exists appliance_type text;
alter table service_orders add column if not exists installments integer;
