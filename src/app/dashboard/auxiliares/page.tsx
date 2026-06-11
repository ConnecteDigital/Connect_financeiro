'use client'

import { useEffect, useState, useCallback } from 'react'
import { UserCog, TrendingUp, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/lib/tenant-context'
import Link from 'next/link'

const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

function todayStr() { return new Date().toISOString().split('T')[0] }
function firstOfMonth() {
  const d = new Date(); d.setDate(1)
  return d.toISOString().split('T')[0]
}

const PRESETS = [
  { label: 'Este mês', start: firstOfMonth(), end: todayStr() },
  { label: 'Últimos 30 dias', start: (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0] })(), end: todayStr() },
  { label: 'Últimos 90 dias', start: (() => { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().split('T')[0] })(), end: todayStr() },
]

interface AuxSummary {
  id: string
  name: string
  type: string
  percentage: number
  total_earned: number
  call_count: number
  orders: Array<{
    order_id: string
    os_number: string
    date: string
    total_value: number
    amount: number
    contact_name: string
    client_name?: string
  }>
}

export default function ComissoesPage() {
  const { tenant } = useTenant()
  const commissionsEnabled = tenant?.enable_commissions ?? false

  const [startDate, setStartDate] = useState(firstOfMonth())
  const [endDate, setEndDate] = useState(todayStr())
  const [loading, setLoading] = useState(true)
  const [summaries, setSummaries] = useState<AuxSummary[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    // Query 1: new multi-auxiliary records from service_order_auxiliaries
    const { data: soaRows } = await supabase
      .from('service_order_auxiliaries')
      .select(`
        id, percentage, amount, auxiliary_id,
        auxiliary:auxiliaries(id, name, type, percentage),
        service_order:service_orders!inner(
          id, os_number, date, total_value,
          call:calls(contact_name, clients(name))
        )
      `)
      .gte('service_order.date', startDate)
      .lte('service_order.date', endDate)

    // Query 2: legacy single-auxiliary records from service_orders
    const { data: legacyRows } = await supabase
      .from('service_orders')
      .select(`
        id, os_number, date, total_value, auxiliary_value,
        auxiliary:auxiliaries(id, name, type, percentage),
        call:calls(contact_name, clients(name))
      `)
      .not('auxiliary_id', 'is', null)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    // Merge both sources into a unified structure per auxiliary
    const map: Record<string, AuxSummary> = {}

    function ensureAux(aux: any) {
      if (!aux || !aux.id) return null
      if (!map[aux.id]) {
        map[aux.id] = {
          id: aux.id,
          name: aux.name,
          type: aux.type ?? 'tecnico',
          percentage: Number(aux.percentage ?? 0),
          total_earned: 0,
          call_count: 0,
          orders: [],
        }
      }
      return map[aux.id]
    }

    // Process new multi-aux rows
    for (const row of (soaRows ?? [])) {
      const aux = ensureAux(row.auxiliary)
      if (!aux) continue
      const so = row.service_order as any
      if (!so) continue
      // Skip if this order is already in the orders list (avoid legacy duplicate)
      if (aux.orders.some(o => o.order_id === so.id)) continue
      const amount = Number(row.amount ?? 0)
      aux.total_earned += amount
      aux.call_count += 1
      aux.orders.push({
        order_id: so.id,
        os_number: so.os_number ?? '—',
        date: so.date,
        total_value: Number(so.total_value ?? 0),
        amount,
        contact_name: so.call?.contact_name ?? '—',
        client_name: so.call?.clients?.name,
      })
    }

    // Process legacy single-aux rows (skip if auxiliary already covered by soa)
    for (const row of (legacyRows ?? [])) {
      const aux = ensureAux(row.auxiliary)
      if (!aux) continue
      // Skip if this order is already tracked (came from soa)
      if (aux.orders.some(o => o.order_id === row.id)) continue
      const amount = Number(row.auxiliary_value ?? 0)
      aux.total_earned += amount
      aux.call_count += 1
      aux.orders.push({
        order_id: row.id,
        os_number: row.os_number ?? '—',
        date: row.date,
        total_value: Number(row.total_value ?? 0),
        amount,
        contact_name: (row.call as any)?.contact_name ?? '—',
        client_name: (row.call as any)?.clients?.name,
      })
    }

    // Sort orders by date desc within each summary
    for (const s of Object.values(map)) {
      s.orders.sort((a, b) => b.date.localeCompare(a.date))
    }

    // Sort summaries: donos first, then tecnicos, alphabetical within each group
    const sorted = Object.values(map).sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dono' ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    setSummaries(sorted)
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => { load() }, [load])

  const totalCommissions = summaries.reduce((s, a) => s + a.total_earned, 0)
  const totalCalls = summaries.reduce((s, a) => s + a.call_count, 0)

  if (!commissionsEnabled) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Comissões</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Controle de comissões por técnico e dono</p>
        </div>
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
          <UserCog className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <p className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Módulo de Comissões desativado</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Ative o módulo em{' '}
            <Link href="/dashboard/configuracoes" className="underline font-medium" style={{ color: 'var(--primary)' }}>
              Configurações
            </Link>{' '}
            para usar esta funcionalidade.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Comissões</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Ganhos por técnico e dono no período</p>
      </div>

      {/* Date filter */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Período</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p.label} type="button"
              onClick={() => { setStartDate(p.start); setEndDate(p.end) }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
              style={startDate === p.start && endDate === p.end
                ? { background: 'var(--primary)', color: '#fff' }
                : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }
              }>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>De</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="input-field py-1.5 text-sm w-36" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Até</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="input-field py-1.5 text-sm w-36" />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl p-3 sm:p-4" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
          <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Total Comissões</p>
          <p className="font-bold text-sm sm:text-base tabular mt-1" style={{ color: 'var(--primary)' }}>
            {loading ? '—' : fmt(totalCommissions)}
          </p>
        </div>
        <div className="rounded-2xl p-3 sm:p-4" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
          <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Chamados</p>
          <p className="font-bold text-sm sm:text-base tabular mt-1" style={{ color: 'var(--text-primary)' }}>
            {loading ? '—' : totalCalls}
          </p>
        </div>
        <div className="rounded-2xl p-3 sm:p-4" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
          <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Pessoas</p>
          <p className="font-bold text-sm sm:text-base tabular mt-1" style={{ color: 'var(--text-primary)' }}>
            {loading ? '—' : summaries.length}
          </p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl p-4" style={{ background: 'var(--surface)' }}>
              <div className="skeleton h-5 w-40 rounded-lg mb-2" />
              <div className="skeleton h-4 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      ) : summaries.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--surface)' }}>
          <UserCog className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Nenhuma comissão no período</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Adicione auxiliares em{' '}
            <Link href="/dashboard/configuracoes" className="underline" style={{ color: 'var(--primary)' }}>
              Configurações
            </Link>{' '}
            e vincule-os nos chamados.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {summaries.map(aux => {
            const isExpanded = expanded === aux.id
            const isDono = aux.type === 'dono'
            return (
              <div key={aux.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
                {/* Header row */}
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : aux.id)}
                  className="w-full flex items-center gap-3 p-4 transition"
                  style={{ textAlign: 'left' }}>
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={isDono
                      ? { background: 'rgba(139,92,246,0.12)' }
                      : { background: 'rgba(var(--primary-rgb),0.10)' }
                    }>
                    <UserCog className="w-4 h-4" style={{ color: isDono ? '#7c3aed' : 'var(--primary)' }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{aux.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={isDono
                          ? { background: 'rgba(139,92,246,0.15)', color: '#7c3aed' }
                          : { background: 'rgba(var(--primary-rgb),0.12)', color: 'var(--primary)' }
                        }>
                        {isDono ? 'Dono' : 'Técnico'}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {aux.call_count} chamado{aux.call_count !== 1 ? 's' : ''} · {aux.percentage}% base
                    </p>
                  </div>

                  {/* Earnings */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm tabular" style={{ color: isDono ? '#7c3aed' : 'var(--primary)' }}>
                      {fmt(aux.total_earned)}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      <TrendingUp className="w-3 h-3" />
                      <span className="text-xs">total</span>
                    </div>
                  </div>

                  {/* Expand icon */}
                  <div className="flex-shrink-0 ml-1">
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                      : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                    }
                  </div>
                </button>

                {/* Expanded orders */}
                {isExpanded && (
                  <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                    {aux.orders.length === 0 ? (
                      <p className="text-center py-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        Nenhum chamado no período
                      </p>
                    ) : (
                      <>
                        <div className="px-4 py-2 flex items-center justify-between text-xs"
                          style={{ background: 'var(--surface-secondary)', color: 'var(--text-tertiary)' }}>
                          <span>Histórico de chamados</span>
                          <span className="font-semibold" style={{ color: isDono ? '#7c3aed' : 'var(--primary)' }}>
                            Total: {fmt(aux.total_earned)}
                          </span>
                        </div>
                        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                          {aux.orders.map(ord => {
                            const date = ord.date
                              ? new Date(ord.date + 'T12:00:00').toLocaleDateString('pt-BR')
                              : '—'
                            const clientLabel = ord.client_name ?? ord.contact_name
                            return (
                              <div key={ord.order_id} className="flex items-center gap-3 px-4 py-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                    {clientLabel}
                                  </p>
                                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                                    {date} · OS {ord.os_number}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                    Total OS: {fmt(ord.total_value)}
                                  </p>
                                  <p className="text-sm font-semibold" style={{ color: isDono ? '#7c3aed' : 'var(--primary)' }}>
                                    {fmt(ord.amount)}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
