-- Migration v17 — valor da visita (Rodrigues Refrigeração cobra visita
-- mesmo quando o cliente não aprova o serviço).
--
-- 100% aditivo: nova coluna opcional em calls, sem afetar outros tenants.

alter table calls add column if not exists visit_fee numeric;
