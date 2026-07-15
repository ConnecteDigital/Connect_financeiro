'use client'

import { useState } from 'react'
import { CheckCircle2, TrendingUp, UserCog } from 'lucide-react'
import { MOCK_AUXILIARIES, MOCK_CALLS } from '../data'

const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

const PERIOD_CHIPS = ['Este mês', 'Últimos 30 dias', 'Últimos 90 dias']

export default function DemoAuxiliares() {
  const [period, setPeriod] = useState('Este mês')

  const totalComissoes = MOCK_AUXILIARIES.reduce((s, a) => s + a.total_earned, 0)
  const aPagar         = MOCK_AUXILIARIES.reduce((s, a) => s + a.unpaid_earned, 0)
  const chamados       = MOCK_CALLS.filter(c => c.status === 'aprovado').length
  const pessoas        = MOCK_AUXILIARIES.length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Comissões</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Ganhos por técnico e dono no período</p>
      </div>

      {/* Período */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <UserCog className="w-4 h-4" style={{ color: '#2563eb' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Período</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {PERIOD_CHIPS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition"
              style={period === p
                ? { background: '#2563eb', color: '#fff' }
                : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>De</span>
            <input type="date" defaultValue="2026-07-01" className="rounded-xl px-3 py-2 text-sm border outline-none"
              style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Até</span>
            <input type="date" defaultValue="2026-07-15" className="rounded-xl px-3 py-2 text-sm border outline-none"
              style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'TOTAL COMISSÕES', value: fmt(totalComissoes), color: '#2563eb' },
          { label: 'A PAGAR',         value: fmt(aPagar),         color: '#f59e0b' },
          { label: 'CHAMADOS',        value: String(chamados),    color: 'var(--text-primary)' },
          { label: 'PESSOAS',         value: String(pessoas),     color: 'var(--text-primary)' },
        ].map(c => (
          <div key={c.label} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{c.label}</p>
            <p className="text-lg font-bold mt-1 leading-tight break-all" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Auxiliaries */}
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
                    {aux.type} · {aux.percentage}% de comissão
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
