import { createClient } from '@/lib/supabase/client'
import { getMyTenantId } from './tenant'

export async function getAuxiliaries() {
  const supabase = createClient()
  const { data, error } = await supabase.from('auxiliaries').select('*').order('name')
  if (error) throw error
  return data ?? []
}

export async function createAuxiliary(name: string, percentage: number) {
  const supabase = createClient()
  const tenant_id = await getMyTenantId()
  const { data, error } = await supabase
    .from('auxiliaries')
    .insert({ name, percentage, tenant_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAuxiliary(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('auxiliaries').delete().eq('id', id)
  if (error) throw error
}
