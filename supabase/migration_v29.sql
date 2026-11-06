-- Migration v29 — Rodrigues: documentos no modelo novo (Orçamento / OS).
-- Rode DEPOIS da v28. Só adiciona colunas (os outros clientes não usam).
--
--  • quotes.details: campos extras do orçamento da Rodrigues
--      {"appliance","brand","model","defect","validity_days",
--       "visit_date","visit_period","payment_conditions"}
--  • calls.device_model: modelo do aparelho, aparece na OS.

alter table quotes add column if not exists details jsonb;
alter table calls add column if not exists device_model text;

notify pgrst, 'reload schema';
