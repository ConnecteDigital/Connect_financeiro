import { createClient } from '@/lib/supabase/client'
import { getMyTenantId } from '@/lib/db/tenant'

// Conta Loja (Rodrigues – Loja): estoque de equipamentos/peças, vendas e compras.

export type ItemKind = 'maquina' | 'peca'   // 'maquina' = equipamento (o nome antigo ficou no banco)

export interface LojaMedia { path: string; video: boolean }

// Gasto pra deixar o aparelho pronto pra venda: peça usada, conserto, carreto...
export type CostKind = 'peca' | 'conserto' | 'carreto' | 'outro'
export interface LojaCost { id: string; kind: CostKind; description: string; amount: number; expense_id?: string | null }
export const COST_KINDS: { key: CostKind; label: string; category: string; placeholder: string }[] = [
  { key: 'peca', label: 'Peça', category: 'Peças', placeholder: 'Qual peça? Ex: Compressor 1/4' },
  { key: 'conserto', label: 'Conserto', category: 'Manutenção', placeholder: 'O que foi consertado?' },
  { key: 'carreto', label: 'Carreto', category: 'Transporte', placeholder: 'Ex: Buscar o aparelho' },
  { key: 'outro', label: 'Outro', category: 'Outros', placeholder: 'Ex: Pintura, limpeza...' },
]
export const costKindLabel = (k: CostKind) => COST_KINDS.find(c => c.key === k)?.label ?? 'Gasto'

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
  equipment_type: string | null   // Geladeira, Freezer...
  serial_number: string | null
  media: LojaMedia[]              // fotos e vídeos do equipamento
  costs: LojaCost[]               // gastos pra deixar pronto pra venda
  created_at?: string | null      // data de cadastro (a loja pode escolher)
}

export const costsTotal = (i: Pick<LojaItem, 'costs'>) => i.costs.reduce((s, c) => s + Number(c.amount || 0), 0)
// Quanto o aparelho custou de verdade: a compra + o que foi gasto nele
export const itemCostTotal = (i: Pick<LojaItem, 'unit_value' | 'costs'>) => Number(i.unit_value || 0) + costsTotal(i)

// Tipos de equipamento que já vêm prontos; a loja pode criar outros no "+"
export const EQUIPMENT_TYPES = ['Geladeira', 'Máquina de lavar', 'Freezer', 'Micro-ondas']
export const kindLabel = (k: ItemKind) => k === 'maquina' ? 'Equipamento' : 'Peça'

const BUCKET = 'chamados-anexos'
export const mediaUrl = (path: string) => createClient().storage.from(BUCKET).getPublicUrl(path).data.publicUrl
export const isVideoFile = (f: { type?: string; name: string }) => (f.type ?? '').startsWith('video/') || /\.(mp4|mov|m4v|webm|3gp|avi)$/i.test(f.name)

const BASE_COLS = 'id, kind, name, brand, model, notes, quantity, unit_value, sale_value, created_at'
const normItem = (i: any): LojaItem => ({
  ...i,
  quantity: Number(i.quantity || 0), unit_value: Number(i.unit_value || 0), sale_value: Number(i.sale_value || 0),
  equipment_type: i.equipment_type ?? null, serial_number: i.serial_number ?? null,
  media: Array.isArray(i.media) ? i.media : [],
  costs: Array.isArray(i.costs) ? i.costs.map((c: any) => ({ ...c, amount: Number(c.amount || 0) })) : [],
})

// Mensagem que explica o erro do banco em vez de um "não foi possível" genérico
export function lojaErrorMessage(e: any, fallback: string): string {
  const m = String(e?.message ?? '')
  if (/schema cache|column .* does not exist/i.test(m)) return 'Falta atualizar o banco: rode a migration_v35.sql no Supabase e tente de novo.'
  if (/row-level security/i.test(m)) return 'Este login não tem permissão pra gravar no estoque.'
  return m ? `${fallback} (${m})` : fallback
}

export async function getLojaItems(): Promise<LojaItem[]> {
  const supabase = createClient()
  const full = await supabase.from('stock_items')
    .select(`${BASE_COLS}, equipment_type, serial_number, media, costs`)
    .is('auxiliary_id', null).order('name')
  if (!full.error) return (full.data ?? []).map(normItem)
  // Banco sem a migration_v39: lista sem os gastos
  const v35 = await supabase.from('stock_items')
    .select(`${BASE_COLS}, equipment_type, serial_number, media`)
    .is('auxiliary_id', null).order('name')
  if (!v35.error) return (v35.data ?? []).map(normItem)
  // Banco sem a migration_v35: lista sem tipo, série e fotos (não some com o estoque)
  const { data, error } = await supabase.from('stock_items').select(BASE_COLS).is('auxiliary_id', null).order('name')
  if (error) throw error
  return (data ?? []).map(normItem)
}

