-- Campos novos na tabela calls
ALTER TABLE calls ADD COLUMN IF NOT EXISTS contact_cpf text;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS solicitante text;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS driver text;
