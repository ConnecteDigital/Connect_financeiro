-- Per-origin branding (logo + color for each call origin)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS origin_branding jsonb DEFAULT '{}';

-- Quotes/orçamentos table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quote_number text,
  client_name text NOT NULL,
  client_phone text,
  client_cpf text,
  client_address text,
  client_city text,
  service_category text,
  service_description text,
  items jsonb DEFAULT '[]',
  subtotal numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  taxes numeric DEFAULT 0,
  total numeric DEFAULT 0,
  valid_until date,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado', 'expirado')),
  origin text,
  notes text,
  call_id uuid REFERENCES calls(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_quotes" ON quotes USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Sequence for quote numbers
CREATE SEQUENCE IF NOT EXISTS quote_number_seq START 1;

-- Cash entries table (unified financial - entradas avulsas, boletos)
CREATE TABLE IF NOT EXISTS cash_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  direction text NOT NULL CHECK (direction IN ('entrada', 'saida')),
  entry_type text NOT NULL DEFAULT 'avulso' CHECK (entry_type IN ('avulso', 'boleto', 'venda', 'servico', 'outros')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pago', 'pendente', 'cancelado')),
  due_date date NOT NULL,
  paid_date date,
  boleto_code text,
  boleto_bank text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cash_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_cash_entries" ON cash_entries USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
