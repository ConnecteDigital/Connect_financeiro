import { createClient } from '@/lib/supabase/client'
import { getMyTenantId } from './tenant'

export async function getTeams() {
  const supabase = createClient()
  const { data, error } = await supabase.from('teams').select('*').order('name')
  if (error) throw error
  return data
}

export async function createTeam(name: string) {
  const supabase = createClient()
  const tenant_id = await getMyTenantId()
  const { data, error } = await supabase.from('teams').insert({ name, tenant_id }).select().single()
  if (error) throw error
  return data
}

export async function deleteTeam(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('teams').delete().eq('id', id)
  if (error) throw error
}
