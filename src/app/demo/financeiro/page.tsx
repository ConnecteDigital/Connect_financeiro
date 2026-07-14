'use client'

import { useState } from 'react'
import { Wallet, TrendingDown, TrendingUp, BarChart3 } from 'lucide-react'
import { MOCK_EXPENSES, MOCK_ENTRADAS } from '../data'

type Tab = 'saidas' | 'entradas' | 'saldo'

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const CATEGORY_LABELS: Record<string, string> = {
  combustivel: 'Combustível', material: 'Material', alimentacao: 'Alimentação',
  salario: 'Salário', aluguel: 'Aluguel', manutencao: 'Manutenção', outros: 'Outros',
}

export default function DemoFinanceiro() {
  const [activeTab, setActiveTab] = useState<Tab>('saidas')

  const totalExp    = MOCK_EXPENSES.reduce((s, e) => s + e.amount, 0)
  const paidExp     = MOCK_EXPENSES.filter(e => e.status === 'pago').reduce((s, e) => s + e.amount, 0)
  const pendingExp  = MOCK_EXPENSES.filter(e => e.status === 'pendente').reduce((s, e) => s + e.amount, 0)

  const totalEnt    = MOCK_ENTRADAS.reduce((s, e) => s + e.amount, 0)
  const paidEnt     = MOCK_ENTRADAS.filter(e => e.status === 'pago').reduce((s, e) => s + e.amount, 0)
  const pendingEnt  = MOCK_ENTRADAS.filter(e => e.status === 'pendente').reduce((s, e) => s + e.amount, 0)

  const saldo = paidEnt - paidExp

  const catTotals = MOCK_EXPENSES.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount; return acc
  }, {} as Record<string, number>)

  const tabs = [
    { key: 'saidas' as Tab,   label: 'Saídas',   icon: <TrendingDown className="w-4 h-4" /> },
    { key: 'entradas' as Tab, label: 'Entradas',  icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'saldo' as Tab,    label: 'Saldo',     icon: <BarChart3 className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.1)' }}>
          <Wallet className="w-5 h-5" style={{ color: '#2563eb' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Financeiro</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Julho de 2026 · Demonstração</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--surface-secondary)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={activeTab === t.key
              ? { background: 'var(--surface)', color: '#2563eb', boxShadow: 'var(--shadow-sm)' }
              : { color: 'var(--text-secondary)' }}>
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* SAÍDAS */}
      {activeTab === 'saidas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total',    value: totalExp,   color: 'var(--text-primary)' },
              { label: 'Pago',     value: paidExp,    color: '#10b981' },
              { label: 'Pendente', value: pendingExp,  color: '#f59e0b' },
            ].map(c => (
              <div key={c.label} className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{c.label}</p>
                <p className="text-sm font-bold mt-1 break-all" style={{ color: c.color }}>{fmt(c.value)}</p>
              </div>
            ))}
          </div>

          {/* Category summary */}
          <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Por Categoria</p>
            {Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{CATEGORY_LABELS[cat] ?? cat}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(val)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {MOCK_EXPENSES.map(exp => (
              <div key={exp.id} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{exp.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(exp.due_date + 'T12:00:00').toLocaleDateString('pt-BR')} · {CATEGORY_LABELS[exp.category] ?? exp.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(exp.amount)}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-lg"
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
      {activeTab === 'entradas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total',    value: totalEnt,   color: 'var(--text-primary)' },
              { label: 'Recebido', value: paidEnt,    color: '#10b981' },
              { label: 'Pendente', value: pendingEnt, color: '#f59e0b' },
            ].map(c => (
              <div key={c.label} className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{c.label}</p>
                <p className="text-sm font-bold mt-1 break-all" style={{ color: c.color }}>{fmt(c.value)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {MOCK_ENTRADAS.map(ce => (
              <div key={ce.id} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{ce.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(ce.due_date + 'T12:00:00').toLocaleDateString('pt-BR')} · {ce.entry_type}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600 flex-shrink-0">{fmt(ce.amount)}</p>
                </div>
                <div className="mt-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-lg"
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

      {/* SALDO */}
      {activeTab === 'saldo' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Entradas Recebidas</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{fmt(paidEnt)}</p>
            </div>
            <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-5 h-5 text-red-500" />
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Saídas Pagas</p>
              </div>
              <p className="text-2xl font-bold text-red-500">{fmt(paidExp)}</p>
            </div>
            <div className="rounded-2xl p-5 sm:col-span-2" style={{
              background: saldo >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${saldo >= 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
            }}>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5" style={{ color: saldo >= 0 ? '#10b981' : '#ef4444' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Saldo Líquido do Mês</p>
              </div>
              <p className="text-3xl font-bold" style={{ color: saldo >= 0 ? '#10b981' : '#ef4444' }}>{fmt(saldo)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
