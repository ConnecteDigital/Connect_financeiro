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

// Busca chamados antigos por nome/telefone/endereço do contato — útil pra
// achar alguém que já apareceu num chamado mas nunca virou um cliente
// cadastrado (a busca de clientes sozinha não encontraria essa pessoa).
export async function searchCallContacts(search: string) {
  const supabase = createClient()
  const term = search.replace(/[%,]/g, ' ').trim()
  if (!term) return []
  const { data, error } = await supabase
    .from('calls')
    .select('id, contact_name, contact_phone, contact_cpf, call_address, call_city, call_neighborhood, client_id, date')
    .is('client_id', null)
    .or(`contact_name.ilike.%${term}%,contact_phone.ilike.%${term}%,call_address.ilike.%${term}%,call_city.ilike.%${term}%`)
    .not('contact_name', 'is', null)
    .order('date', { ascending: false })
    .limit(20)
  if (error) throw error

  // Deduplica por nome+telefone (o mesmo contato pode ter vários chamados)
  const seen = new Set<string>()
  const unique: typeof data = []
  for (const c of data ?? []) {
    const key = `${(c.contact_name ?? '').toLowerCase()}|${c.contact_phone ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(c)
  }
  return unique.slice(0, 6)
}

export async function getCall(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('calls')
    .select('*, client:clients(*), created_by_profile:profiles!calls_created_by_fkey(name), service_orders(*, items:service_order_items(*), team:teams(*), service_order_auxiliaries(*, auxiliary:auxiliaries(*)))')
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
