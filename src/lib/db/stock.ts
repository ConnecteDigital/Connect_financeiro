import { createClient } from '@/lib/supabase/client'
import { getMyTenantId } from './tenant'

export async function getStockItems(auxiliaryId?: string | null) {
  const supabase = createClient()
  let query = supabase.from('stock_items').select('*').order('name')
  if (auxiliaryId !== undefined) {
    query = auxiliaryId === null ? query.is('auxiliary_id', null) : query.eq('auxiliary_id', auxiliaryId)
  }
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createStockItem(name: string, quantity: number, unitValue: number, auxiliaryId: string | null) {
  const supabase = createClient()
  const tenant_id = await getMyTenantId()
  const { data, error } = await supabase
    .from('stock_items')
    .insert({ name, quantity, unit_value: unitValue, auxiliary_id: auxiliaryId, tenant_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStockItem(id: string, values: Record<string, unknown>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('stock_items')
    .update(values)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteStockItem(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('stock_items').delete().eq('id', id)
  if (error) throw error
}

// Incrementa/decrementa a quantidade de um item (delta negativo = uso,
// delta positivo = reposição/estorno). Nunca deixa a quantidade negativa.
export async function adjustStockQuantity(id: string, deltaQuantity: number) {
  const supabase = createClient()
  const { data: current, error: fetchError } = await supabase
    .from('stock_items')
    .select('quantity')
    .eq('id', id)
    .maybeSingle()
  if (fetchError) throw fetchError
  if (!current) return // item pode ter sido excluído — nada a ajustar
  const next = Math.max(0, Number(current.quantity || 0) + deltaQuantity)
  const { error } = await supabase.from('stock_items').update({ quantity: next }).eq('id', id)
  if (error) throw error
}

export async function getServiceOrderParts(serviceOrderId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('service_order_parts')
    .select('*')
    .eq('service_order_id', serviceOrderId)
  if (error) throw error
  return data ?? []
}

export async function addServiceOrderParts(
  serviceOrderId: string,
  parts: { stock_item_id: string | null; item_name: string; quantity: number; unit_value: number; total_value: number }[]
) {
  if (parts.length === 0) return
  const supabase = createClient()
  const { error } = await supabase
    .from('service_order_parts')
    .insert(parts.map(p => ({ ...p, service_order_id: serviceOrderId })))
  if (error) throw error
}

export async function deleteServiceOrderParts(ids: string[]) {
  if (ids.length === 0) return
  const supabase = createClient()
  const { error } = await supabase.from('service_order_parts').delete().in('id', ids)
  if (error) throw error
}

// Desfaz as peças anteriormente registradas numa OS (devolve a
// quantidade ao estoque e remove os registros), usado antes de salvar
// uma nova lista de peças na edição — evita descontar em dobro.
export async function restorePreviousServiceOrderParts(serviceOrderId: string) {
  const previous = await getServiceOrderParts(serviceOrderId)
  if (previous.length === 0) return
  await Promise.all(
    previous
      .filter((p: any) => p.stock_item_id)
      .map((p: any) => adjustStockQuantity(p.stock_item_id, Number(p.quantity || 0)))
  )
  await deleteServiceOrderParts(previous.map((p: any) => p.id))
}
