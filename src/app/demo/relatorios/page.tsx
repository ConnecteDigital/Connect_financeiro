'use client'

import { useState } from 'react'
import { BarChart3, TrendingDown, TrendingUp, PhoneCall } from 'lucide-react'
import { MOCK_CALLS, MOCK_EXPENSES, MOCK_ENTRADAS } from '../data'

type Tab = 'chamados' | 'saidas' | 'entradas'

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const CATEGORY_LABELS: Record<string, string> = {
  combustivel: 'Combustível', material: 'Material', alimentacao: 'Alimentação',
  salario: 'Salário', aluguel: 'Aluguel', manutencao: 'Manutenção', outros: 'Outros',
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  aprovado: { label: 'Aprovado',  color: '#10b981' },
  agendado: { label: 'Agendado',  color: '#3b82f6' },
  aberto:   { label: 'Em aberto', color: '#f59e0b' },
}

export default function DemoRelatorios() {
  const [tab, setTab] = useState<Tab>('chamados')

  // Chamados stats
  const totalCalls    = MOCK_CALLS.length
  const byStatus      = MOCK_CALLS.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc }, {} as Record<string, number>)
  const byOrigin      = MOCK_CALLS.reduce((acc, c) => { acc[c.origin] = (acc[c.origin] || 0) + 1; return acc }, {} as Record<string, number>)
  const byCategory    = MOCK_CALLS.reduce((acc, c) => { if (c.service_category) { acc[c.service_category] = (acc[c.service_category] || 0) + 1 }; return acc }, {} as Record<string, number>)
  const grossRevenue  = MOCK_CALLS.filter(c => c.total_value).reduce((s, c) => s + (c.total_value ?? 0), 0)

  // Saídas stats
  const totalExp      = MOCK_EXPENSES.reduce((s, e) => s + e.amount, 0)
  const paidExp       = MOCK_EXPENSES.filter(e => e.status === 'pago').reduce((s, e) => s + e.amount, 0)
  const catTotals     = MOCK_EXPENSES.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc }, {} as Record<string, number>)

  // Entradas stats
  const totalEnt      = MOCK_ENTRADAS.reduce((s, e) => s + e.amount, 0)
  const paidEnt       = MOCK_ENTRADAS.filter(e => e.status === 'pago').reduce((s, e) => s + e.amount, 0)

  const ORIGIN_LABELS: Record<string, string> = {
    whatsapp: 'WhatsApp', telefone: 'Telefone', indicacao: 'Indicação', instagram: 'Instagram', site: 'Site',
  }

  const tabs = [
    { key: 'chamados' as Tab, label: 'Chamados',  icon: <PhoneCall className="w-4 h-4" /> },
    { key: 'saidas' as Tab,   label: 'Saídas',    icon: <TrendingDown className="w-4 h-4" /> },
    { key: 'entradas' as Tab, label: 'Entradas',  icon: <TrendingUp className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.1)' }}>
          <BarChart3 className="w-5 h-5" style={{ color: '#2563eb' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Relatórios</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Julho de 2026 · Demonstração</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--surface-secondary)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={tab === t.key
              ? { background: 'var(--surface)', color: '#2563eb', boxShadow: 'var(--shadow-sm)' }
              : { color: 'var(--text-secondary)' }}>
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* CHAMADOS */}
      {tab === 'chamados' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Total de Chamados</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{totalCalls}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Receita Total</p>
              <p className="text-lg font-bold mt-1 text-emerald-600">{fmt(grossRevenue)}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Taxa de Aprovação</p>
              <p className="text-2xl font-bold mt-1" style={{ color: '#10b981' }}>
                {Math.round((byStatus.aprovado || 0) / totalCalls * 100)}%
              </p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Ticket Médio</p>
              <p className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                {fmt(grossRevenue / (byStatus.aprovado || 1))}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* By status */}
            <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Por Status</p>
              {Object.entries(byStatus).map(([status, count]) => {
                const s = STATUS_LABELS[status]
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: s?.color ?? 'var(--text-primary)' }}>{s?.label ?? status}</span>
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{count}</span>
                  </div>
                )
              })}
            </div>

            {/* By origin */}
            <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Por Origem</p>
              {Object.entries(byOrigin).sort((a, b) => b[1] - a[1]).map(([origin, count]) => (
                <div key={origin} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{ORIGIN_LABELS[origin] ?? origin}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{count}</span>
                </div>
              ))}
            </div>

            {/* By service */}
            <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Por Tipo de Serviço</p>
              {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{cat}</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Call list */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Detalhamento de Chamados</p>
            </div>
            {MOCK_CALLS.map(call => {
              const s = STATUS_LABELS[call.status]
              return (
                <div key={call.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{call.contact_name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(call.date + 'T12:00:00').toLocaleDateString('pt-BR')} · {call.service_category}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {call.total_value && <p className="text-sm font-semibold text-emerald-600">{fmt(call.total_value)}</p>}
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: s?.color, background: `${s?.color}18` }}>{s?.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SAÍDAS */}
      {tab === 'saidas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total',    value: totalExp,         color: 'var(--text-primary)' },
              { label: 'Pago',     value: paidExp,          color: '#10b981' },
              { label: 'Pendente', value: totalExp - paidExp, color: '#f59e0b' },
            ].map(c => (
              <div key={c.label} className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{c.label}</p>
                <p className="text-sm font-bold mt-1 break-all" style={{ color: c.color }}>{fmt(c.value)}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Por Categoria</p>
            {Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([cat, val]) => {
              const pct = Math.round(val / totalExp * 100)
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{CATEGORY_LABELS[cat] ?? cat}</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(val)} <span className="text-xs font-normal opacity-60">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#2563eb' }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="space-y-2">
            {MOCK_EXPENSES.map(exp => (
              <div key={exp.id} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{exp.description}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(exp.due_date + 'T12:00:00').toLocaleDateString('pt-BR')} · {CATEGORY_LABELS[exp.category] ?? exp.category}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(exp.amount)}</p>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={exp.status === 'pago'
                      ? { background: 'rgba(16,185,129,0.1)', color: '#10b981' }
                      : { background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                    {exp.status === 'pago' ? 'Pago' : 'Pendente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ENTRADAS */}
      {tab === 'entradas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total',    value: totalEnt,            color: 'var(--text-primary)' },
              { label: 'Recebido', value: paidEnt,             color: '#10b981' },
              { label: 'Pendente', value: totalEnt - paidEnt,  color: '#f59e0b' },
            ].map(c => (
              <div key={c.label} className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{c.label}</p>
                <p className="text-sm font-bold mt-1 break-all" style={{ color: c.color }}>{fmt(c.value)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {MOCK_ENTRADAS.map(ce => (
              <div key={ce.id} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{ce.description}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(ce.due_date + 'T12:00:00').toLocaleDateString('pt-BR')} · {ce.entry_type}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-emerald-600">{fmt(ce.amount)}</p>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={ce.status === 'pago'
                      ? { background: 'rgba(16,185,129,0.1)', color: '#10b981' }
                      : { background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                    {ce.status === 'pago' ? 'Recebido' : 'Pendente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
