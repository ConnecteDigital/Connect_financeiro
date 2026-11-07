'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PeriodMode } from '@/lib/period'

// Dia | Semana | Mês + setas (padrão das telas da Rodrigues)
export default function PeriodNav({ mode, offset, label, onMode, onOffset, max = 0 }: {
  mode: PeriodMode
  offset: number
  label: string
  onMode: (m: PeriodMode) => void
  onOffset: (o: number) => void
  max?: number
}) {
  return (
    <div className="space-y-2">
      <div className="flex bg-zinc-100 rounded-xl p-1">
        {([['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']] as const).map(([v, l]) => (
          <button key={v} type="button" onClick={() => { onMode(v); onOffset(0) }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${mode === v ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
            {l}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between bg-white rounded-2xl border border-zinc-100 px-3 py-2 shadow-sm">
        <button type="button" onClick={() => onOffset(offset - 1)} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className={`font-semibold text-zinc-800 text-sm ${mode === 'mes' ? 'capitalize' : ''}`}>{label}</p>
          {offset !== 0 && (
            <button type="button" onClick={() => onOffset(0)} className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
              Voltar para {mode === 'dia' ? 'hoje' : mode === 'semana' ? 'esta semana' : 'este mês'}
            </button>
          )}
        </div>
        <button type="button" onClick={() => onOffset(Math.min(max, offset + 1))} disabled={offset >= max}
          className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 disabled:opacity-30">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
