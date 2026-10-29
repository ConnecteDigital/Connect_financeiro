'use client'

import { useEffect, useState } from 'react'
import { Wallet, CheckCircle2, Clock } from 'lucide-react'
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

  const cutoff = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return localDate(d) })()
  const last30 = entries.filter(e => e.due_date >= cutoff)

  const total = last30.reduce((s, e) => s + Number(e.amount || 0), 0)
  const paid = last30.filter(e => e.status === 'pago').reduce((s, e) => s + Number(e.amount || 0), 0)
  const pending = total - paid

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Minha Comissão</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Últimos 30 dias</p>
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
        ) : last30.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-400">Nenhuma comissão nos últimos 30 dias</p>
        ) : (
          <div className="divide-y divide-zinc-50">
            {last30.map(e => (
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
