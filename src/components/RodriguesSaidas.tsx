'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Check, Pencil, Trash2, Search, UserRound, Wrench, Car, CreditCard, Megaphone, Repeat, MoreHorizontal, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getAuxiliaries } from '@/lib/db/auxiliaries'
import { ptDate } from '@/lib/period'

// Saídas do Financeiro (dono da Rodrigues): em vez de uma lista corrida,
// as saídas ficam separadas por tipo (comissão, peça, Uber, maquininha,
// Google Ads, fixas, outras) e dá pra ver por serviço: cada OS com o que
// custou e o que sobrou.

const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const one = (v: any) => Array.isArray(v) ? v[0] : v

export interface SaidaRow {
  id: string
  created_at?: string
  description: string
  amount: number
  type: string
  category?: string
  status: string
  due_date: string
  paid_date?: string | null
  auxiliary_id?: string | null
  source_service_order_id?: string | null
}

type GroupKey = 'comissao' | 'pecas' | 'uber' | 'maquininha' | 'ads' | 'fixas' | 'outras'

const GROUPS: { key: GroupKey; label: string; icon: any; color: string; bg: string }[] = [
  { key: 'comissao',   label: 'Comissões',   icon: UserRound,  color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  { key: 'pecas',      label: 'Peças',       icon: Package,    color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  { key: 'uber',       label: 'Uber',        icon: Car,        color: 'text-zinc-700',   bg: 'bg-zinc-100 border-zinc-200' },
  { key: 'maquininha', label: 'Maquininha',  icon: CreditCard, color: 'text-sky-700',    bg: 'bg-sky-50 border-sky-200' },
  { key: 'ads',        label: 'Google Ads',  icon: Megaphone,  color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  { key: 'fixas',      label: 'Fixas',       icon: Repeat,     color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { key: 'outras',     label: 'Outras',      icon: MoreHorizontal, color: 'text-zinc-600', bg: 'bg-white border-zinc-200' },
]

export function groupOf(e: SaidaRow): GroupKey {
  const cat = (e.category ?? '').toLowerCase()
  const desc = e.description.toLowerCase()
  if (cat === 'pessoal' && (e.auxiliary_id || desc.startsWith('comiss'))) return 'comissao'
  if (cat === 'peças' || cat === 'pecas') return 'pecas'
  if (cat === 'uber') return 'uber'
  if (cat === 'taxa maquininha' || cat === 'maquininha') return 'maquininha'
  if (cat.includes('google') || cat.includes('ads') || cat === 'marketing' || /google|ads\b|anúncio|anuncio/.test(desc)) return 'ads'
  if (e.type === 'fixo') return 'fixas'
  return 'outras'
}

export const RODRIGUES_CATEGORIES = ['Google Ads', 'Peças', 'Uber', 'Taxa Maquininha', 'Pessoal', 'Aluguel', 'Combustível', 'Ferramentas', 'Alimentação', 'Outros']

export default function RodriguesSaidas({ expenses, onToggle, onEdit, onDelete, header }: {
  expenses: SaidaRow[]
  onToggle: (e: SaidaRow) => void
  onEdit: (e: SaidaRow) => void
  onDelete: (id: string) => void
  header?: ReactNode
}) {
  const [view, setView] = useState<'tipo' | 'servico'>('tipo')
  const [group, setGroup] = useState<GroupKey | 'todas'>('todas')
  const [status, setStatus] = useState<'todos' | 'pendente' | 'pago'>('todos')
  const [search, setSearch] = useState('')
  const [auxNames, setAuxNames] = useState<Record<string, string>>({})
  const [orders, setOrders] = useState<Record<string, any>>({})

  useEffect(() => {
    getAuxiliaries().then(a => setAuxNames(Object.fromEntries(a.map((x: any) => [x.id, x.name])))).catch(console.error)
  }, [])

  const osIds = useMemo(() => Array.from(new Set(expenses.map(e => e.source_service_order_id).filter(Boolean))).sort().join(','), [expenses])
  useEffect(() => {
    if (!osIds) { setOrders({}); return }
    createClient().from('service_orders')
      .select('id, os_number, date, total_value, call:calls(id, contact_name, call_neighborhood, client:clients(name))')
      .in('id', osIds.split(','))
      .then(({ data }) => setOrders(Object.fromEntries((data ?? []).map((so: any) => [so.id, so]))))
  }, [osIds])

  const rows = useMemo(() => expenses.map(e => ({ e, g: groupOf(e) })), [expenses])

  const groupTotals = useMemo(() => {
    const t: Record<GroupKey, { total: number; pending: number; count: number }> = Object.fromEntries(GROUPS.map(g => [g.key, { total: 0, pending: 0, count: 0 }])) as any
    for (const { e, g } of rows) {
      t[g].total += Number(e.amount); t[g].count++
      if (e.status === 'pendente') t[g].pending += Number(e.amount)
    }
    return t
  }, [rows])

  const filtered = rows.filter(({ e, g }) =>
    (group === 'todas' || g === group) &&
    (status === 'todos' || e.status === status) &&
    (!search || e.description.toLowerCase().includes(search.toLowerCase()) || clientOf(orders[e.source_service_order_id ?? '']).toLowerCase().includes(search.toLowerCase()))
  )
  const total = filtered.reduce((s, r) => s + Number(r.e.amount), 0)
  const paid = filtered.filter(r => r.e.status === 'pago').reduce((s, r) => s + Number(r.e.amount), 0)
  const pending = total - paid

  // Comissões agrupadas por técnico (dentro do tipo Comissões)
  const byTec = useMemo(() => {
    const m = new Map<string, { name: string; total: number; pending: number; count: number }>()
    for (const { e, g } of rows) {
      if (g !== 'comissao') continue
      const id = e.auxiliary_id ?? 'x'
      const name = auxNames[id] ?? (e.description.replace(/^Comissão\s*[—-]\s*/i, '').split(/\s+\(|\s+[A-Z]{2,3}-\d/)[0].trim() || 'Técnico')
      const cur = m.get(id) ?? { name, total: 0, pending: 0, count: 0 }
      cur.total += Number(e.amount); cur.count++
      if (e.status === 'pendente') cur.pending += Number(e.amount)
      m.set(id, cur)
    }
    return Array.from(m.values()).sort((a, b) => b.total - a.total)
  }, [rows, auxNames])

  // Por serviço: cada OS com seus custos
  const byService = useMemo(() => {
    const m = new Map<string, { so: any; items: { e: SaidaRow; g: GroupKey }[]; cost: number }>()
    const loose: { e: SaidaRow; g: GroupKey }[] = []
    for (const r of rows) {
      const id = r.e.source_service_order_id
      if (!id) { loose.push(r); continue }
      const cur = m.get(id) ?? { so: orders[id], items: [], cost: 0 }
      cur.items.push(r); cur.cost += Number(r.e.amount)
      m.set(id, cur)
    }
    const list = Array.from(m.entries()).map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => String(b.so?.date ?? '').localeCompare(String(a.so?.date ?? '')))
    return { list, loose }
  }, [rows, orders])

  const labelOf = (r: { e: SaidaRow; g: GroupKey }) => {
    if (r.g === 'comissao') return `Comissão · ${auxNames[r.e.auxiliary_id ?? ''] ?? 'técnico'}`
    return GROUPS.find(g => g.key === r.g)!.label
  }

  const Item = ({ r, showClient = true }: { r: { e: SaidaRow; g: GroupKey }; showClient?: boolean }) => {
    const cfg = GROUPS.find(g => g.key === r.g)!
    const so = r.e.source_service_order_id ? orders[r.e.source_service_order_id] : null
    const pago = r.e.status === 'pago'
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => onToggle(r.e)} title={pago ? 'Marcar como pendente' : 'Marcar como pago'}
          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border transition ${pago ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-zinc-300 text-transparent hover:border-emerald-400'}`}>
          <Check className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-800 truncate">
            {showClient ? (so ? clientOf(so) : r.e.description) : labelOf(r)}
          </p>
          <p className="text-xs text-zinc-500 truncate">
            {showClient && <><span className={`font-semibold ${cfg.color}`}>{labelOf(r)}</span>{' · '}</>}
            {ptDate(r.e.due_date)}{showClient && so?.os_number ? ` · ${so.os_number}` : ''}
            {pago && r.e.paid_date ? ` · pago ${ptDate(r.e.paid_date)}` : ' · pendente'}
          </p>
        </div>
        <p className={`text-sm font-bold flex-shrink-0 ${pago ? 'text-zinc-500' : 'text-zinc-800'}`}>{fmt(r.e.amount)}</p>
        {!r.e.source_service_order_id && (
          <div className="flex flex-shrink-0">
            <button onClick={() => onEdit(r.e)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-blue-50" title="Editar"><Pencil className="w-4 h-4 text-blue-400" /></button>
            <button onClick={() => onDelete(r.e.id)} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-red-50" title="Excluir"><Trash2 className="w-4 h-4 text-red-400" /></button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total', value: total, cls: 'text-zinc-900' },
          { label: 'Pago', value: paid, cls: 'text-emerald-600' },
          { label: 'Pendente', value: pending, cls: 'text-amber-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-3 py-2.5">
            <p className={`text-sm sm:text-base font-bold whitespace-nowrap ${c.cls}`}>{fmt(c.value)}</p>
            <p className="text-[11px] font-medium text-zinc-500">{c.label}</p>
          </div>
        ))}
      </div>

      {header}

      {/* Por tipo: chips com o total de cada um */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
        <button type="button" onClick={() => setGroup('todas')}
          className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition ${group === 'todas' ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-white text-zinc-600 border-zinc-200'}`}>
          Todas <span className="opacity-70">{fmt(rows.reduce((s, r) => s + Number(r.e.amount), 0))}</span>
        </button>
        {GROUPS.filter(g => groupTotals[g.key].count > 0).map(g => {
          const Icon = g.icon
          const active = group === g.key
          return (
            <button key={g.key} type="button" onClick={() => setGroup(active ? 'todas' : g.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${active ? 'bg-zinc-800 text-white border-zinc-800' : `${g.bg} ${g.color}`}`}>
              <Icon className="w-3.5 h-3.5" /> {g.label}
              <span className="opacity-80">{fmt(groupTotals[g.key].total)}</span>
              {groupTotals[g.key].pending > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${active ? 'bg-white/20' : 'bg-amber-100 text-amber-700'}`}>{fmt(groupTotals[g.key].pending)} pend.</span>}
            </button>
          )
        })}
      </div>

      {/* Comissões por técnico */}
      {(group === 'todas' || group === 'comissao') && byTec.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {byTec.map(t => (
            <div key={t.name} className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-3 py-2">
              <p className="text-xs font-semibold text-zinc-800 truncate flex items-center gap-1"><UserRound className="w-3 h-3 text-zinc-400" /> {t.name}</p>
              <p className="text-sm font-bold text-zinc-800">{fmt(t.total)}</p>
              <p className="text-[10px] text-zinc-500">{t.count} serviço{t.count > 1 ? 's' : ''}{t.pending > 0 ? ` · ${fmt(t.pending)} a pagar` : ''}</p>
            </div>
          ))}
          <Link href="/dashboard/auxiliares" className="rounded-2xl border border-dashed border-zinc-300 px-3 py-2 flex items-center justify-center text-xs font-semibold text-center" style={{ color: 'var(--primary)' }}>
            Dar baixa nas comissões →
          </Link>
        </div>
      )}

      {/* Busca + status + modo */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" placeholder="Buscar cliente ou descrição..." value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 py-2 text-sm" style={{ width: '100%' }} />
        </div>
        <div className="flex-shrink-0" style={{ width: 112 }}>
          <select value={status} onChange={e => setStatus(e.target.value as any)} className="input-field py-2 text-xs" style={{ width: '100%' }}>
            <option value="todos">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
          </select>
        </div>
      </div>
      <div className="flex bg-zinc-100 rounded-xl p-1">
        {([['tipo', 'Lista'], ['servico', 'Por serviço']] as const).map(([v, l]) => (
          <button key={v} type="button" onClick={() => setView(v)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${view === v ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>{l}</button>
        ))}
      </div>

      {view === 'tipo' ? (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-400">Nenhuma saída</p>
          ) : (
            <div className="divide-y divide-zinc-50">
              {filtered.sort((a, b) => b.e.due_date.localeCompare(a.e.due_date)).map(r => <Item key={r.e.id} r={r} />)}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {byService.list.filter(s => s.items.some(r => filtered.includes(r))).map(s => {
            const items = s.items.filter(r => filtered.includes(r))
            const value = Number(s.so?.total_value || 0)
            const left = value - s.cost
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-zinc-50">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-800 truncate flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5 text-zinc-400" /> {clientOf(s.so)}</p>
                    <p className="text-xs text-zinc-500">{[s.so?.os_number, ptDate(s.so?.date), one(s.so?.call)?.call_neighborhood].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-zinc-500">Serviço {fmt(value)}</p>
                    <p className={`text-sm font-bold ${left >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>Sobra {fmt(left)}</p>
                  </div>
                </div>
                <div className="divide-y divide-zinc-50">
                  {items.map(r => <Item key={r.e.id} r={r} showClient={false} />)}
                </div>
                <div className="px-4 py-2 bg-zinc-50 flex justify-between text-xs">
                  <span className="text-zinc-500">Custos do serviço</span>
                  <span className="font-bold text-zinc-800">{fmt(s.cost)}</span>
                </div>
                {one(s.so?.call)?.id && (
                  <Link href={`/dashboard/chamados/${one(s.so.call).id}`} className="block px-4 py-2 text-xs font-semibold border-t border-zinc-50" style={{ color: 'var(--primary)' }}>Abrir chamado →</Link>
                )}
              </div>
            )
          })}
          {byService.loose.filter(r => filtered.includes(r)).length > 0 && (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
              <p className="px-4 py-3 border-b border-zinc-50 text-sm font-semibold text-zinc-700">Saídas sem serviço ligado</p>
              <div className="divide-y divide-zinc-50">
                {byService.loose.filter(r => filtered.includes(r)).map(r => <Item key={r.e.id} r={r} />)}
              </div>
            </div>
          )}
          {byService.list.length === 0 && byService.loose.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-zinc-400 bg-white rounded-2xl border border-zinc-100">Nenhuma saída</p>
          )}
        </div>
      )}
    </div>
  )
}

function clientOf(so: any): string {
  if (!so) return ''
  const call = one(so.call)
  return one(call?.client)?.name ?? call?.contact_name ?? 'Cliente'
}
