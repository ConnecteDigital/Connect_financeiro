'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, X, ChevronRight, CalendarClock, CheckCircle2 } from 'lucide-react'
import { useTenant } from '@/lib/tenant-context'
import { isLojaMode } from '@/lib/loja'
import { getShopOrders, orderNumber, statusOf, ORDER_STATUSES, type ShopOrder } from '@/lib/db/shop-orders'
import { ptDate } from '@/lib/period'

const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Pedidos da conta Loja: todos os pedidos ou separados por situação
export default function PedidosPage() {
  const { tenant, loading: tenantLoading } = useTenant()
  const [orders, setOrders] = useState<ShopOrder[] | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<string>('todos')

  useEffect(() => {
    getShopOrders().then(setOrders).catch(e => {
      console.error(e); setOrders([])
      setError(String(e?.message ?? '').includes('shop_orders') ? 'Falta rodar a migration_v33.sql no Supabase.' : 'Não foi possível carregar os pedidos.')
    })
  }, [])

  const counts = useMemo(() => {
    const m: Record<string, { n: number; total: number }> = {}
    for (const o of orders ?? []) { (m[o.status] ??= { n: 0, total: 0 }); m[o.status].n++; m[o.status].total += o.total }
    return m
  }, [orders])

  const list = (orders ?? []).filter(o =>
    (status === 'todos' || o.status === status) &&
    norm([o.client_name, orderNumber(o), o.appliance, o.brand, o.model, o.client_phone].filter(Boolean).join(' ')).includes(norm(query.trim())))

  if (!tenantLoading && !isLojaMode(tenant)) {
    return <p className="text-center text-zinc-500 py-16 text-sm">Esta função não está disponível para esta conta.</p>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Pedidos</h1>
          <p className="text-sm text-zinc-500">Orçamentos e consertos da loja</p>
        </div>
        <Link href="/dashboard/pedidos/novo" className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo pedido
        </Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      {/* Situações: toca pra ver só aquela */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[{ value: 'todos', label: 'Todos', dot: 'bg-zinc-400', n: orders?.length ?? 0, total: (orders ?? []).reduce((s, o) => s + o.total, 0) },
          ...ORDER_STATUSES.filter(s => counts[s.value]).map(s => ({ ...s, n: counts[s.value].n, total: counts[s.value].total }))].map(s => {
          const active = status === s.value
          return (
            <button key={s.value} type="button" onClick={() => setStatus(active && s.value !== 'todos' ? 'todos' : s.value)}
              className={`text-left rounded-2xl border px-3 py-2.5 transition ${active ? 'bg-white shadow-sm' : 'bg-white/70 border-zinc-100'}`}
              style={active ? { borderColor: 'var(--primary)', boxShadow: '0 0 0 1px var(--primary)' } : {}}>
              <p className="text-xs font-semibold text-zinc-600 flex items-center gap-1.5 min-w-0"><span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} /><span className="truncate">{s.label}</span></p>
              <p className="text-xl font-bold text-zinc-900">{s.n}</p>
              <p className="text-[11px] text-zinc-500">{fmt(s.total)}</p>
            </button>
          )
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar cliente, número ou aparelho..."
          className="w-full pl-9 pr-9 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
        {query && <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400"><X className="w-4 h-4" /></button>}
      </div>

      <div className="space-y-2">
        {orders === null ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-24 bg-zinc-100 rounded-2xl animate-pulse" />)
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 p-10 text-center">
            <p className="text-sm text-zinc-400">{query || status !== 'todos' ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}</p>
            {!query && status === 'todos' && <Link href="/dashboard/pedidos/novo" className="mt-2 inline-block text-sm font-semibold" style={{ color: 'var(--primary)' }}>Criar o primeiro pedido</Link>}
          </div>
        ) : list.map(o => {
          const st = statusOf(o.status)
          return (
            <Link key={o.id} href={`/dashboard/pedidos/${o.id}`} className="block bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 active:scale-[0.99] transition">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${st.pill}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}</span>
                  <p className="font-semibold text-zinc-900 mt-1.5 truncate">{o.client_name}</p>
                  <p className="text-xs text-zinc-500 truncate">Pedido n. {orderNumber(o)} · {ptDate(o.date)}</p>
                  {(o.appliance || o.brand) && <p className="text-xs text-zinc-500 truncate">{[o.appliance, o.brand, o.model].filter(Boolean).join(' ')}{o.defect ? ` — ${o.defect}` : ''}</p>}
                  {o.visit_date && <p className="text-xs font-medium mt-1 flex items-center gap-1" style={{ color: 'var(--primary)' }}><CalendarClock className="w-3.5 h-3.5" /> {ptDate(o.visit_date)}{o.visit_time ? ` às ${o.visit_time.slice(0, 5)}` : ''}{o.visit_notes ? ` · ${o.visit_notes}` : ''}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-zinc-900">{fmt(o.total)}</p>
                  {o.cash_entry_id && <p className="text-[11px] font-semibold text-emerald-600 flex items-center justify-end gap-0.5"><CheckCircle2 className="w-3 h-3" /> Pago</p>}
                  <ChevronRight className="w-4 h-4 text-zinc-300 ml-auto mt-1" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
