import { createClient } from '@/lib/supabase/client'
import { getMyTenantId } from '@/lib/db/tenant'

// Pedidos da conta Loja (Rodrigues – Loja): um pedido é um aparelho que
// entrou pra orçamento/conserto. Vira Orçamento, Ordem de serviço ou
// Laudo técnico na hora de gerar o documento.

export interface OrderLine { description: string; details?: string; unit?: string; unit_price: number; quantity: number; stock_item_id?: string | null }

export interface ShopOrder {
  id: string
  seq: number
  year: number
  date: string
  status: string
  client_name: string
  client_phone: string | null
  client_address: string | null
  client_city: string | null
  client_cep: string | null
  validity_days: number | null
  brand: string | null
  model: string | null
  appliance: string | null
  serial_number: string | null
  defect: string | null
  observations: string | null
  visit_date: string | null
  visit_time: string | null
  visit_notes: string | null
  services: OrderLine[]
  parts: OrderLine[]
  discount: number
  delivery_fee: number
  freight: number
  other_fees: number
  total: number
  payment_conditions: string | null
  payment_methods: string[]
  guarantee: string | null
  notes: string | null
  cash_entry_id: string | null
  stock_applied: boolean
  created_at: string
}

export type ShopOrderInput = Omit<ShopOrder, 'id' | 'seq' | 'year' | 'cash_entry_id' | 'stock_applied' | 'created_at'>

export const ORDER_STATUSES: { value: string; label: string; dot: string; pill: string }[] = [
  { value: 'pendente',             label: 'Pendente',             dot: 'bg-orange-400',  pill: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'aguardando_aprovacao', label: 'Aguardando aprovação', dot: 'bg-amber-500',   pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'aprovado',             label: 'Aprovado',             dot: 'bg-blue-500',    pill: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'em_andamento',         label: 'Em andamento',         dot: 'bg-indigo-500',  pill: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'aguardando_pagamento', label: 'Aguardando pagamento', dot: 'bg-sky-500',     pill: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'enviado',              label: 'Entregue',             dot: 'bg-teal-500',    pill: 'bg-teal-50 text-teal-700 border-teal-200' },
  { value: 'concluido',            label: 'Concluído',            dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'garantia',             label: 'Garantia',             dot: 'bg-violet-500',  pill: 'bg-violet-50 text-violet-700 border-violet-200' },
  { value: 'cancelado',            label: 'Cancelado',            dot: 'bg-red-500',     pill: 'bg-red-50 text-red-600 border-red-200' },
]
export const statusOf = (v: string) => ORDER_STATUSES.find(s => s.value === v) ?? ORDER_STATUSES[0]

export const PAYMENT_METHODS = ['PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência bancária', 'Boleto', 'Link de pagamento', 'Cheque', 'Fiado']

export const orderNumber = (o: { seq: number; year: number }) => `${String(o.seq).padStart(3, '0')}-${o.year}`
export const linesTotal = (l: OrderLine[]) => l.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unit_price || 0), 0)
export function orderTotal(o: Pick<ShopOrder, 'services' | 'parts' | 'discount' | 'delivery_fee' | 'freight' | 'other_fees'>) {
  return Math.max(0, linesTotal(o.services) + linesTotal(o.parts) - Number(o.discount || 0)
    + Number(o.delivery_fee || 0) + Number(o.freight || 0) + Number(o.other_fees || 0))
}

const norm = (o: any): ShopOrder => ({
  ...o,
  services: Array.isArray(o.services) ? o.services : [],
  parts: Array.isArray(o.parts) ? o.parts : [],
  payment_methods: Array.isArray(o.payment_methods) ? o.payment_methods : [],
  discount: Number(o.discount || 0), delivery_fee: Number(o.delivery_fee || 0), freight: Number(o.freight || 0),
  other_fees: Number(o.other_fees || 0), total: Number(o.total || 0),
})

export async function getShopOrders(): Promise<ShopOrder[]> {
  const { data, error } = await createClient().from('shop_orders').select('*')
    .order('year', { ascending: false }).order('seq', { ascending: false })
  if (error) throw error
  return (data ?? []).map(norm)
}

export async function getShopOrder(id: string): Promise<ShopOrder | null> {
  const { data, error } = await createClient().from('shop_orders').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? norm(data) : null
}

