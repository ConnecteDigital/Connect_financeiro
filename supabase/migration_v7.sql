-- migration_v7: Dados da empresa + dono padrão por auxiliar
-- Run in Supabase SQL Editor

-- 1. Dados da empresa no tenant
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone text;

-- 2. Dono padrão: auxiliar do tipo dono que entra automático em todos os chamados
ALTER TABLE auxiliaries ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;
