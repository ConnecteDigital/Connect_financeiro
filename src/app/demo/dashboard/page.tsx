'use client'

import Link from 'next/link'
import { PhoneCall, CheckCircle, Clock, TrendingUp, TrendingDown, ChevronRight, Wallet, BarChart3 } from 'lucide-react'
import { MOCK_CALLS, MOCK_EXPENSES, MOCK_ENTRADAS } from '../data'

function fmt(v: number) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  aprovado:  { label: 'Aprovado',  color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  agendado:  { label: 'Agendado',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  aberto:    { label: 'Em aberto', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  orcamento: { label: 'Orçamento', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
}

const ORIGIN_LABELS: Record<string, string> = {
  whatsapp:  'WhatsApp', telefone: 'Telefone', indicacao: 'Indicação',
  instagram: 'Instagram', site: 'Site',
}

export default function DemoDashboard() {
  const totalCalls     = MOCK_CALLS.length
  const approved       = MOCK_CALLS.filter(c => c.status === 'aprovado').length
  const scheduled      = MOCK_CALLS.filter(c => c.status === 'agendado').length
  const grossRevenue   = MOCK_CALLS.filter(c => c.total_value).reduce((s, c) => s + (c.total_value ?? 0), 0)
  const totalExpenses  = MOCK_EXPENSES.reduce((s, e) => s + e.amount, 0)
  const netRevenue     = grossRevenue - totalExpenses
  const pendingEntrada = MOCK_ENTRADAS.filter(e => e.status === 'pendente').reduce((s, e) => s + e.amount, 0)

  const recent = [...MOCK_CALLS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Início</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Julho de 2026 · Modo Demonstração</p>
        </div>
      </div>

      {/* Call stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total de Chamados', value: totalCalls,  icon: PhoneCall,     color: '#3b82f6' },
          { label: 'Aprovados',         value: approved,    icon: CheckCircle,   color: '#10b981' },
          { label: 'Agendados',         value: scheduled,   icon: Clock,         color: '#f59e0b' },
          { label: 'A Receber',         value: null, money: pendingEntrada, icon: Wallet, color: '#8b5cf6' },
        ].map(card => (
          <div key={card.label} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <card.icon className="w-4 h-4 flex-shrink-0" style={{ color: card.color }} />
              <p className="text-xs font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>{card.label}</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {card.money !== undefined ? fmt(card.money) : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Receita Bruta</p>
          </div>
          <p className="text-xl font-bold text-emerald-600">{fmt(grossRevenue)}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Total de Saídas</p>
          </div>
          <p className="text-xl font-bold text-red-500">{fmt(totalExpenses)}</p>
        </div>
        <div className="rounded-2xl p-4" style={{
          background: netRevenue >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${netRevenue >= 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
        }}>
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4" style={{ color: netRevenue >= 0 ? '#10b981' : '#ef4444' }} />
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Saldo Líquido</p>
          </div>
          <p className="text-xl font-bold" style={{ color: netRevenue >= 0 ? '#10b981' : '#ef4444' }}>{fmt(netRevenue)}</p>
        </div>
      </div>

      {/* Recent calls */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Chamados Recentes</p>
          <Link href="/demo/chamados" className="text-xs font-medium" style={{ color: '#3b82f6' }}>Ver todos</Link>
        </div>
        {recent.map(call => {
          const s = STATUS_MAP[call.status] ?? STATUS_MAP.aberto
          return (
            <Link key={call.id} href={`/demo/chamados/${call.id}`}
              className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 transition hover:bg-black/[0.02]"
              style={{ borderColor: 'var(--border)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{call.contact_name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(call.date + 'T12:00:00').toLocaleDateString('pt-BR')} · {ORIGIN_LABELS[call.origin] ?? call.origin}
                  {call.service_category && ` · ${call.service_category}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
