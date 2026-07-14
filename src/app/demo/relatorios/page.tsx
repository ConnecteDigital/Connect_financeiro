'use client'

import { useState } from 'react'
import { TrendingDown, TrendingUp, PhoneCall } from 'lucide-react'
import { MOCK_CALLS, MOCK_EXPENSES, MOCK_ENTRADAS } from '../data'

type Tab = 'chamados' | 'saidas' | 'entradas'

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const ORIGIN_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp', telefone: 'Telefone', indicacao: 'Indicação', instagram: 'Instagram', site: 'Site',
}

const CATEGORY_LABELS: Record<string, string> = {
  combustivel: 'Combustível', material: 'Material', alimentacao: 'Alimentação',
  salario: 'Salário', aluguel: 'Aluguel', manutencao: 'Manutenção', outros: 'Outros',
}

const WEEK_LABELS = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4']
const WEEK_VALUES = [3200, 5800, 4100, 7500]
const maxWeek = Math.max(...WEEK_VALUES)

export default function DemoRelatorios() {
  const [tab, setTab] = useState<Tab>('chamados')
  const [originFilter, setOriginFilter] = useState('todos')
  const [serviceFilter, setServiceFilter] = useState('todos')

  // Chamados stats
  const totalCalls    = MOCK_CALLS.length
  const aprovados     = MOCK_CALLS.filter(c => c.status === 'aprovado').length
  const agendados     = MOCK_CALLS.filter(c => c.status === 'agendado').length
  const naoQuis       = MOCK_CALLS.filter(c => c.status === 'nao_quis_visita').length
  const naoAprovou    = MOCK_CALLS.filter(c => c.status === 'nao_aprovou').length
  const cancelados    = MOCK_CALLS.filter(c => c.status === 'cancelado').length
  const aprovPct      = totalCalls > 0 ? Math.round(aprovados / totalCalls * 100) : 0

  const grossRevenue  = MOCK_CALLS.filter(c => c.total_value).reduce((s, c) => s + (c.total_value ?? 0), 0)
  const netRevenue    = grossRevenue * 0.78
  const recebido      = grossRevenue * 0.65
  const aReceber      = grossRevenue - recebido

  const byOrigin      = MOCK_CALLS.reduce((acc, c) => { acc[c.origin] = (acc[c.origin] || 0) + 1; return acc }, {} as Record<string, number>)
  const byCategory    = MOCK_CALLS.reduce((acc, c) => { if (c.service_category) { acc[c.service_category] = (acc[c.service_category] || 0) + 1 }; return acc }, {} as Record<string, number>)

  const origins = Object.keys(byOrigin)
  const services = Object.keys(byCategory)

  let filteredCalls = MOCK_CALLS
  if (originFilter !== 'todos') filteredCalls = filteredCalls.filter(c => c.origin === originFilter)
  if (serviceFilter !== 'todos') filteredCalls = filteredCalls.filter(c => c.service_category === serviceFilter)

  // Saídas stats
  const totalExp  = MOCK_EXPENSES.reduce((s, e) => s + e.amount, 0)
  const paidExp   = MOCK_EXPENSES.filter(e => e.status === 'pago').reduce((s, e) => s + e.amount, 0)
  const catTotals = MOCK_EXPENSES.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc }, {} as Record<string, number>)

  // Entradas stats
  const totalEnt = MOCK_ENTRADAS.reduce((s, e) => s + e.amount, 0)
  const paidEnt  = MOCK_ENTRADAS.filter(e => e.status === 'pago').reduce((s, e) => s + e.amount, 0)

  const tabs = [
    { key: 'chamados' as Tab, label: 'Chamados',  icon: <PhoneCall className="w-4 h-4" /> },
    { key: 'saidas' as Tab,   label: 'Saídas',    icon: <TrendingDown className="w-4 h-4" /> },
    { key: 'entradas' as Tab, label: 'Entradas',  icon: <TrendingUp className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Relatórios</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Análise completa do desempenho financeiro e operacional</p>
        </div>
        <span className="text-xs font-medium px-3 py-1.5 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          Julho 2026
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--surface-secondary)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={tab === t.key
              ? { background: 'var(--surface)', color: '#2563eb', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
              : { color: 'var(--text-secondary)' }}>
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* CHAMADOS */}
      {tab === 'chamados' && (
        <div className="space-y-4">
          {/* Origin filter chips */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>ORIGEM</p>
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setOriginFilter('todos')}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition"
                style={originFilter === 'todos'
                  ? { background: '#2563eb', color: '#fff' }
                  : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                Todos
              </button>
              {origins.map(o => (
                <button key={o} onClick={() => setOriginFilter(o)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition"
                  style={originFilter === o
                    ? { background: '#2563eb', color: '#fff' }
                    : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  {ORIGIN_LABELS[o] ?? o}
                </button>
              ))}
            </div>
          </div>

          {/* Service type filter chips */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>TIPO DE SERVIÇO</p>
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setServiceFilter('todos')}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition"
                style={serviceFilter === 'todos'
                  ? { background: '#2563eb', color: '#fff' }
                  : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                Todos
              </button>
              {services.map(s => (
                <button key={s} onClick={() => setServiceFilter(s)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition"
                  style={serviceFilter === s
                    ? { background: '#2563eb', color: '#fff' }
                    : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* 7 stat cards */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {[
              { label: 'TOTAL',        value: totalCalls,  color: 'var(--text-primary)', big: true },
              { label: 'APROVADOS',    value: aprovados,   color: '#10b981', big: true },
              { label: 'AGENDADOS',    value: agendados,   color: '#3b82f6', big: true },
              { label: 'NÃO QUIS',     value: naoQuis,     color: '#71717a', big: true },
              { label: 'NÃO APROVOU',  value: naoAprovou,  color: '#f59e0b', big: true },
              { label: 'CANCELADOS',   value: cancelados,  color: '#ef4444', big: true },
              { label: 'APROVAÇÃO %',  value: `${aprovPct}%`, color: '#10b981', big: false },
            ].map(c => (
              <div key={c.label} className="rounded-2xl p-3 text-center col-span-2 sm:col-span-1 last:col-span-2 sm:last:col-span-1"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-[9px] font-bold uppercase tracking-wide leading-tight mb-1" style={{ color: 'var(--text-secondary)' }}>{c.label}</p>
                <p className="text-xl font-bold" style={{ color: c.color }}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* 4 revenue cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'RECEITA BRUTA',   value: grossRevenue, color: '#2563eb' },
              { label: 'RECEITA LÍQUIDA', value: netRevenue,   color: '#10b981' },
              { label: 'RECEBIDO',        value: recebido,     color: '#10b981' },
              { label: 'A RECEBER',       value: aReceber,     color: '#f59e0b' },
            ].map(c => (
              <div key={c.label} className="rounded-2xl p-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{c.label}</p>
                <p className="text-base font-bold mt-1 leading-tight" style={{ color: c.color }}>{fmt(c.value)}</p>
              </div>
            ))}
          </div>

          {/* Weekly bar chart */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Receita por Semana</p>
            <div className="flex items-end gap-3 h-28">
              {WEEK_LABELS.map((label, i) => {
                const pct = (WEEK_VALUES[i] / maxWeek) * 100
                return (
                  <div key={label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-semibold" style={{ color: '#2563eb' }}>
                      {fmt(WEEK_VALUES[i]).replace('R$ ', 'R$')}
                    </span>
                    <div className="w-full rounded-t-lg" style={{ height: `${pct * 0.72}px`, background: '#2563eb', opacity: 0.85 + i * 0.05 }} />
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Filtered call list */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Detalhamento ({filteredCalls.length})
              </p>
            </div>
            {filteredCalls.map(call => {
              const statusColor = call.status === 'aprovado' ? '#10b981' : call.status === 'agendado' ? '#3b82f6' : '#f59e0b'
              const statusLabel = call.status === 'aprovado' ? 'Aprovado' : call.status === 'agendado' ? 'Agendado' : 'Em aberto'
              return (
                <div key={call.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{call.contact_name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(call.date + 'T12:00:00').toLocaleDateString('pt-BR')} · {call.service_category}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {call.total_value && <p className="text-sm font-semibold text-emerald-600">{fmt(call.total_value)}</p>}
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ color: statusColor, background: `${statusColor}18` }}>
                      {statusLabel}
                    </span>
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
              { label: 'Total',    value: totalExp,          color: 'var(--text-primary)' },
              { label: 'Pago',     value: paidExp,           color: '#10b981' },
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
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-secondary)' }}>
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
              { label: 'Total',    value: totalEnt,           color: 'var(--text-primary)' },
              { label: 'Recebido', value: paidEnt,            color: '#10b981' },
              { label: 'Pendente', value: totalEnt - paidEnt, color: '#f59e0b' },
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
