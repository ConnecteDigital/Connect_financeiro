-- Bucket de logos dos tenants (público = URLs acessíveis sem auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-logos', 'tenant-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
DROP POLICY IF EXISTS "tenant_logo_insert" ON storage.objects;
DROP POLICY IF EXISTS "tenant_logo_update" ON storage.objects;
DROP POLICY IF EXISTS "tenant_logo_select" ON storage.objects;
DROP POLICY IF EXISTS "tenant_logo_delete" ON storage.objects;

-- Leitura pública (bucket é public, mas policy de SELECT é necessária em alguns setups)
CREATE POLICY "tenant_logo_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'tenant-logos');

-- Upload (INSERT) por usuários autenticados
CREATE POLICY "tenant_logo_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tenant-logos' AND auth.role() = 'authenticated'
  );

-- Atualização (upsert usa UPDATE) por usuários autenticados
CREATE POLICY "tenant_logo_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'tenant-logos' AND auth.role() = 'authenticated'
  );

-- Deleção por usuários autenticados
CREATE POLICY "tenant_logo_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tenant-logos' AND auth.role() = 'authenticated'
  );
