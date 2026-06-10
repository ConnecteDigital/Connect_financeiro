import { getMyTenantId } from "./tenant"
import { createClient } from '@/lib/supabase/client'

export async function getSuppliers(search?: string) {
  const supabase = createClient()
  let query = supabase.from('suppliers').select('*').order('name')
  if (search) query = query.ilike('name', `%${search}%`)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getSupplier(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createSupplier(values: Record<string, unknown>) {
  const supabase = createClient()
  const { data, error } = await supabase.from('suppliers').insert({ ...values, tenant_id: await getMyTenantId() }).select().single()
  if (error) throw error
  return data
}

export async function updateSupplier(id: string, values: Record<string, unknown>) {
  const supabase = createClient()
  const { data, error } = await supabase.from('suppliers').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteSupplier(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  if (error) throw error
}
