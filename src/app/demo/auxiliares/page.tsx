'use client'

import { UserCog, TrendingUp, CheckCircle2 } from 'lucide-react'
import { MOCK_AUXILIARIES } from '../data'

const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

export default function DemoAuxiliares() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.1)' }}>
          <UserCog className="w-5 h-5" style={{ color: '#2563eb' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Comissões</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Julho de 2026 · Demonstração</p>
        </div>
      </div>

      <div className="space-y-3">
        {MOCK_AUXILIARIES.map(aux => (
          <div key={aux.id} className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ background: '#2563eb' }}>
                  {aux.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{aux.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {aux.type.charAt(0).toUpperCase() + aux.type.slice(1)} · {aux.percentage}% de comissão
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(aux.total_earned)}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{aux.call_count} chamados</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.08)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <p className="text-xs font-medium text-emerald-600">Pago</p>
                </div>
                <p className="text-sm font-bold text-emerald-600">{fmt(aux.paid_earned)}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.08)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                  <p className="text-xs font-medium text-amber-600">A Pagar</p>
                </div>
                <p className="text-sm font-bold text-amber-600">{fmt(aux.unpaid_earned)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
