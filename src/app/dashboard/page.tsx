'use client'

import { useState, useEffect, useCallback } from 'react'
import { PhoneCall, CheckCircle, DollarSign, TrendingUp, TrendingDown, AlertCircle, Clock, MapPin } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getDashboardStatsRange, getNotifications } from '@/lib/db/dashboard'
import DateRangePicker, { DateRange } from '@/components/DateRangePicker'
import QuickActionsFAB from '@/components/QuickActionsFAB'
import Link from 'next/link'

interface Stats {
  total_calls: number; approved_calls: number; gross_revenue: number
  net_revenue: number; pending_receivables: number; total_expenses: number
}

type Notifications = any

const today = new Date()
const defaultRange: DateRange = {
  start: format(startOfMonth(today), 'yyyy-MM-dd'),
  end: format(endOfMonth(today), 'yyyy-MM-dd'),
  label: format(today, "MMMM 'de' yyyy", { locale: ptBR }),
}
const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

export default function DashboardPage() {
  const [range, setRange] = useState<DateRange>(defaultRange)
  const [stats, setStats] = useState<Stats | null>(null)
  const [notifications, setNotifications] = useState<Notifications | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, n] = await Promise.all([getDashboardStatsRange(range.start, range.end), getNotifications()])
      setStats(s); setNotifications(n)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [range])

  useEffect(() => { load() }, [load])

  const cards = stats ? [
    { icon: PhoneCall,    label: 'Chamados',    value: String(stats.total_calls),      sub: `${stats.approved_calls} aprovados`,  color: 'text-zinc-800' },
    { icon: CheckCircle,  label: 'Aprovacao',   value: stats.total_calls > 0 ? `${Math.round((stats.approved_calls/stats.total_calls)*100)}%` : '0%', sub: `${stats.total_calls-stats.approved_calls} nao aprov.`, color: 'text-emerald-600' },
    { icon: DollarSign,   label: 'Rec. Bruta',  value: fmt(stats.gross_revenue),       sub: 'receita total',  color: 'text-orange-500' },
    { icon: TrendingUp,   label: 'Rec. Liquida',value: fmt(stats.net_revenue),         sub: 'apos custos',    color: stats.net_revenue >= 0 ? 'text-emerald-600' : 'text-red-500' },
    { icon: AlertCircle,  label: 'A Receber',   value: fmt(stats.pending_receivables), sub: 'em aberto',      color: 'text-amber-600' },
    { icon: TrendingDown, label: 'Saidas',      value: fmt(stats.total_expenses),      sub: 'despesas',       color: 'text-red-500' },
  ] : []

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
          <p className="text-zinc-500 text-sm hidden sm:block">Visao geral financeiro e operacional</p>
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Stats cards - swipe horizontal on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-6 no-scrollbar">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-36 sm:w-auto bg-white rounded-2xl border border-zinc-100 p-4 animate-pulse h-24" />
          ))
        ) : cards.map((card, i) => (
          <div key={i} className="flex-shrink-0 w-36 sm:w-auto bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide leading-none">{card.label}</p>
              <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
            </div>
            <p className={`text-lg font-bold leading-tight ${card.color}`}>{card.value}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Notifications - dark theme */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {[
          {
            icon: Clock, title: 'Agendados Hoje', count: notifications?.scheduled?.length ?? 0,
            accent: 'text-orange-400', badge: 'bg-orange-500',
            items: notifications?.scheduled ?? [],
            render: (n: any) => (
              <a key={n.id} href={`/dashboard/chamados/${n.id}/editar`}
                className="block px-4 py-2.5 hover:bg-zinc-800 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white truncate">{n.contact_name || n.client?.name || 'Cliente'}</p>
                      {n.scheduled_time && (
                        <span className="flex items-center gap-1 bg-orange-500/20 text-orange-400 text-xs font-bold px-1.5 py-0.5 rounded">
                          <Clock className="w-2.5 h-2.5" />{String(n.scheduled_time).slice(0,5)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {n.service_category && (
                        <span className="text-xs text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded truncate max-w-[140px]">{n.service_category}</span>
                      )}
                      {n.call_address && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500 truncate max-w-[160px]">
                          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{n.call_address}
                        </span>
                      )}
                      {!n.service_category && !n.call_address && !n.scheduled_time && (
                        <span className="text-xs text-zinc-600">Sem detalhes adicionais</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-orange-500 font-medium flex-shrink-0 mt-0.5">Editar</span>
                </div>
              </a>
            ),
            empty: 'Nenhum agendamento hoje',
          },
          {
            icon: AlertCircle, title: 'Pagamentos Pendentes', count: notifications?.pendingPayments?.length ?? 0,
            accent: 'text-amber-400', badge: 'bg-amber-500',
            items: notifications?.pendingPayments ?? [],
            render: (n: any) => (
              <div key={n.id} className="px-4 py-3">
                <p className="text-sm font-semibold text-white">{n.client?.name ?? 'Cliente'}</p>
                <p className="text-xs text-amber-400 mt-0.5">
                  Falta: {fmt(n.remaining_amount || n.total_value || 0)}
                  {n.remaining_due_date && ` - venc. ${new Date(n.remaining_due_date).toLocaleDateString('pt-BR')}`}
                </p>
              </div>
            ),
            empty: 'Nenhum pendente',
          },
          {
            icon: TrendingDown, title: 'Contas a Pagar', count: notifications?.pendingExpenses?.length ?? 0,
            accent: 'text-red-400', badge: 'bg-red-500',
            items: notifications?.pendingExpenses ?? [],
            render: (n: any) => (
              <div key={n.id} className="px-4 py-3">
                <p className="text-sm font-semibold text-white">{n.description}</p>
                <p className="text-xs text-red-400 mt-0.5">{fmt(n.amount)} - venc. {new Date(n.due_date).toLocaleDateString('pt-BR')}</p>
              </div>
            ),
            empty: 'Nenhuma conta pendente',
          },
        ].map((section, i) => (
          <div key={i} className="bg-zinc-900 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
              <section.icon className={`w-4 h-4 ${section.accent}`} />
              <h3 className="font-semibold text-sm text-white">{section.title}</h3>
              <span className={`ml-auto ${section.badge} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>
                {section.count}
              </span>
            </div>
            <div className="divide-y divide-zinc-800">
              {section.items.length === 0
                ? <p className="text-zinc-500 text-sm px-4 py-5 text-center">{section.empty}</p>
                : section.items.map((n: any) => section.render(n))
              }
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions - desktop only */}
      <div className="hidden lg:block bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <h3 className="font-semibold text-zinc-800 mb-4">Acoes Rapidas</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/chamados/novo" className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition">
            <PhoneCall className="w-4 h-4" /> Novo Chamado
          </Link>
          <Link href="/dashboard/clientes/novo" className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium px-4 py-2 rounded-xl transition">Novo Cliente</Link>
          <Link href="/dashboard/saidas/novo" className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium px-4 py-2 rounded-xl transition">Lancar Saida</Link>
          <Link href="/dashboard/relatorios" className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium px-4 py-2 rounded-xl transition">Ver Relatorios</Link>
        </div>
      </div>

      <QuickActionsFAB />
    </div>
  )
}