// Cria ou atualiza o item e devolve o id (pra anexar fotos/vídeos depois)
export async function saveLojaItem(values: Omit<LojaItem, 'id' | 'media' | 'costs'>, id?: string): Promise<string> {
  const supabase = createClient()
  if (id) {
    const { error } = await supabase.from('stock_items').update(values).eq('id', id)
    if (error) throw error
    return id
  }
  const tenant_id = await getMyTenantId()
  // Campos da v35 só vão quando preenchidos: peça comum salva mesmo se a v35 ainda não rodou
  const { equipment_type, serial_number, ...base } = values
  const extra = { ...(equipment_type ? { equipment_type } : {}), ...(serial_number ? { serial_number } : {}) }
  const { data, error } = await supabase.from('stock_items').insert({ ...base, ...extra, tenant_id, auxiliary_id: null }).select('id').single()
  if (error) throw error
  return data.id
}

// Envia as fotos/vídeos novos, apaga os removidos e grava a lista no item.
// Devolve quantos arquivos não subiram (ex.: vídeo grande demais).
export async function saveLojaMedia(itemId: string, keep: LojaMedia[], removed: LojaMedia[], files: File[]): Promise<number> {
  const supabase = createClient()
  const storage = supabase.storage.from(BUCKET)
  const media = [...keep]
  let failed = 0
  for (const file of files) {
    const safe = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `estoque-${itemId}/${Date.now()}_${safe}`
    const { error } = await storage.upload(path, file, { contentType: file.type || undefined })
    if (error) { console.error(error); failed++ } else media.push({ path, video: isVideoFile(file) })
  }
  const { error } = await supabase.from('stock_items').update({ media }).eq('id', itemId)
  if (error) throw error
  if (removed.length) await storage.remove(removed.map(m => m.path)).catch(console.error)
  return failed
}

// Grava os gastos do aparelho. Os marcados pra "lançar no caixa" viram
// saída no Financeiro (uma vez só; corrigir o valor corrige a saída e
// apagar o gasto apaga a saída).
export async function saveLojaCosts(itemId: string, itemLabel: string, costs: (LojaCost & { launch?: boolean })[], removed: LojaCost[]) {
  const supabase = createClient()
  const today = new Date()
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const out: LojaCost[] = []
  let tenant_id: string | null = null
  for (const c of costs) {
    const { launch, ...cost } = c
    const kind = COST_KINDS.find(k => k.key === cost.kind) ?? COST_KINDS[3]
    const description = `${kind.label}${cost.description ? `: ${cost.description}` : ''} — ${itemLabel}`
    if (cost.expense_id) {
      await supabase.from('expenses').update({ amount: cost.amount, description, category: kind.category }).eq('id', cost.expense_id)
    } else if (launch && cost.amount > 0) {
      tenant_id ??= await getMyTenantId()
      const { data, error } = await supabase.from('expenses').insert({
        tenant_id, description, category: kind.category, amount: cost.amount, type: 'avulso',
        status: 'pago', due_date: ymd, paid_date: ymd, notes: `estoque:${itemId}`,
      }).select('id').single()
      if (error) throw error
      cost.expense_id = data.id
    }
    out.push(cost)
  }
  const { error } = await supabase.from('stock_items').update({ costs: out }).eq('id', itemId)
  if (error) throw error
  const ids = removed.map(r => r.expense_id).filter(Boolean) as string[]
  if (ids.length) await supabase.from('expenses').delete().in('id', ids)
}

export async function deleteLojaItem(id: string, media: LojaMedia[] = []) {
  const supabase = createClient()
  const { error } = await supabase.from('stock_items').delete().eq('id', id)
  if (error) throw error
  if (media.length) await supabase.storage.from(BUCKET).remove(media.map(m => m.path)).catch(console.error)
}

async function setQuantity(id: string, quantity: number, extra: Record<string, unknown> = {}) {
  const { error } = await createClient().from('stock_items').update({ quantity: Math.max(0, quantity), ...extra }).eq('id', id)
  if (error) throw error
}

const itemLabel = (i: LojaItem) => [i.name, i.brand, i.model].filter(Boolean).join(' ')

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
