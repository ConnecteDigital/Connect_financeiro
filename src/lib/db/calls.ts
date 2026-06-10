import { createClient } from '@/lib/supabase/client'
import { getMyTenantId } from './tenant'

export async function getCalls(filters?: { status?: string; origin?: string; search?: string }) {
  const supabase = createClient()
  let query = supabase
    .from('calls')
    .select('*, client:clients(id, name, city, phone), service_orders(*)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'todos') query = query.eq('status', filters.status)
  if (filters?.origin && filters.origin !== 'todos') query = query.eq('origin', filters.origin)

  const { data, error } = await query
  if (error) throw error

  if (filters?.search) {
    const s = filters.search.toLowerCase()
    return data.filter(c =>
      c.client?.name?.toLowerCase().includes(s) ||
      c.contact_name?.toLowerCase().includes(s) ||
      c.service_orders?.some((so: { os_number?: string }) => so.os_number?.toLowerCase().includes(s))
    )
  }
  return data
}

export async function getCall(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('calls')
    .select('*, client:clients(*), service_orders(*, items:service_order_items(*), team:teams(*))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createCall(values: Record<string, unknown>) {
  const supabase = createClient()
  const tenant_id = await getMyTenantId()
  const { data, error } = await supabase.from('calls').insert({ ...values, tenant_id }).select().single()
  if (error) throw error
  return data
}

export async function updateCall(id: string, values: Record<string, unknown>) {
  const supabase = createClient()
  const { data, error } = await supabase.from('calls').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteCall(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('calls').delete().eq('id', id)
  if (error) throw error
}
