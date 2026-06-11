'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PhoneCall, CheckCircle, DollarSign, TrendingUp, TrendingDown, AlertCircle, Clock, MapPin, ChevronRight, Plus } from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getDashboardStatsRange, getNotifications, getPendingReceivables } from '@/lib/db/dashboard'
import DateRangePicker, { DateRange } from '@/components/DateRangePicker'
import Link from 'next/link'
import { useTenant } from '@/lib/tenant-context'

interface Stats {
  total_calls: number; approved_calls: number; gross_revenue: number
  net_revenue: number; pending_receivables: number; total_expenses: number
}

const today = new Date()
const defaultRange: DateRange = {
  start: format(startOfMonth(today), 'yyyy-MM-dd'),
  end: format(endOfMonth(today), 'yyyy-MM-dd'),
  label: format(today, "MMMM 'de' yyyy", { locale: ptBR }),
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function AnimatedNumber({ value, prefix = 'R$ ' }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<number>(0)

  useEffect(() => {
    const start = ref.current
    const end = value
    const duration = 600
    const startTime = performance.now()

    function step(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + (end - start) * eased
      setDisplay(current)
      if (progress < 1) requestAnimationFrame(step)
      else ref.current = end
    }
    requestAnimationFrame(step)
  }, [value])

  return (
    <span className="tabular">
      {prefix}{fmt(display)}
    </span>
  )
}

function SkeletonCard() {
  return <div className="skeleton h-5 w-24 rounded-lg" />
}

export default function DashboardPage() {
  const [range, setRange] = useState<DateRange>(defaultRange)
  const [stats, setStats] = useState<Stats | null>(null)
  const [notifications, setNotifications] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showReceivables, setShowReceivables] = useState(false)
  const [receivables, setReceivables] = useState<any[] | null>(null)
  const { tenant } = useTenant()

  function openReceivables() {
    setShowReceivables(true)
    if (receivables === null) {
      getPendingReceivables().then(setReceivables).catch(() => setReceivables([]))
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, n] = await Promise.all([
        getDashboardStatsRange(range.start, range.end),
        getNotifications(),
      ])
      setStats(s)
      setNotifications(n)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [range])

  useEffect(() => { load() }, [load])

  const approvalRate = stats && stats.total_calls > 0
    ? Math.round((stats.approved_calls / stats.total_calls) * 100)
    : 0

  return (
    <div className="space-y-4 max-w-2xl mx-auto lg:max-w-7xl">

      {/* ── Hero revenue card ─────────────────────────────────── */}
      <div className="rounded-3xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
          boxShadow: 'var(--shadow-primary)',
        }}>
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10"
          style={{ background: 'white' }} />
        <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full opacity-10"
          style={{ background: 'white' }} />

        <div className="relative p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1">Receita Bruta</p>
              <div className="text-3xl font-bold text-white leading-none">
                {loading ? (
                  <div className="skeleton h-8 w-40 rounded-xl opacity-30" />
                ) : (
                  <AnimatedNumber value={stats?.gross_revenue ?? 0} />
                )}
              </div>
            </div>
            <DateRangePicker value={range} onChange={setRange} />
          </div>

          {/* Mini metrics row */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[
              { label: 'Líquido', value: stats?.net_revenue ?? 0, onClick: undefined as (() => void) | undefined },
              { label: 'A Receber', value: stats?.pending_receivables ?? 0, onClick: openReceivables },
              { label: 'Saídas', value: stats?.total_expenses ?? 0, onClick: undefined },
            ].map((m, i) => (
              <button key={i} type="button" onClick={m.onClick} disabled={!m.onClick}
                className="rounded-2xl px-3 py-2.5 text-left"
                style={{ background: 'rgba(0,0,0,0.15)' }}>
                <p className="text-white/60 text-[10px] font-medium uppercase tracking-wide">{m.label}</p>
                <p className="text-white font-bold text-sm mt-0.5 tabular">
                  {loading ? '—' : `R$ ${fmt(m.value)}`}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Call stats chips ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            icon: PhoneCall, label: 'Chamados', color: 'text-zinc-700',
            value: loading ? null : String(stats?.total_calls ?? 0),
            sub: loading ? null : `${stats?.approved_calls ?? 0} aprovados`,
            bg: '#f5f5f7', iconBg: 'rgba(0,0,0,0.06)',
          },
          {
            icon: CheckCircle, label: 'Aprovação', color: 'text-emerald-600',
            value: loading ? null : `${approvalRate}%`,
            sub: loading ? null : 'taxa de conversão',
            bg: '#f0fdf4', iconBg: 'rgba(22,163,74,0.12)',
          },
          {
            icon: AlertCircle, label: 'A Receber', color: 'text-amber-600',
            value: loading ? null : `R$ ${fmt(stats?.pending_receivables ?? 0)}`,
            sub: 'toque para ver', bg: '#fffbeb', iconBg: 'rgba(217,119,6,0.12)',
            onClick: openReceivables,
          },
          {
            icon: TrendingDown, label: 'Despesas', color: 'text-red-500',
            value: loading ? null : `R$ ${fmt(stats?.total_expenses ?? 0)}`,
            sub: 'este período', bg: '#fff1f2', iconBg: 'rgba(239,68,68,0.10)',
          },
        ].map((card: any, i) => (
          <button key={i} type="button" onClick={card.onClick} disabled={!card.onClick}
            className="rounded-2xl p-4 flex flex-col gap-2 text-left"
            style={{ background: card.bg, boxShadow: 'var(--shadow-sm)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: card.iconBg }}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium">{card.label}</p>
              <p className={`font-bold text-base leading-tight tabular ${card.color}`}>
                {card.value ?? <SkeletonCard />}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">{card.sub ?? ''}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Modal: detalhe de valores a receber ───────────────── */}
      {showReceivables && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowReceivables(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{ maxHeight: '80dvh' }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h3 className="font-bold text-slate-800">Valores a Receber</h3>
                <p className="text-xs text-slate-400 mt-0.5">Pagamentos pendentes e parciais</p>
              </div>
              <button onClick={() => setShowReceivables(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto divide-y divide-slate-100" style={{ maxHeight: 'calc(80dvh - 80px)' }}>
              {receivables === null ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="px-5 py-4 space-y-2">
                    <div className="skeleton h-4 w-32" />
                    <div className="skeleton h-3 w-20" />
                  </div>
                ))
              ) : receivables.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-10">Nenhum pagamento pendente 🎉</p>
              ) : (
                receivables.map((n: any) => (
                  <Link key={n.id} href={`/dashboard/chamados/${n.call_id}`}
                    onClick={() => setShowReceivables(false)}
                    className="flex items-center gap-3 px-5 py-3.5 active:bg-slate-50 transition">
                    <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {n.client?.name ?? 'Cliente'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {n.payment_status === 'pago_parcial' ? 'Pago parcialmente' : 'Pendente'}
                        {n.remaining_due_date && ` · Venc. ${new Date(n.remaining_due_date + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-amber-600 tabular">
                        R$ {fmt(n.remaining_amount || n.total_value || 0)}
                      </p>
                      <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                    </div>
                  </Link>
                ))
              )}
              <div className="h-[env(safe-area-inset-bottom,16px)]" />
            </div>
          </div>
        </div>
      )}

      {/* ── Notifications ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Agendados hoje */}
        <NotifSection
          icon={Clock}
          title="Agendados Hoje"
          accentColor="#f97316"
          items={notifications?.scheduled ?? []}
          loading={loading}
          empty="Nenhum agendamento hoje"
          renderItem={(n: any) => (
            <Link key={n.id} href={`/dashboard/chamados/${n.id}/editar`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/50 transition active:bg-zinc-800">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(249,115,22,0.15)' }}>
                <Clock className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {n.contact_name || n.client?.name || 'Cliente'}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {n.scheduled_time && (
                    <span className="text-xs text-orange-400 font-medium">{String(n.scheduled_time).slice(0, 5)}</span>
                  )}
                  {n.service_category && (
                    <span className="text-xs text-zinc-500 truncate">{n.service_category}</span>
                  )}
                </div>
                {n.call_address && (
                  <p className="flex items-center gap-1 text-xs text-zinc-600 mt-0.5 truncate">
                    <MapPin className="w-3 h-3 flex-shrink-0" />{n.call_address}
                  </p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-1" />
            </Link>
          )}
        />

        {/* Pagamentos pendentes */}
        <NotifSection
          icon={AlertCircle}
          title="Pagamentos Pendentes"
          accentColor="#d97706"
          items={notifications?.pendingPayments ?? []}
          loading={loading}
          empty="Nenhum pendente"
          renderItem={(n: any) => (
            <Link key={n.id} href={`/dashboard/chamados/${n.call_id}`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/50 transition active:bg-zinc-800">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(217,119,6,0.15)' }}>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {n.client?.name ?? 'Cliente'}
                </p>
                <p className="text-xs text-amber-400 font-medium mt-0.5 tabular">
                  R$ {fmt(n.remaining_amount || n.total_value || 0)}
                </p>
                {n.remaining_due_date && (
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Venc. {new Date(n.remaining_due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-1" />
            </Link>
          )}
        />

        {/* Contas a pagar */}
        <NotifSection
          icon={TrendingDown}
          title="Contas a Pagar"
          accentColor="#ef4444"
          items={notifications?.pendingExpenses ?? []}
          loading={loading}
          empty="Nenhuma conta pendente"
          renderItem={(n: any) => (
            <Link key={n.id} href={`/dashboard/saidas/${n.id}/editar`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/50 transition active:bg-zinc-800">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(239,68,68,0.15)' }}>
                <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{n.description}</p>
                <p className="text-xs text-red-400 font-medium mt-0.5 tabular">R$ {fmt(n.amount)}</p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Venc. {new Date(n.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-1" />
            </Link>
          )}
        />
      </div>

      {/* ── Quick actions (desktop only — mobile uses bottom FAB) ── */}
      <div className="hidden lg:flex items-center gap-3 flex-wrap">
        <Link href="/dashboard/chamados/novo"
          className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Chamado
        </Link>
        <Link href="/dashboard/saidas/novo"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition"
          style={{ background: '#f5f5f7', color: 'var(--text-primary)' }}>
          <TrendingDown className="w-4 h-4" /> Lançar Saída
        </Link>
        <Link href="/dashboard/relatorios"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition"
          style={{ background: '#f5f5f7', color: 'var(--text-primary)' }}>
          <TrendingUp className="w-4 h-4" /> Relatórios
        </Link>
      </div>
    </div>
  )
}

function NotifSection({
  icon: Icon, title, accentColor, items, loading, empty, renderItem,
}: {
  icon: any; title: string; accentColor: string
  items: any[]; loading: boolean; empty: string
  renderItem: (item: any) => React.ReactNode
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#18181b' }}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Icon className="w-4 h-4" style={{ color: accentColor }} />
        <h3 className="font-semibold text-sm text-white flex-1">{title}</h3>
        <span className="text-white text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: accentColor }}>
          {loading ? '·' : items.length}
        </span>
      </div>
      <div className="divide-y divide-white/5">
        {loading ? (
          [...Array(2)].map((_, i) => (
            <div key={i} className="px-4 py-3 space-y-2">
              <div className="skeleton h-4 w-32 opacity-20" />
              <div className="skeleton h-3 w-20 opacity-10" />
            </div>
          ))
        ) : items.length === 0 ? (
          <p className="text-zinc-600 text-sm px-4 py-6 text-center">{empty}</p>
        ) : (
          items.map(renderItem)
        )}
      </div>
    </div>
  )
}
