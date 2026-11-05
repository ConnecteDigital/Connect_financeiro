'use client'

import { useEffect, useState } from 'react'
import { Wallet, CheckCircle2, Clock, ChevronLeft, ChevronRight, ChevronDown, CreditCard } from 'lucide-react'
import { getExpenses } from '@/lib/db/expenses'
import { createClient } from '@/lib/supabase/client'
import { osCardGross, osCardPending } from '@/lib/payments'

const OS_FIELDS = 'id, os_number, date, total_value, parts_cost, after_hours, payments, payment_method, card_net_value, call:calls(contact_name, return_of_call_id, client:clients(name))'

const one = (v: any) => Array.isArray(v) ? v[0] : v
const clientOf = (so: any) => {
  const call = one(so?.call)
  return one(call?.client)?.name ?? call?.contact_name ?? 'Cliente'
}
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')

const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

function localDate(d?: Date): string {
  const dt = d ?? new Date()
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export default function ComissaoPage() {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<any[]>([])
  const [orders, setOrders] = useState<Record<string, any>>({})
  const [cardWaiting, setCardWaiting] = useState<any[]>([])
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    getExpenses()
      .then(async list => {
        setEntries(list)
        // OS de cada comissão, pro detalhamento do cálculo
        const ids = Array.from(new Set(list.map((e: any) => e.source_service_order_id).filter(Boolean)))
        if (ids.length) {
          const { data } = await createClient().from('service_orders').select(OS_FIELDS).in('id', ids)
          setOrders(Object.fromEntries((data ?? []).map((so: any) => [so.id, so])))
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Comissão por SEMANA (segunda a domingo — é paga por semana) ou por MÊS,
  // pela data de vencimento. Os períodos anteriores ficam na seta ‹; não
  // passa do atual.
  const [mode, setMode] = useState<'semana' | 'mes'>('semana')
  const [offset, setOffset] = useState(0)
  const now = new Date()
  let start: string, end: string, periodLabel: string
  if (mode === 'semana') {
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) + offset * 7)
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
    start = localDate(monday)
    end = localDate(sunday)
    const short = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    periodLabel = offset === 0 ? `Esta semana · ${short(monday)} a ${short(sunday)}` : `${short(monday)} a ${short(sunday)}`
  } else {
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    start = localDate(first)
    end = localDate(new Date(now.getFullYear(), now.getMonth() + offset + 1, 0))
    periodLabel = first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }
  // Serviços do mês no cartão que o dono ainda não confirmou: a comissão
  // só é lançada depois disso
  useEffect(() => {
    createClient().from('service_orders').select(OS_FIELDS)
      .gte('date', start).lte('date', end).is('card_net_value', null)
      .then(({ data }) => setCardWaiting((data ?? []).filter((so: any) => osCardPending(so) && !one(so.call)?.return_of_call_id)))
  }, [start, end])

  const monthEntries = entries
    .filter(e => e.due_date >= start && e.due_date <= end)
    .sort((a, b) => String(b.due_date).localeCompare(String(a.due_date)))

  const sum = (list: any[]) => list.reduce((s, e) => s + Number(e.amount || 0), 0)
  const total = sum(monthEntries)
  const paid = sum(monthEntries.filter(e => e.status === 'pago'))
  const pending = sum(monthEntries.filter(e => e.status === 'pendente'))

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Minha Comissão</h1>
      </div>

      <div className="flex bg-zinc-100 rounded-xl p-1">
        {([['semana', 'Semana'], ['mes', 'Mês']] as const).map(([v, l]) => (
          <button key={v} type="button" onClick={() => { setMode(v); setOffset(0) }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${mode === v ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl border border-zinc-100 px-4 py-2.5 shadow-sm">
        <button onClick={() => setOffset(o => o - 1)} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className={`font-semibold text-zinc-800 text-sm ${mode === 'mes' ? 'capitalize' : ''}`}>{periodLabel}</p>
        <button onClick={() => setOffset(o => Math.min(0, o + 1))} disabled={offset === 0}
          className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 disabled:opacity-30">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm">
          <Wallet className="w-5 h-5 mb-2" style={{ color: 'var(--primary)' }} />
          <p className="text-zinc-400 text-xs font-medium">Total</p>
          <p className="text-lg font-bold text-zinc-900 mt-0.5">{loading ? '—' : fmt(total)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm">
          <CheckCircle2 className="w-5 h-5 mb-2 text-emerald-500" />
          <p className="text-zinc-400 text-xs font-medium">Pago</p>
          <p className="text-lg font-bold text-emerald-600 mt-0.5">{loading ? '—' : fmt(paid)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm">
          <Clock className="w-5 h-5 mb-2 text-amber-500" />
          <p className="text-zinc-400 text-xs font-medium">A receber</p>
          <p className="text-lg font-bold text-amber-600 mt-0.5">{loading ? '—' : fmt(pending)}</p>
        </div>
      </div>

      {cardWaiting.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 overflow-hidden">
          <p className="px-4 py-3 border-b border-amber-100 text-sm font-semibold text-amber-800 flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Aguardando confirmação do cartão
          </p>
          <div className="divide-y divide-amber-100">
            {cardWaiting.map(so => (
              <div key={so.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{clientOf(so)}</p>
                  <p className="text-xs text-amber-700 mt-0.5">comissão será calculada após confirmação</p>
                </div>
                <p className="text-sm font-bold text-zinc-800 flex-shrink-0 ml-3">{fmt(so.total_value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <p className="px-4 py-3 border-b border-zinc-100 text-sm font-semibold text-zinc-700">Serviços comissionados</p>
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-zinc-50 rounded-lg animate-pulse" />)}
          </div>
        ) : monthEntries.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-400">{mode === 'semana' ? 'Nenhuma comissão nesta semana' : 'Nenhuma comissão neste mês'}</p>
        ) : (
          <div className="divide-y divide-zinc-50">
            {monthEntries.map(e => {
              const so = e.source_service_order_id ? orders[e.source_service_order_id] : null
              const open = openId === e.id
              return (
                <div key={e.id}>
                  <button type="button" onClick={() => setOpenId(open ? null : e.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 transition">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-800 truncate">{so ? clientOf(so) : e.description}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {[so?.os_number, fmtDate(so?.date ?? e.due_date)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-zinc-800">{fmt(e.amount)}</p>
                        <span className={`text-xs font-semibold ${e.status === 'pago' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {e.status === 'pago' ? 'Pago' : 'Pendente'}
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-zinc-300 transition ${open ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {open && <CommissionDetail so={so} amount={Number(e.amount || 0)} />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Como a comissão foi calculada: (total − peças − taxa da maquininha) × %
function CommissionDetail({ so, amount }: { so: any; amount: number }) {
  if (!so) {
    return <p className="px-4 pb-3 text-xs text-zinc-400">Sem ordem de serviço vinculada.</p>
  }
  const total = Number(so.total_value || 0)
  const parts = Number(so.parts_cost || 0)
  const card = osCardGross(so)
  const fee = card > 0 && so.card_net_value != null ? Math.max(card - Number(so.card_net_value), 0) : 0
  const base = Math.max(total - parts - fee, 0)
  const pct = base > 0 ? (amount / base) * 100 : 0
  const rows: [string, string][] = [
    ['Cliente', clientOf(so)],
    ['OS', `${so.os_number ?? '—'} · ${fmtDate(so.date)}`],
    ['Valor total', fmt(total)],
    ['Peças', `− ${fmt(parts)}`],
    ['Taxa da maquininha', `− ${fmt(fee)}`],
    ['Base da comissão', fmt(base)],
    [`% aplicada (${so.after_hours ? 'fora do horário' : 'horário comercial'})`, `${pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`],
    ['Valor da comissão', fmt(amount)],
  ]
  return (
    <div className="mx-4 mb-3 rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2 space-y-1">
      {rows.map(([k, v], i) => (
        <div key={k} className={`flex justify-between gap-3 text-xs ${i === rows.length - 1 ? 'pt-1 border-t border-zinc-200 font-bold text-zinc-800' : 'text-zinc-600'}`}>
          <span>{k}</span><span className="text-right">{v}</span>
        </div>
      ))}
    </div>
  )
}
