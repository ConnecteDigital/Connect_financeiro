'use client'

import { useEffect, useState } from 'react'
import { Wallet, CheckCircle2, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { getExpenses } from '@/lib/db/expenses'

const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

function localDate(d?: Date): string {
  const dt = d ?? new Date()
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export default function ComissaoPage() {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<any[]>([])

  useEffect(() => {
    getExpenses()
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Comissão é sempre de UM mês (pela data de vencimento): virou o mês,
  // começa do zero. Os meses anteriores ficam na seta ‹; não passa do atual.
  const [monthOffset, setMonthOffset] = useState(0)
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const start = localDate(first)
  const end = localDate(new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0))
  const monthLabel = first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const monthEntries = entries
    .filter(e => e.due_date >= start && e.due_date <= end)
    .sort((a, b) => String(b.due_date).localeCompare(String(a.due_date)))

  const sum = (list: any[]) => list.reduce((s, e) => s + Number(e.amount || 0), 0)
  const total = sum(monthEntries)
  const paid = sum(monthEntries.filter(e => e.status === 'pago'))
  const pending = sum(monthEntries.filter(e => e.status === 'pendente'))

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Minha Comissão</h1>
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl border border-zinc-100 px-4 py-2.5 shadow-sm">
        <button onClick={() => setMonthOffset(o => o - 1)} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="font-semibold text-zinc-800 capitalize text-sm">{monthLabel}</p>
        <button onClick={() => setMonthOffset(o => Math.min(0, o + 1))} disabled={monthOffset === 0}
          className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 disabled:opacity-30">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm">
          <Wallet className="w-5 h-5 mb-2" style={{ color: 'var(--primary)' }} />
          <p className="text-zinc-400 text-xs font-medium">Total</p>
          <p className="text-lg font-bold text-zinc-900 mt-0.5">{loading ? '—' : fmt(total)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm">
          <CheckCircle2 className="w-5 h-5 mb-2 text-emerald-500" />
          <p className="text-zinc-400 text-xs font-medium">Pago</p>
          <p className="text-lg font-bold text-emerald-600 mt-0.5">{loading ? '—' : fmt(paid)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm">
          <Clock className="w-5 h-5 mb-2 text-amber-500" />
          <p className="text-zinc-400 text-xs font-medium">A receber</p>
          <p className="text-lg font-bold text-amber-600 mt-0.5">{loading ? '—' : fmt(pending)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <p className="px-4 py-3 border-b border-zinc-100 text-sm font-semibold text-zinc-700">Serviços comissionados</p>
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-zinc-50 rounded-lg animate-pulse" />)}
          </div>
        ) : monthEntries.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-400">Nenhuma comissão neste mês</p>
        ) : (
          <div className="divide-y divide-zinc-50">
            {monthEntries.map(e => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{e.description}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{new Date(e.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-sm font-bold text-zinc-800">{fmt(e.amount)}</p>
                  <span className={`text-xs font-semibold ${e.status === 'pago' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {e.status === 'pago' ? 'Pago' : 'Pendente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
