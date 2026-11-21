import { createClient } from '@/lib/supabase/client'

// Assinatura do cliente na ordem de serviço (Rodrigues) — migration_v37.sql

export interface OsSignature { image: string; signed_at: string }

export async function getOsSignature(serviceOrderId: string): Promise<OsSignature | null> {
  const { data, error } = await createClient().from('os_signatures')
    .select('client_signature, signed_at').eq('service_order_id', serviceOrderId).maybeSingle()
  if (error || !data) return null   // sem assinatura (ou a v37 ainda não rodou)
  return { image: data.client_signature, signed_at: data.signed_at }
}

export async function saveOsSignature(serviceOrderId: string, tenant_id: string, image: string): Promise<OsSignature> {
  const signed_at = new Date().toISOString()
  const { error } = await createClient().from('os_signatures')
    .upsert({ service_order_id: serviceOrderId, tenant_id, client_signature: image, signed_at })
  if (error) throw error
  return { image, signed_at }
}

export async function deleteOsSignature(serviceOrderId: string) {
  const { error } = await createClient().from('os_signatures').delete().eq('service_order_id', serviceOrderId)
  if (error) throw error
}

// ── Assinatura fixa do técnico (migration_v38.sql) ──────────────────

// Auxiliar (técnico) do login atual
export async function getMyAuxiliary(): Promise<{ id: string; tenant_id: string; name: string } | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('auxiliaries').select('id, tenant_id, name').eq('profile_id', user.id).maybeSingle()
  return data ?? null
}

export async function getTecnicoSignature(auxiliaryId: string | null | undefined): Promise<string | null> {
  if (!auxiliaryId) return null
  const { data, error } = await createClient().from('tecnico_signatures').select('image').eq('auxiliary_id', auxiliaryId).maybeSingle()
  if (error || !data) return null   // sem assinatura (ou a v38 ainda não rodou)
  return data.image
}

export async function saveTecnicoSignature(auxiliaryId: string, tenant_id: string, image: string) {
  const { error } = await createClient().from('tecnico_signatures')
    .upsert({ auxiliary_id: auxiliaryId, tenant_id, image, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function deleteTecnicoSignature(auxiliaryId: string) {
  const { error } = await createClient().from('tecnico_signatures').delete().eq('auxiliary_id', auxiliaryId)
  if (error) throw error
}
