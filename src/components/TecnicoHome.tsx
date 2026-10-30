'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PhoneCall, CheckCircle, XCircle, Clock, Wallet, ChevronRight, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/lib/tenant-context'

const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Summary {
  total: number
  approved: number
  notApproved: number
  scheduled: number
  commissionMonth: number
  commissionPending: number
  today: any[]
}

// Tela de Início do login de técnico. Tudo aqui já vem filtrado pelo
// banco (RLS): o técnico só enxerga os próprios chamados e a própria
// comissão, então as consultas não precisam filtrar por ele.
export default function TecnicoHome() {
  const { tenant } = useTenant()
  const [data, setData] = useState<Summary | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const now = new Date()
    const start = ymd(new Date(now.getFullYear(), now.getMonth(), 1))
    const end = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0))
    const today = ymd(now)

    Promise.all([
      supabase
        .from('calls')
        .select('id, status, date, scheduled_date, scheduled_time, contact_name, service_category, call_address, client:clients(name)')
        .or(`and(date.gte.${start},date.lte.${end}),and(scheduled_date.gte.${start},scheduled_date.lte.${end})`),
      supabase.from('expenses').select('amount, status, due_date'),
    ]).then(([callsRes, expRes]) => {
      const calls = callsRes.data ?? []
      const expenses = expRes.data ?? []
      setData({
        total: calls.length,
        approved: calls.filter(c => c.status === 'aprovado').length,
        notApproved: calls.filter(c => c.status === 'nao_aprovou' || c.status === 'pagou_somente_visita').length,
        scheduled: calls.filter(c => c.status === 'agendado').length,
        commissionMonth: expenses
          .filter(e => e.due_date >= start && e.due_date <= end)
          .reduce((s, e) => s + Number(e.amount || 0), 0),
        commissionPending: expenses
          .filter(e => e.status === 'pendente')
          .reduce((s, e) => s + Number(e.amount || 0), 0),
        today: calls
          .filter(c => c.status === 'agendado' && (c.scheduled_date ?? c.date) === today)
          .sort((a, b) => String(a.scheduled_time ?? '').localeCompare(String(b.scheduled_time ?? ''))),
      })
    }).catch(console.error)
  }, [])

  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long' })
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
        <h1 className="text-2xl font-bold text-zinc-900">Olá! Resumo de {monthLabel}</h1>
      </div>

      {/* Comissão */}
      <Link href="/dashboard/comissao"
        className="block rounded-3xl p-5 text-white shadow-sm"
        style={{ background: 'var(--primary)' }}>
        <div className="flex items-center gap-2 text-white/80 text-xs font-medium uppercase tracking-wide">
          <Wallet className="w-4 h-4" /> Comissão a receber
        </div>
        <p className="text-3xl font-bold mt-1">{loading ? '—' : fmt(data.commissionPending)}</p>
        <p className="text-sm text-white/80 mt-1">
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

      {/* Chamados de hoje */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <p className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Seus chamados de hoje
          </p>
          <Link href="/dashboard/chamados" className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>Ver todos</Link>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-zinc-50 rounded-lg animate-pulse" />)}
          </div>
        ) : data.today.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-400">Nenhum chamado agendado pra hoje</p>
        ) : (
          <div className="divide-y divide-zinc-50">
            {data.today.map(c => (
              <Link key={c.id} href={`/dashboard/chamados/${c.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-800 truncate">
                    {c.scheduled_time && <span style={{ color: 'var(--primary)' }}>{String(c.scheduled_time).slice(0, 5)} · </span>}
                    {c.client?.name ?? c.contact_name ?? 'Sem identificação'}
                  </p>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">
                    {[c.service_category, c.call_address].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
