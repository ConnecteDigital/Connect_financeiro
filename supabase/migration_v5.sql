-- migration_v5: Commissions module
-- Run this in the Supabase SQL editor

-- 1. Enable commissions toggle per tenant
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS enable_commissions boolean DEFAULT false;

-- 2. Add type to auxiliaries: 'tecnico' (default) or 'dono'
ALTER TABLE auxiliaries ADD COLUMN IF NOT EXISTS type text DEFAULT 'tecnico'
  CHECK (type IN ('tecnico', 'dono'));

-- 3. Multiple auxiliaries per service order
CREATE TABLE IF NOT EXISTS service_order_auxiliaries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id uuid NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  auxiliary_id     uuid NOT NULL REFERENCES auxiliaries(id) ON DELETE CASCADE,
  percentage       numeric NOT NULL DEFAULT 0,
  amount           numeric NOT NULL DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE service_order_auxiliaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_soa" ON service_order_auxiliaries
  USING (
    service_order_id IN (
      SELECT id FROM service_orders WHERE tenant_id = my_tenant_id()
    )
  );

-- 4. Track which expense was auto-generated from an OS
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS source_service_order_id uuid
  REFERENCES service_orders(id) ON DELETE SET NULL;
