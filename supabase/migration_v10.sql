-- Rastreamento de pagamento por comissão
ALTER TABLE service_order_auxiliaries ADD COLUMN IF NOT EXISTS paid boolean DEFAULT false;
ALTER TABLE service_order_auxiliaries ADD COLUMN IF NOT EXISTS paid_at date;

-- Vincula despesa a auxiliar específico (para baixa automática)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS auxiliary_id uuid REFERENCES auxiliaries(id) ON DELETE SET NULL;
