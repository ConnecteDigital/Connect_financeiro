import { createClient } from '@/lib/supabase/client'
import { getMyTenantId } from './tenant'

export async function getServiceTypes() {
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
