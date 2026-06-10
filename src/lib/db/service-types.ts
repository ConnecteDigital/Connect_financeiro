import { createClient } from '@/lib/supabase/client'
import { getMyTenantId } from './tenant'

import { SERVICE_CATEGORIES } from '@/lib/service-config'

export const DEFAULT_SERVICE_TYPES = SERVICE_CATEGORIES

// Garante que o tenant tenha os tipos padrão na primeira utilização
export async function ensureDefaultServiceTypes() {
  const supabase = createClient()
  const { count, error } = await supabase
    .from('service_types')
    .select('id', { count: 'exact', head: true })
  if (error) throw error
  if ((count ?? 0) > 0) return
  const tenant_id = await getMyTenantId()
  const { error: insertError } = await supabase
    .from('service_types')
    .upsert(
      DEFAULT_SERVICE_TYPES.map(name => ({ name, tenant_id })),
      { onConflict: 'tenant_id,name', ignoreDuplicates: true }
    )
  if (insertError) throw insertError
}

export async function getServiceTypes() {
  await ensureDefaultServiceTypes()
  const supabase = createClient()
  const { data, error } = await supabase
    .from('service_types')
    .select('*')
    .eq('active', true)
    .order('category')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function getAllServiceTypes() {
  await ensureDefaultServiceTypes()
  const supabase = createClient()
  const { data, error } = await supabase
    .from('service_types')
    .select('*')
    .order('category')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function createServiceType(name: string, category?: string) {
  const supabase = createClient()
  const tenant_id = await getMyTenantId()
  const { data, error } = await supabase
    .from('service_types')
    .insert({ name, category: category || null, tenant_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function toggleServiceType(id: string, active: boolean) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('service_types')
    .update({ active })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteServiceType(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('service_types').delete().eq('id', id)
  if (error) throw error
}
