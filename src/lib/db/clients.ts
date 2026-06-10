import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { getMyTenantId } from './tenant'

export async function getClients(search?: string) {
  const supabase = createSupabaseClient()
  let query = supabase.from('clients').select('*').order('name')
  if (search) query = query.ilike('name', `%${search}%`)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getClient(id: string) {
  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*, calls(*, service_orders(*))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createClient_(values: Record<string, unknown>) {
  const supabase = createSupabaseClient()
  const tenant_id = await getMyTenantId()
  const { data, error } = await supabase.from('clients').insert({ ...values, tenant_id }).select().single()
  if (error) throw error
  return data
}

export async function updateClient(id: string, values: Record<string, unknown>) {
  const supabase = createSupabaseClient()
  const { data, error } = await supabase.from('clients').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}
