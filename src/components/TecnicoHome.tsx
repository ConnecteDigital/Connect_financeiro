'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PhoneCall, CheckCircle, XCircle, Clock, Wallet, ChevronRight, ChevronLeft, CalendarDays, Timer, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/lib/tenant-context'
import { getOpenVisit } from '@/lib/db/service-visits'
import { formatDuration } from '@/lib/business-hours'
import { useTecnicoQueue, compareQueue, localYmd } from '@/lib/tecnico-queue'

const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

function monthRange(offset: number) {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  return { start: localYmd(first), end: localYmd(last), label: first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }
}

interface Summary {
  total: number
  approved: number
  notApproved: number
  scheduled: number
  commissionMonth: number
  commissionPending: number
}

// Tela de Início do login de técnico. Tudo aqui já vem filtrado pelo
// banco (RLS): o técnico só enxerga os próprios chamados e a própria
// comissão, então as consultas não precisam filtrar por ele.
// O resumo é sempre de UM mês (o atual por padrão): virou o mês, zera;
// os meses anteriores ficam acessíveis pela seta.
export default function TecnicoHome() {
  const { tenant } = useTenant()
  const [monthOffset, setMonthOffset] = useState(0)
  const [data, setData] = useState<Summary | null>(null)
  const [today, setToday] = useState<any[] | null>(null)
  const [openVisit, setOpenVisit] = useState<any>(null)
  const [now, setNow] = useState(() => Date.now())
  const { lockOf } = useTecnicoQueue(true)

  // Serviço em andamento: o tempo vem da hora de início gravada no banco
  useEffect(() => {
    getOpenVisit().then(setOpenVisit).catch(() => setOpenVisit(null))
  }, [])
  useEffect(() => {
    if (!openVisit) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [openVisit])

  // Chamados de hoje (sempre o dia atual, independente do mês escolhido)
  useEffect(() => {
    const day = localYmd()
    createClient()
      .from('calls')
      .select('id, status, date, scheduled_date, scheduled_time, created_at, contact_name, service_category, call_address, address_number, call_neighborhood, client:clients(name)')
      .eq('status', 'agendado')
      .or(`scheduled_date.eq.${day},and(scheduled_date.is.null,date.eq.${day})`)
      .then(({ data }) => setToday((data ?? []).sort(compareQueue)))
  }, [])

  // Resumo do mês escolhido
  useEffect(() => {
    setData(null)
    const supabase = createClient()
    const { start, end } = monthRange(monthOffset)
    Promise.all([
      supabase
        .from('calls')
        .select('id, status')
        .or(`and(date.gte.${start},date.lte.${end}),and(scheduled_date.gte.${start},scheduled_date.lte.${end})`),
      supabase.from('expenses').select('amount, status, due_date').gte('due_date', start).lte('due_date', end),
    ]).then(([callsRes, expRes]) => {
      const calls = callsRes.data ?? []
      const expenses = expRes.data ?? []
      setData({
        total: calls.length,
        approved: calls.filter(c => c.status === 'aprovado').length,
        notApproved: calls.filter(c => c.status === 'nao_aprovou' || c.status === 'pagou_somente_visita').length,
        scheduled: calls.filter(c => c.status === 'agendado').length,
        commissionMonth: expenses.reduce((s, e) => s + Number(e.amount || 0), 0),
        commissionPending: expenses.filter(e => e.status === 'pendente').reduce((s, e) => s + Number(e.amount || 0), 0),
      })
    }).catch(console.error)
  }, [monthOffset])

  const { label: monthLabel } = monthRange(monthOffset)
  const loading = data === null

  const cards = [
    { label: 'Chamados', value: data?.total, icon: PhoneCall, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Aprovados', value: data?.approved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Não aprovados', value: data?.notApproved, icon: XCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Agendados', value: data?.scheduled, icon: Clock, color: 'text-violet-600', bg: 'bg-violet-50' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <p className="text-sm text-zinc-500">{tenant?.name}</p>
        <h1 className="text-2xl font-bold text-zinc-900">Olá!</h1>
      </div>

      {openVisit && (
        <Link href={`/dashboard/chamados/${openVisit.call_id}`}
          className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-emerald-50 border border-emerald-200">
          <Timer className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Serviço em andamento</p>
            <p className="text-sm font-medium text-zinc-800 truncate">
              {openVisit.call?.client?.name ?? openVisit.call?.contact_name ?? 'Chamado'}
            </p>
          </div>
          <span className="text-lg font-bold tabular-nums text-emerald-700">
            {formatDuration(now - new Date(openVisit.started_at).getTime())}
          </span>
        </Link>
      )}

      {/* Chamados de hoje — na ordem da agenda, com cadeado nos próximos */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <p className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Seus chamados de hoje
          </p>
          <Link href="/dashboard/chamados" className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>Ver todos</Link>
        </div>
        {today === null ? (
          <div className="p-4 space-y-2">
            {[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-zinc-50 rounded-lg animate-pulse" />)}
          </div>
        ) : today.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-400">Nenhum chamado agendado pra hoje</p>
        ) : (
          <div className="divide-y divide-zinc-50">
            {today.map(c => {
              const lock = lockOf(c)
              const time = c.scheduled_time ? String(c.scheduled_time).slice(0, 5) : null
              const name = c.client?.name ?? c.contact_name ?? 'Sem identificação'
              if (lock.locked) {
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3 bg-zinc-50/60">
                    <Lock className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-600 truncate">{time && `${time} · `}{name}</p>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {[c.service_category, lock.message].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                )
              }
              return (
                <Link key={c.id} href={`/dashboard/chamados/${c.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-800 truncate">
                      {time && <span style={{ color: 'var(--primary)' }}>{time} · </span>}{name}
                    </p>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">
                      {[c.service_category, [c.call_address, c.address_number].filter(Boolean).join(', '), c.call_neighborhood].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-300 flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Seletor de mês do resumo */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-zinc-100 px-4 py-2.5 shadow-sm">
        <button onClick={() => setMonthOffset(o => o - 1)} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="font-semibold text-zinc-800 capitalize text-sm">Resumo de {monthLabel}</p>
        <button onClick={() => setMonthOffset(o => Math.min(0, o + 1))} disabled={monthOffset === 0}
          className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 disabled:opacity-30">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Comissão do mês */}
      <Link href="/dashboard/comissao"
        className="block rounded-3xl p-5 text-white shadow-sm"
        style={{ background: 'var(--primary)' }}>
        <div className="flex items-center gap-2 text-white/80 text-xs font-medium uppercase tracking-wide">
          <Wallet className="w-4 h-4" /> Comissão a receber
        </div>
        <p className="text-3xl font-bold mt-1">{loading ? '—' : fmt(data.commissionPending)}</p>
        <p className="text-sm text-white/80 mt-1 capitalize">
          Total de {monthLabel}: {loading ? '—' : fmt(data.commissionMonth)}
        </p>
      </Link>

      {/* Contagem de chamados do mês */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-zinc-900 mt-2">{loading ? '—' : value}</p>
            <p className="text-xs text-zinc-500 font-medium">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
