import { createClient } from '@/lib/supabase/client'
import { getMyTenantId } from '@/lib/db/tenant'

// Conta Loja (Rodrigues – Loja): estoque de máquinas/peças, vendas e compras.

export type ItemKind = 'maquina' | 'peca'

export interface LojaItem {
  id: string
  kind: ItemKind
  name: string
  brand: string | null
  model: string | null
  notes: string | null
  quantity: number
  unit_value: number   // custo
  sale_value: number   // preço de venda
}

export async function getLojaItems(): Promise<LojaItem[]> {
  const { data, error } = await createClient().from('stock_items')
    .select('id, kind, name, brand, model, notes, quantity, unit_value, sale_value')
    .is('auxiliary_id', null).order('name')
  if (error) throw error
  return (data ?? []).map((i: any) => ({ ...i, quantity: Number(i.quantity || 0), unit_value: Number(i.unit_value || 0), sale_value: Number(i.sale_value || 0) }))
}

export async function saveLojaItem(values: Omit<LojaItem, 'id'>, id?: string) {
  const supabase = createClient()
  if (id) {
    const { error } = await supabase.from('stock_items').update(values).eq('id', id)
    if (error) throw error
    return
  }
  const tenant_id = await getMyTenantId()
  const { error } = await supabase.from('stock_items').insert({ ...values, tenant_id, auxiliary_id: null })
  if (error) throw error
}

export async function deleteLojaItem(id: string) {
  const { error } = await createClient().from('stock_items').delete().eq('id', id)
  if (error) throw error
}

async function setQuantity(id: string, quantity: number, extra: Record<string, unknown> = {}) {
  const { error } = await createClient().from('stock_items').update({ quantity: Math.max(0, quantity), ...extra }).eq('id', id)
  if (error) throw error
}

const itemLabel = (i: LojaItem) => [i.name, i.brand, i.model].filter(Boolean).join(' ')

// Vendeu: tira do estoque e lança a entrada de dinheiro
export async function sellItem(item: LojaItem, opts: { quantity: number; unitPrice: number; date: string; payment: string; client?: string; received: boolean }) {
  const supabase = createClient()
  const tenant_id = await getMyTenantId()
  const total = opts.quantity * opts.unitPrice
  const { error } = await supabase.from('cash_entries').insert({
    tenant_id,
    description: `Venda: ${opts.quantity}x ${itemLabel(item)}${opts.client ? ` — ${opts.client}` : ''}`,
    amount: total,
    direction: 'entrada',
    entry_type: 'venda',
    status: opts.received ? 'pago' : 'pendente',
    due_date: opts.date,
    paid_date: opts.received ? opts.date : null,
    notes: [opts.payment ? `Pagamento: ${opts.payment}` : '', `item:${item.id}`].filter(Boolean).join(' · '),
  })
  if (error) throw error
  await setQuantity(item.id, item.quantity - opts.quantity)
}

// Chegou mercadoria: soma no estoque e (se quiser) lança o gasto da compra
export async function receiveItem(item: LojaItem, opts: { quantity: number; unitCost: number; date: string; launchExpense: boolean; paid: boolean; supplier?: string }) {
  const supabase = createClient()
  await setQuantity(item.id, item.quantity + opts.quantity, opts.unitCost > 0 ? { unit_value: opts.unitCost } : {})
  if (opts.launchExpense && opts.unitCost > 0) {
    const tenant_id = await getMyTenantId()
    const { error } = await supabase.from('expenses').insert({
      tenant_id,
      description: `Compra: ${opts.quantity}x ${itemLabel(item)}${opts.supplier ? ` — ${opts.supplier}` : ''}`,
      category: 'Compra de mercadoria',
      amount: opts.quantity * opts.unitCost,
      type: 'avulso',
      status: opts.paid ? 'pago' : 'pendente',
      due_date: opts.date,
      paid_date: opts.paid ? opts.date : null,
    })
    if (error) throw error
  }
}

export interface LojaSummary {
  entradas: number
  entradasPendentes: number
  saidas: number
  saidasPendentes: number
  vendas: number
  recent: { id: string; kind: 'entrada' | 'saida'; description: string; amount: number; date: string; status: string; category?: string }[]
}

export async function getLojaSummary(start: string, end: string): Promise<LojaSummary> {
  const supabase = createClient()
  const [{ data: ce }, { data: ex }] = await Promise.all([
    supabase.from('cash_entries').select('id, description, amount, status, due_date, entry_type, direction')
      .eq('direction', 'entrada').neq('status', 'cancelado').gte('due_date', start).lte('due_date', end),
    supabase.from('expenses').select('id, description, amount, status, due_date, category')
      .gte('due_date', start).lte('due_date', end),
  ])
  const ins = (ce ?? []) as any[], outs = (ex ?? []) as any[]
  const sum = (l: any[]) => l.reduce((s, e) => s + Number(e.amount || 0), 0)
  return {
    entradas: sum(ins.filter(e => e.status === 'pago')),
    entradasPendentes: sum(ins.filter(e => e.status !== 'pago')),
    saidas: sum(outs.filter(e => e.status === 'pago')),
    saidasPendentes: sum(outs.filter(e => e.status !== 'pago')),
    vendas: ins.filter(e => e.entry_type === 'venda').length,
    recent: [
      ...ins.map(e => ({ id: e.id, kind: 'entrada' as const, description: e.description, amount: Number(e.amount), date: e.due_date, status: e.status })),
      ...outs.map(e => ({ id: e.id, kind: 'saida' as const, description: e.description, amount: Number(e.amount), date: e.due_date, status: e.status, category: e.category })),
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12),
  }
}