export async function createShopOrder(values: ShopOrderInput): Promise<ShopOrder> {
  const supabase = createClient()
  const tenant_id = await getMyTenantId()
  const year = Number(values.date.slice(0, 4)) || new Date().getFullYear()
  // Próximo número do ano; se outro aparelho salvar ao mesmo tempo, tenta de novo
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: last } = await supabase.from('shop_orders').select('seq').eq('year', year)
      .order('seq', { ascending: false }).limit(1).maybeSingle()
    const seq = (last?.seq ?? 0) + 1
    const { data, error } = await supabase.from('shop_orders')
      .insert({ ...values, total: orderTotal(values), tenant_id, year, seq }).select().single()
    if (!error) return norm(data)
    if (error.code !== '23505') throw error
  }
  throw new Error('Não foi possível gerar o número do pedido. Tente de novo.')
}

export async function updateShopOrder(id: string, values: Partial<ShopOrderInput>) {
  const patch: Record<string, unknown> = { ...values, updated_at: new Date().toISOString() }
  if (values.services && values.parts) patch.total = orderTotal(values as ShopOrderInput)
  const { error } = await createClient().from('shop_orders').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteShopOrder(id: string) {
  const { error } = await createClient().from('shop_orders').delete().eq('id', id)
  if (error) throw error
}

// Recebeu o pagamento: lança a entrada no Financeiro e liga ao pedido
export async function receiveOrderPayment(order: ShopOrder, opts: { date: string; method: string }) {
  const supabase = createClient()
  const tenant_id = await getMyTenantId()
  const { data, error } = await supabase.from('cash_entries').insert({
    tenant_id,
    description: `Pedido ${orderNumber(order)} — ${order.client_name}${order.appliance ? ` (${order.appliance})` : ''}`,
    amount: order.total,
    direction: 'entrada',
    entry_type: 'servico',
    status: 'pago',
    due_date: opts.date,
    paid_date: opts.date,
    notes: `Pagamento: ${opts.method} · pedido:${order.id}`,
  }).select('id').single()
  if (error) throw error
  const { error: e2 } = await supabase.from('shop_orders').update({ cash_entry_id: data.id }).eq('id', order.id)
  if (e2) throw e2
}

export async function undoOrderPayment(order: ShopOrder) {
  const supabase = createClient()
  if (order.cash_entry_id) await supabase.from('cash_entries').delete().eq('id', order.cash_entry_id)
  await supabase.from('shop_orders').update({ cash_entry_id: null }).eq('id', order.id)
}

// Peças do estoque usadas no pedido: baixa uma vez só (quando o pedido é
// concluído/entregue) e devolve se o pedido for cancelado.
export async function applyOrderStock(order: ShopOrder, apply: boolean) {
  if (order.stock_applied === apply) return
  const supabase = createClient()
  for (const p of order.parts) {
    if (!p.stock_item_id) continue
    const { data: cur } = await supabase.from('stock_items').select('quantity').eq('id', p.stock_item_id).maybeSingle()
    if (!cur) continue
    const next = Math.max(0, Number(cur.quantity || 0) + (apply ? -1 : 1) * Number(p.quantity || 0))
    await supabase.from('stock_items').update({ quantity: next }).eq('id', p.stock_item_id)
  }
  await supabase.from('shop_orders').update({ stock_applied: apply }).eq('id', order.id)
}

// Catálogo de serviços
export interface CatalogService { id: string; name: string; details: string | null; unit: string | null; unit_price: number }

export async function getCatalog(): Promise<CatalogService[]> {
  const { data, error } = await createClient().from('shop_catalog').select('*').order('name')
  if (error) throw error
  return (data ?? []).map((c: any) => ({ ...c, unit_price: Number(c.unit_price || 0) }))
}

export async function addToCatalog(line: OrderLine) {
  const tenant_id = await getMyTenantId()
  await createClient().from('shop_catalog').insert({ tenant_id, name: line.description, details: line.details || null, unit: line.unit || null, unit_price: line.unit_price })
}

export async function removeFromCatalog(id: string) {
  await createClient().from('shop_catalog').delete().eq('id', id)
}

// Clientes já usados em pedidos (pra preencher sozinho)
export async function getPastClients() {
  const { data } = await createClient().from('shop_orders')
    .select('client_name, client_phone, client_address, client_city, client_cep').order('created_at', { ascending: false }).limit(400)
  const seen = new Map<string, any>()
  for (const c of data ?? []) if (c.client_name && !seen.has(c.client_name.toLowerCase())) seen.set(c.client_name.toLowerCase(), c)
  return Array.from(seen.values())
}
