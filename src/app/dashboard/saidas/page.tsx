'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, CheckCircle, Clock, AlertCircle, TrendingDown, Repeat } from 'lucide-react'
import Link from 'next/link'
import { getExpenses, updateExpense } from '@/lib/db/expenses'

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
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
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

  const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  const totalPago = expenses.filter(e => e.status === 'pago').reduce((s, e) => s + Number(e.amount), 0)
  const totalPendente = expenses.filter(e => e.status === 'pendente').reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Saídas</h1>
          <p className="text-slate-500 text-sm mt-0.5">Controle de despesas fixas e variáveis</p>
        </div>
        <Link href="/dashboard/saidas/novo"
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">
          <Plus className="w-4 h-4" />
          Lançar Saída
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase mb-2">
            <TrendingDown className="w-3.5 h-3.5" /> Total
          </div>
          <p className="text-xl font-bold text-slate-800">{fmt(totalPago + totalPendente)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium uppercase mb-2">
            <CheckCircle className="w-3.5 h-3.5" /> Pago
          </div>
          <p className="text-xl font-bold text-emerald-600">{fmt(totalPago)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-medium uppercase mb-2">
            <AlertCircle className="w-3.5 h-3.5" /> Pendente
          </div>
          <p className="text-xl font-bold text-amber-600">{fmt(totalPendente)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Buscar despesa..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(['todos', 'fixo', 'avulso'] as const).map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${typeFilter === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {t === 'todos' ? 'Todos' : t === 'fixo' ? 'Fixos' : 'Avulsos'}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(['todos', 'pago', 'pendente'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${statusFilter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {s === 'todos' ? 'Todos' : s === 'pago' ? 'Pago' : 'Pendente'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Descrição</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Fornecedor / Cliente</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Tipo</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Vencimento</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Valor</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  </td></tr>
                ))
              ) : expenses.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">
                  Nenhuma saída encontrada
                </td></tr>
              ) : expenses.map(e => (
                <tr key={e.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {e.type === 'fixo' && <Repeat className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                      <span className="text-sm font-medium text-slate-800">{e.description}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {e.supplier?.name && (
                        <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded w-fit">{e.supplier.name}</span>
                      )}
                      {e.client?.name && (
                        <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded w-fit">{e.client.name}</span>
                      )}
                      {!e.supplier?.name && !e.client?.name && (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${e.type === 'fixo' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                      {e.type === 'fixo' ? 'Fixo' : 'Avulso'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {new Date(e.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800">{fmt(e.amount)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(e.id, e.status)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                        e.status === 'pago'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      }`}>
                      {e.status === 'pago' ? <><CheckCircle className="w-3 h-3" /> Pago</> : <><Clock className="w-3 h-3" /> Pendente</>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/saidas/${e.id}/editar`} className="text-xs text-slate-400 hover:text-slate-600 transition">Editar</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

