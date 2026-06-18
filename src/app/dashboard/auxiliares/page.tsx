'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  UserCog, TrendingUp, CalendarDays, ChevronDown, ChevronUp,
  Wallet, CheckCircle2, FileText, Loader2, Share2, X, Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/lib/tenant-context'
import Link from 'next/link'

const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

function localDate(d?: Date): string {
  const dt = d ?? new Date()
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
function firstOfMonth(): string {
  const d = new Date(); d.setDate(1); return localDate(d)
}

const PRESETS = [
  { label: 'Este mês', get: () => ({ start: firstOfMonth(), end: localDate() }) },
  { label: 'Últimos 30 dias', get: () => { const d = new Date(); d.setDate(d.getDate() - 30); return { start: localDate(d), end: localDate() } } },
  { label: 'Últimos 90 dias', get: () => { const d = new Date(); d.setDate(d.getDate() - 90); return { start: localDate(d), end: localDate() } } },
]

interface Order {
  order_id: string
  soa_id?: string
  os_number: string
  date: string
  total_value: number
  amount: number
  contact_name: string
  client_name?: string
  paid: boolean
  paid_at?: string
}

interface AuxSummary {
  id: string
  name: string
  type: string
  percentage: number
  total_earned: number
  unpaid_earned: number
  paid_earned: number
  call_count: number
  orders: Order[]
}

interface PaymentReport {
  aux: AuxSummary
  periodStart: string
  periodEnd: string
  paymentDate: string
  paidOrders: Order[]
  total: number
}

export default function ComissoesPage() {
  const { tenant } = useTenant()
  const commissionsEnabled = tenant?.enable_commissions ?? false
  const primaryColor = tenant?.primary_color ?? '#f97316'
  const logoUrl = tenant?.logo_url
  const companyName = tenant?.name ?? 'Empresa'

  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(localDate)
  const [loading, setLoading] = useState(true)
  const [summaries, setSummaries] = useState<AuxSummary[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  // Payment state
  const [payingAuxId, setPayingAuxId] = useState<string | null>(null)
  const [paymentDate, setPaymentDate] = useState(localDate)
  const [paymentLoading, setPaymentLoading] = useState(false)

  // Report state
  const [report, setReport] = useState<PaymentReport | null>(null)
  const [sharingReport, setSharingReport] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: soaRows } = await supabase
      .from('service_order_auxiliaries')
      .select(`
        id, percentage, amount, auxiliary_id, paid, paid_at,
        auxiliary:auxiliaries(id, name, type, percentage),
        service_order:service_orders!inner(
          id, os_number, date, total_value,
          call:calls(contact_name, clients(name))
        )
      `)
      .gte('service_order.date', startDate)
      .lte('service_order.date', endDate)

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

    const map: Record<string, AuxSummary> = {}

    function ensureAux(aux: any): AuxSummary | null {
      if (!aux?.id) return null
      if (!map[aux.id]) {
        map[aux.id] = {
          id: aux.id, name: aux.name, type: aux.type ?? 'tecnico',
          percentage: Number(aux.percentage ?? 0),
          total_earned: 0, unpaid_earned: 0, paid_earned: 0,
          call_count: 0, orders: [],
        }
      }
      return map[aux.id]
    }

    for (const row of (soaRows ?? [])) {
      const aux = ensureAux(row.auxiliary)
      if (!aux) continue
      const so = row.service_order as any
      if (!so) continue
      if (aux.orders.some(o => o.order_id === so.id)) continue
      const amount = Number(row.amount ?? 0)
      const paid = !!(row as any).paid
      aux.total_earned += amount
      if (paid) aux.paid_earned += amount
      else aux.unpaid_earned += amount
      aux.call_count += 1
      aux.orders.push({
        order_id: so.id,
        soa_id: row.id,
        os_number: so.os_number ?? '—',
        date: so.date,
        total_value: Number(so.total_value ?? 0),
        amount,
        contact_name: so.call?.contact_name ?? '—',
        client_name: so.call?.clients?.name,
        paid,
        paid_at: (row as any).paid_at,
      })
    }

    // Check which legacy orders have already been paid via expenses
    const legacyOrderIds = (legacyRows ?? []).map((r: any) => r.id)
    let paidLegacyOrderIds = new Set<string>()
    if (legacyOrderIds.length > 0) {
      const { data: paidExpenses } = await supabase
        .from('expenses')
        .select('source_service_order_id')
        .in('source_service_order_id', legacyOrderIds)
        .eq('status', 'pago')
      for (const e of (paidExpenses ?? [])) {
        if (e.source_service_order_id) paidLegacyOrderIds.add(e.source_service_order_id)
      }
      // Also check by auxiliary_id + paid_date in period (fallback for older payments)
      const auxIds = [...new Set((legacyRows ?? []).map((r: any) => r.auxiliary?.id).filter(Boolean))]
      if (auxIds.length > 0) {
        const { data: paidByAux } = await supabase
          .from('expenses')
          .select('auxiliary_id, paid_date')
          .in('auxiliary_id', auxIds)
          .eq('status', 'pago')
          .gte('paid_date', startDate)
          .lte('paid_date', endDate)
        const paidAuxIds = new Set((paidByAux ?? []).map((e: any) => e.auxiliary_id))
        for (const row of (legacyRows ?? [])) {
          if ((row.auxiliary as any)?.id && paidAuxIds.has((row.auxiliary as any)?.id)) {
            paidLegacyOrderIds.add(row.id)
          }
        }
      }
    }

    for (const row of (legacyRows ?? [])) {
      const aux = ensureAux(row.auxiliary)
      if (!aux) continue
      if (aux.orders.some(o => o.order_id === row.id)) continue
      const amount = Number(row.auxiliary_value ?? 0)
      const paid = paidLegacyOrderIds.has(row.id)
      aux.total_earned += amount
      if (paid) aux.paid_earned += amount
      else aux.unpaid_earned += amount
      aux.call_count += 1
      aux.orders.push({
        order_id: row.id,
        os_number: row.os_number ?? '—',
        date: row.date,
        total_value: Number(row.total_value ?? 0),
        amount,
        contact_name: (row.call as any)?.contact_name ?? '—',
        client_name: (row.call as any)?.clients?.name,
        paid,
      })
    }

    for (const s of Object.values(map)) {
      s.orders.sort((a, b) => b.date.localeCompare(a.date))
    }

    const sorted = Object.values(map).sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dono' ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    setSummaries(sorted)
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => { load() }, [load])

  const totalCommissions = summaries.reduce((s, a) => s + a.total_earned, 0)
  const totalUnpaid = summaries.reduce((s, a) => s + a.unpaid_earned, 0)
  const totalCalls = summaries.reduce((s, a) => s + a.call_count, 0)

  async function handlePagar(aux: AuxSummary) {
    const unpaidOrders = aux.orders.filter(o => !o.paid)
    if (unpaidOrders.length === 0) return
    setPaymentLoading(true)
    try {
      const supabase = createClient()
      const total = aux.unpaid_earned

      // 1. Mark SOA records as paid
      const soaIds = unpaidOrders.map(o => o.soa_id).filter(Boolean) as string[]
      if (soaIds.length > 0) {
        await supabase
          .from('service_order_auxiliaries')
          .update({ paid: true, paid_at: paymentDate })
          .in('id', soaIds)
      }

      // 2. Handle legacy orders (no SOA): create one expense per order, using
      //    source_service_order_id as dedup key so we never create duplicates
      const legacyUnpaid = unpaidOrders.filter(o => !o.soa_id)
      if (legacyUnpaid.length > 0) {
        const { getMyTenantId } = await import('@/lib/db/tenant')
        const tenant_id = await getMyTenantId()
        const legacyOrderIds = legacyUnpaid.map(o => o.order_id)

        // Check which legacy orders already have a paid expense (avoid duplicates)
        const { data: alreadyPaid } = await supabase
          .from('expenses')
          .select('source_service_order_id')
          .in('source_service_order_id', legacyOrderIds)
          .eq('status', 'pago')
        const alreadyPaidIds = new Set((alreadyPaid ?? []).map((e: any) => e.source_service_order_id))

        const toCreate = legacyUnpaid.filter(o => !alreadyPaidIds.has(o.order_id))
        for (const order of toCreate) {
          await supabase.from('expenses').insert({
            tenant_id,
            description: `Comissão ${aux.name} — ${order.os_number}`,
            category: 'Pessoal',
            amount: order.amount,
            type: 'avulso',
            status: 'pago',
            due_date: paymentDate,
            paid_date: paymentDate,
            auxiliary_id: aux.id,
            source_service_order_id: order.order_id,
          })
        }
      }

      // 3. For SOA orders, also mark any pending expenses by auxiliary_id as paid
      const { data: expByAux } = await supabase
        .from('expenses')
        .select('id')
        .eq('auxiliary_id', aux.id)
        .eq('status', 'pendente')
        .gte('due_date', startDate)
        .lte('due_date', endDate)
      if (expByAux && expByAux.length > 0) {
        await supabase
          .from('expenses')
          .update({ status: 'pago', paid_date: paymentDate })
          .in('id', expByAux.map(e => e.id))
      }

      // 3. Show report
      setReport({
        aux,
        periodStart: startDate,
        periodEnd: endDate,
        paymentDate,
        paidOrders: unpaidOrders,
        total,
      })
      setPayingAuxId(null)
      await load()
    } catch (e) {
      console.error(e)
      alert('Erro ao registrar pagamento. Tente novamente.')
    } finally {
      setPaymentLoading(false)
    }
  }

  async function handleShareReport() {
    if (!reportRef.current || sharingReport) return
    setSharingReport(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false,
      })
      const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/png'))
      if (!blob) throw new Error('Falha')
      const name = report?.aux.name ?? 'comissao'
      const file = new File([blob], `comprovante-${name}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Comprovante — ${name}` })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `comprovante-${name}.png`; a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') alert('Não foi possível compartilhar.')
    } finally {
      setSharingReport(false)
    }
  }

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
            </Link>
            {' '}para usar esta funcionalidade.
          </p>
        </div>
      </div>
    )
  }

  const ptDate = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('pt-BR')

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Comissões</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Ganhos por técnico e dono no período</p>
      </div>

      {/* Period filter */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Período</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => {
            const { start, end } = p.get()
            return (
              <button key={p.label} type="button"
                onClick={() => { setStartDate(start); setEndDate(end) }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                style={startDate === start && endDate === end
                  ? { background: 'var(--primary)', color: '#fff' }
                  : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)' }
                }>
                {p.label}
              </button>
            )
          })}
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Comissões', value: loading ? '—' : fmt(totalCommissions), color: 'var(--primary)' },
          { label: 'A Pagar', value: loading ? '—' : fmt(totalUnpaid), color: '#f59e0b' },
          { label: 'Chamados', value: loading ? '—' : String(totalCalls), color: 'var(--text-primary)' },
          { label: 'Pessoas', value: loading ? '—' : String(summaries.length), color: 'var(--text-primary)' },
        ].map(card => (
          <div key={card.label} className="rounded-2xl p-3 sm:p-4" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>{card.label}</p>
            <p className="font-bold text-sm sm:text-base tabular mt-1" style={{ color: card.color }}>{card.value}</p>
          </div>
        ))}
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
            </Link>
            {' '}e vincule-os nos chamados.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {summaries.map(aux => {
            const isExpanded = expanded === aux.id
            const isDono = aux.type === 'dono'
            const accentColor = isDono ? '#7c3aed' : primaryColor
            const accentBg = isDono ? 'rgba(139,92,246,0.10)' : 'rgba(var(--primary-rgb),0.10)'
            const accentBadgeBg = isDono ? 'rgba(139,92,246,0.15)' : 'rgba(var(--primary-rgb),0.12)'
            const isPaying = payingAuxId === aux.id
            const hasUnpaid = aux.unpaid_earned > 0

            return (
              <div key={aux.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
                {/* Header */}
                <button type="button"
                  onClick={() => setExpanded(isExpanded ? null : aux.id)}
                  className="w-full flex items-center gap-3 p-4 transition"
                  style={{ textAlign: 'left' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: accentBg }}>
                    <UserCog className="w-4 h-4" style={{ color: accentColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{aux.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: accentBadgeBg, color: accentColor }}>
                        {isDono ? 'Dono' : 'Técnico'}
                      </span>
                      {aux.paid_earned > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium text-emerald-700 bg-emerald-100">
                          {fmt(aux.paid_earned)} pago
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {aux.call_count} chamado{aux.call_count !== 1 ? 's' : ''} · {aux.percentage}% base
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm tabular" style={{ color: accentColor }}>
                      {fmt(aux.total_earned)}
                    </p>
                    {hasUnpaid && (
                      <p className="text-xs tabular font-medium text-amber-600 mt-0.5">
                        {fmt(aux.unpaid_earned)} a pagar
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 ml-1">
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                      : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                    }
                  </div>
                </button>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                    {/* Orders */}
                    <div className="px-3 py-2 text-xs flex items-center justify-between"
                      style={{ background: 'var(--surface-secondary)', color: 'var(--text-tertiary)' }}>
                      <span>Histórico de chamados</span>
                      <span className="font-semibold" style={{ color: accentColor }}>
                        Total: {fmt(aux.total_earned)}
                      </span>
                    </div>
                    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {aux.orders.map(ord => {
                        const date = ord.date ? ptDate(ord.date) : '—'
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
                            <div className="text-right flex-shrink-0 space-y-1">
                              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                OS: {fmt(ord.total_value)}
                              </p>
                              <p className="text-sm font-semibold" style={{ color: accentColor }}>
                                {fmt(ord.amount)}
                              </p>
                              {ord.paid ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {ord.paid_at ? ptDate(ord.paid_at) : 'Pago'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                                  <Clock className="w-3 h-3" />
                                  Pendente
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Payment section */}
                    {hasUnpaid && (
                      <div className="border-t p-4 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-secondary)' }}>
                        {!isPaying ? (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                A pagar: <span style={{ color: accentColor }}>{fmt(aux.unpaid_earned)}</span>
                              </p>
                              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                                {aux.orders.filter(o => !o.paid).length} chamado{aux.orders.filter(o => !o.paid).length !== 1 ? 's' : ''} pendente{aux.orders.filter(o => !o.paid).length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setPayingAuxId(aux.id); setPaymentDate(localDate()) }}
                              className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-xl transition active:scale-95"
                              style={{ background: accentColor }}>
                              <Wallet className="w-4 h-4" />
                              Pagar Período
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                              Confirmar pagamento de{' '}
                              <span style={{ color: accentColor }}>{fmt(aux.unpaid_earned)}</span>
                              {' '}para {aux.name}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Data do pagamento:
                              </label>
                              <input type="date" value={paymentDate}
                                onChange={e => setPaymentDate(e.target.value)}
                                className="input-field py-1.5 text-sm w-36" />
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handlePagar(aux)}
                                disabled={paymentLoading}
                                className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-xl transition active:scale-95 disabled:opacity-60"
                                style={{ background: '#16a34a' }}>
                                {paymentLoading
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <CheckCircle2 className="w-4 h-4" />
                                }
                                {paymentLoading ? 'Registrando...' : 'Confirmar Pagamento'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPayingAuxId(null)}
                                className="px-4 py-2 rounded-xl text-sm font-medium border transition"
                                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* View last report if all paid */}
                    {!hasUnpaid && aux.paid_earned > 0 && (
                      <div className="border-t px-4 py-3 flex items-center justify-between"
                        style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm text-emerald-700 font-medium">
                            {fmt(aux.paid_earned)} pagos no período
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Payment Report Modal ── */}
      {report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md overflow-auto" style={{ maxHeight: '90vh' }}>
            {/* Close + Share buttons */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setReport(null)}
                className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition">
                <X className="w-4 h-4" /> Fechar
              </button>
              <button
                onClick={handleShareReport}
                disabled={sharingReport}
                className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-xl transition active:scale-95"
                style={{ background: '#16a34a' }}>
                {sharingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                {sharingReport ? 'Gerando...' : 'Compartilhar'}
              </button>
            </div>

            {/* Report card (captured by html2canvas) */}
            <div
              ref={reportRef}
              className="bg-white overflow-hidden"
              style={{ borderRadius: 20, fontFamily: 'system-ui, -apple-system, Arial, sans-serif' }}
            >
              {/* Header */}
              <div style={{ background: primaryColor, padding: '24px 24px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {logoUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={logoUrl} alt={companyName} style={{ width: 40, height: 40, objectFit: 'contain' }} />
                      : <span style={{ color: '#fff', fontWeight: 900, fontSize: 22 }}>{companyName.charAt(0)}</span>
                    }
                  </div>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Comprovante de Pagamento</p>
                    <p style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{companyName}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 100, padding: '5px 12px' }}>
                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>
                      {ptDate(report.periodStart)} — {ptDate(report.periodEnd)}
                    </span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 100, padding: '5px 12px' }}>
                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>
                      Pago em {ptDate(report.paymentDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recipient */}
              <div style={{ padding: '16px 20px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.04)', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em', marginBottom: 2 }}>Beneficiário</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{report.aux.name}</p>
                    <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {report.aux.type === 'dono' ? 'Dono' : 'Técnico'} · {report.aux.percentage}% base
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em', marginBottom: 2 }}>Total Pago</p>
                    <p style={{ fontSize: 22, fontWeight: 900, color: primaryColor }}>{fmt(report.total)}</p>
                  </div>
                </div>

                {/* Orders table */}
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Chamados incluídos ({report.paidOrders.length})
                </p>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                  {report.paidOrders.map((ord, i) => (
                    <div key={ord.order_id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderTop: i > 0 ? '1px solid #f1f5f9' : 'none',
                    }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                          {ord.client_name ?? ord.contact_name}
                        </p>
                        <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                          {ord.date ? ptDate(ord.date) : '—'} · OS {ord.os_number}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 11, color: '#94a3b8' }}>OS: {fmt(ord.total_value)}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: primaryColor }}>{fmt(ord.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total row */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: primaryColor, borderRadius: 10, padding: '12px 14px', marginTop: 10,
                }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>TOTAL PAGO</span>
                  <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>{fmt(report.total)}</span>
                </div>
              </div>

              {/* Signature */}
              <div style={{ padding: '16px 20px 24px', display: 'flex', gap: 16 }}>
                <div style={{ flex: 1, borderTop: '1px solid #cbd5e1', paddingTop: 8 }}>
                  <p style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>Data: {ptDate(report.paymentDate)}</p>
                </div>
                <div style={{ flex: 2, borderTop: '1px solid #cbd5e1', paddingTop: 8 }}>
                  <p style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>Assinatura: {report.aux.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
