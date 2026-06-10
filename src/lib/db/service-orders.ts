import { createClient } from '@/lib/supabase/client'
import { getMyTenantId } from './tenant'

export async function createServiceOrder(
  orderData: Record<string, unknown>,
  items: Array<{ quantity: number; description: string; unit_price: number }>
) {
  const supabase = createClient()
  const tenant_id = await getMyTenantId()

  const { data: order, error: orderError } = await supabase
    .from('service_orders')
    .insert({ ...orderData, tenant_id })
    .select()
    .single()

  if (orderError) throw orderError

  if (items.length > 0) {
    const itemsWithOrderId = items.map(item => ({
      ...item,
      service_order_id: order.id,
    }))
    const { error: itemsError } = await supabase.from('service_order_items').insert(itemsWithOrderId)
    if (itemsError) throw itemsError
  }

  return order
}

export async function updateServiceOrder(id: string, values: Record<string, unknown>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('service_orders')
    .update(values)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
