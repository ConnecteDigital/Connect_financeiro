'use client'

import { useState } from 'react'
import { Wallet, TrendingDown, TrendingUp, BarChart3, Search, Download, FileText, Plus } from 'lucide-react'
import { MOCK_EXPENSES, MOCK_ENTRADAS } from '../data'

type Tab = 'saidas' | 'entradas' | 'boletos' | 'saldo'

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const CATEGORY_LABELS: Record<string, string> = {
  combustivel: 'Combustível', material: 'Material', alimentacao: 'Alimentação',
  salario: 'Salário', aluguel: 'Aluguel', manutencao: 'Manutenção', outros: 'Outros',
}

// Mock boletos
const MOCK_BOLETOS = [
  { id: 'b1', description: 'Fornecedor Hidráulica Total', amount: 720,  due_date: '2026-07-20', status: 'pendente' },
  { id: 'b2', description: 'Aluguel do galpão',           amount: 1500, due_date: '2026-07-10', status: 'pago' },
]

export default function DemoFinanceiro() {
  const [activeTab, setActiveTab] = useState<Tab>('saidas')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')

  const totalExp   = MOCK_EXPENSES.reduce((s, e) => s + e.amount, 0)
  const paidExp    = MOCK_EXPENSES.filter(e => e.status === 'pago').reduce((s, e) => s + e.amount, 0)
  const pendingExp = MOCK_EXPENSES.filter(e => e.status === 'pendente').reduce((s, e) => s + e.amount, 0)

  const totalEnt   = MOCK_ENTRADAS.reduce((s, e) => s + e.amount, 0)
  const paidEnt    = MOCK_ENTRADAS.filter(e => e.status === 'pago').reduce((s, e) => s + e.amount, 0)
  const pendingEnt = MOCK_ENTRADAS.filter(e => e.status === 'pendente').reduce((s, e) => s + e.amount, 0)

  const saldo = paidEnt - paidExp

  const catTotals = MOCK_EXPENSES.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount; return acc
  }, {} as Record<string, number>)

  const filteredExp = MOCK_EXPENSES.filter(e => {
    const catOk = catFilter === 'todos' || e.category === catFilter
    const statusOk = statusFilter === 'todos' || e.status === statusFilter
    const searchOk = !search || e.description.toLowerCase().includes(search.toLowerCase())
    return catOk && statusOk && searchOk
  })

  const filteredEnt = MOCK_ENTRADAS.filter(e => {
    const statusOk = statusFilter === 'todos' || e.status === statusFilter
    const searchOk = !search || e.description.toLowerCase().includes(search.toLowerCase())
    return statusOk && searchOk
  })

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'saidas',   label: 'Saídas',   icon: <TrendingDown className="w-4 h-4" /> },
    { key: 'entradas', label: 'Entradas', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'boletos',  label: 'Boletos',  icon: <FileText className="w-4 h-4" /> },
    { key: 'saldo',    label: 'Saldo',    icon: <BarChart3 className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Financeiro</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Gerencie saídas, entradas, boletos e saldo</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button disabled className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white opacity-40 cursor-not-allowed"
            style={{ background: '#2563eb' }}>
            <Plus className="w-3.5 h-3.5" />
            Nova Saída
          </button>
          <button disabled className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white opacity-40 cursor-not-allowed"
            style={{ background: '#10b981' }}>
            <Plus className="w-3.5 h-3.5" />
            Nova Entrada
          </button>
          <div className="px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: 'var(--surface-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            📅 jul/2026
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'var(--surface-secondary)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); setSearch(''); setCatFilter('todos'); setStatusFilter('todos') }}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={activeTab === t.key
              ? { background: 'var(--surface)', color: 'var(--primary)', boxShadow: 'var(--shadow-sm)' }
              : { color: 'var(--text-secondary)' }}>
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* SAÍDAS */}
      {activeTab === 'saidas' && (
        <div className="space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total',    value: totalExp,   color: 'var(--text-primary)' },
              { label: 'Pago',     value: paidExp,    color: '#10b981' },
              { label: 'Pendente', value: pendingExp, color: '#f59e0b' },
            ].map(c => (
              <div key={c.label} className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{c.label}</p>
                <p className="text-sm font-bold mt-1 break-all" style={{ color: c.color }}>{fmt(c.value)}</p>
              </div>
            ))}
          </div>

          {/* Count + PDF button */}
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{filteredExp.length} saídas</p>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <Download className="w-3.5 h-3.5" />
              PDF
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            <input type="text" placeholder="Buscar descrição..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 py-2 text-sm w-full" />
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="flex-1 min-w-[140px] text-sm rounded-xl px-3 py-2 border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <option value="todos">Todas as categorias</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="flex-1 min-w-[120px] text-sm rounded-xl px-3 py-2 border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <option value="todos">Todos os status</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>

          {/* Category summary */}
          <div className="rounded-2xl p-4 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Por Categoria (Período)</p>
            {Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{CATEGORY_LABELS[cat] ?? cat}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(val)}</span>
              </div>
            ))}
          </div>

          {/* Expense list */}
          <div className="space-y-2">
            {filteredExp.map(exp => (
              <div key={exp.id} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{exp.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      Venc. {new Date(exp.due_date + 'T12:00:00').toLocaleDateString('pt-BR')} · {CATEGORY_LABELS[exp.category] ?? exp.category}
                    </p>
                  </div>
                  <p className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--text-primary)' }}>{fmt(exp.amount)}</p>
                </div>
                <div className="mt-2">
                  <span className="text-xs font-semibold px-2 py-1 rounded-lg cursor-default"
                    style={exp.status === 'pago'
                      ? { background: 'rgba(16,185,129,0.1)', color: '#10b981' }
                      : { background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                    {exp.status === 'pago' ? '✓ Pago — clique para pendente' : '⏳ Pendente — clique para pago'}
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
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{c.label}</p>
                <p className="text-sm font-bold mt-1 break-all" style={{ color: c.color }}>{fmt(c.value)}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{filteredEnt.length} entradas</p>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <Download className="w-3.5 h-3.5" />
              PDF
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            <input type="text" placeholder="Buscar descrição..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 py-2 text-sm w-full" />
          </div>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="w-full text-sm rounded-xl px-3 py-2 border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
            <option value="todos">Todos os status</option>
            <option value="pago">Recebido</option>
            <option value="pendente">Pendente</option>
          </select>

          <div className="space-y-2">
            {filteredEnt.map(ce => (
              <div key={ce.id} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{ce.description}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      Venc. {new Date(ce.due_date + 'T12:00:00').toLocaleDateString('pt-BR')} · {ce.entry_type}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600 flex-shrink-0">{fmt(ce.amount)}</p>
                </div>
                <div className="mt-2">
                  <span className="text-xs font-semibold px-2 py-1 rounded-lg cursor-default"
                    style={ce.status === 'pago'
                      ? { background: 'rgba(16,185,129,0.1)', color: '#10b981' }
                      : { background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                    {ce.status === 'pago' ? '✓ Recebido — clique para pendente' : '⏳ Pendente — clique para recebido'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOLETOS */}
      {activeTab === 'boletos' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Total boletos</p>
              <p className="text-sm font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{fmt(MOCK_BOLETOS.reduce((s, b) => s + b.amount, 0))}</p>
            </div>
            <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Pendente</p>
              <p className="text-sm font-bold mt-1" style={{ color: '#f59e0b' }}>{fmt(MOCK_BOLETOS.filter(b => b.status === 'pendente').reduce((s, b) => s + b.amount, 0))}</p>
            </div>
          </div>
          {MOCK_BOLETOS.map(b => (
            <div key={b.id} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{b.description}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Venc. {new Date(b.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <p className="text-sm font-bold flex-shrink-0" style={{ color: 'var(--text-primary)' }}>{fmt(b.amount)}</p>
              </div>
              <div className="mt-2">
                <span className="text-xs font-semibold px-2 py-1 rounded-lg"
                  style={b.status === 'pago'
                    ? { background: 'rgba(16,185,129,0.1)', color: '#10b981' }
                    : { background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                  {b.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                </span>
              </div>
            </div>
          ))}
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
