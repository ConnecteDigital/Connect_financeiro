'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, CheckCircle, Clock, AlertCircle, TrendingDown, Repeat, Trash2, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { getExpenses, updateExpense, deleteExpense } from '@/lib/db/expenses'

export default function SaidasPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'todos' | 'fixo' | 'avulso'>('todos')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pago' | 'pendente'>('todos')
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getExpenses({ type: typeFilter, status: statusFilter, search })
      setExpenses(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [typeFilter, statusFilter, search])

  useEffect(() => { load() }, [load])

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'pago' ? 'pendente' : 'pago'
    await updateExpense(id, {
      status: newStatus,
      paid_date: newStatus === 'pago' ? new Date().toISOString().split('T')[0] : null,
    })
    load()
  }

  async function handleDelete(id: string, description: string) {
    if (!confirm(`Apagar a saída "${description}"? Essa ação não pode ser desfeita.`)) return
    try {
      await deleteExpense(id)
      load()
    } catch (e) {
      console.error(e)
      alert('Erro ao apagar saída.')
    }
  }

  const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const totalPago = expenses.filter(e => e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
  const totalPendente = expenses.filter(e => e.status === 'pendente').reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div className="space-y-4 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="hidden sm:block">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Saídas</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Controle de despesas fixas e variáveis</p>
        </div>
        <Link href="/dashboard/saidas/novo" className="btn-primary ml-auto">
          <Plus className="w-4 h-4" /> Lançar Saída
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: fmt(totalPago + totalPendente), color: 'var(--text-primary)', bg: 'var(--surface)', icon: TrendingDown, iconColor: 'var(--text-secondary)' },
          { label: 'Pago', value: fmt(totalPago), color: '#16a34a', bg: 'rgba(22,163,74,0.10)', icon: CheckCircle, iconColor: '#16a34a' },
          { label: 'Pendente', value: fmt(totalPendente), color: '#d97706', bg: 'rgba(217,119,6,0.10)', icon: AlertCircle, iconColor: '#d97706' },
        ].map((c, i) => (
          <div key={i} className="rounded-2xl p-3 sm:p-4" style={{ background: c.bg, boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <c.icon className="w-3.5 h-3.5" style={{ color: c.iconColor }} />
              <span className="text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>{c.label}</span>
            </div>
            <p className="font-bold text-sm sm:text-base tabular" style={{ color: c.color }}>{loading ? '—' : c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
          {/* .input-field define padding próprio e ganharia do pl-9 — força via style */}
          <input type="text" placeholder="Buscar despesa..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field py-2.5 text-sm" style={{ paddingLeft: 38 }} />
        </div>
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--surface-secondary)' }}>
          {(['todos', 'fixo', 'avulso'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
              style={typeFilter === t ? { background: 'var(--surface)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' } : { color: 'var(--text-secondary)' }}>
              {t === 'todos' ? 'Todos' : t === 'fixo' ? 'Fixos' : 'Avulsos'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--surface-secondary)' }}>
          {(['todos', 'pago', 'pendente'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
              style={statusFilter === s ? { background: 'var(--surface)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' } : { color: 'var(--text-secondary)' }}>
              {s === 'todos' ? 'Todos' : s === 'pago' ? 'Pago' : 'Pendente'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'var(--surface)' }}>
              <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-40 rounded-lg" />
                <div className="skeleton h-3 w-24 rounded-lg" />
              </div>
              <div className="skeleton h-5 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--surface)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Nenhuma saída encontrada</p>
        </div>
      ) : (
        /* Mobile: cards / Desktop: also cards (consistent) */
        <div className="space-y-2">
          {expenses.map(e => (
            <div key={e.id}
              className="rounded-2xl p-4 flex items-start gap-3 transition"
              style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>

              {/* Icon */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: e.type === 'fixo' ? 'rgba(139,92,246,0.1)' : 'rgba(0,0,0,0.05)' }}>
                {e.type === 'fixo'
                  ? <Repeat className="w-4 h-4" style={{ color: '#7c3aed' }} />
                  : <TrendingDown className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                }
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {e.description}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {e.supplier?.name && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>{e.supplier.name}</span>
                  )}
                  {e.client?.name && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>{e.client.name}</span>
                  )}
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {new Date(e.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Right side */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <p className="font-bold text-sm tabular" style={{ color: 'var(--text-primary)' }}>{fmt(e.amount)}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleStatus(e.id, e.status)}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition"
                    style={e.status === 'pago'
                      ? { background: 'rgba(22,163,74,0.15)', color: '#16a34a' }
                      : { background: 'rgba(217,119,6,0.15)', color: '#d97706' }
                    }>
                    {e.status === 'pago' ? <><CheckCircle className="w-3 h-3" /> Pago</> : <><Clock className="w-3 h-3" /> Pendente</>}
                  </button>
                  <Link href={`/dashboard/saidas/${e.id}/editar`}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition"
                    style={{ background: 'var(--surface-secondary)' }}>
                    <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                  </Link>
                  <button onClick={() => handleDelete(e.id, e.description)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition"
                    style={{ background: 'rgba(239,68,68,0.12)' }}>
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
