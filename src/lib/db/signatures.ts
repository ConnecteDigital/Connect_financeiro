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
