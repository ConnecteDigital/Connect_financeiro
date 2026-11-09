'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { localYmd } from '@/lib/tecnico-queue'

// Calendário do mês pra pular direto pra um dia (Rodrigues). Mostra uma
// bolinha nos dias que têm algo (chamado/bloqueio) — `marks` = dia → cor.
export default function DayPicker({ value, marks, onPick, onClose, onMonthChange }: {
  value: string
  marks: Record<string, string>
  onPick: (ymd: string) => void
  onClose: () => void
  onMonthChange?: (year: number, month: number) => void
}) {
  const [month, setMonth] = useState(() => { const d = new Date(value + 'T12:00:00'); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const today = localYmd()
  const y = month.getFullYear(), m = month.getMonth()
  const firstDow = new Date(y, m, 1).getDay()
  const days = new Date(y, m + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const go = (delta: number) => {
    const nm = new Date(y, m + delta, 1)
    setMonth(nm); onMonthChange?.(nm.getFullYear(), nm.getMonth())
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={() => go(-1)} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500"><ChevronLeft className="w-5 h-5" /></button>
          <p className="font-semibold text-zinc-800 capitalize">{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
          <div className="flex items-center">
            <button type="button" onClick={() => go(1)} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500"><ChevronRight className="w-5 h-5" /></button>
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-zinc-400 uppercase mb-1">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`e${i}`} />
            const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const sel = key === value, isToday = key === today, mark = marks[key]
            return (
              <button key={key} type="button" onClick={() => { onPick(key); onClose() }}
                className={`h-11 rounded-xl flex flex-col items-center justify-center text-sm font-medium transition ${sel ? 'text-white' : isToday ? 'text-zinc-900 bg-zinc-100' : 'text-zinc-700 hover:bg-zinc-50'}`}
                style={sel ? { background: 'var(--primary)' } : {}}>
                {day}
                <span className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: mark ? (sel ? '#fff' : mark) : 'transparent' }} />
              </button>
            )
          })}
        </div>
        <button type="button" onClick={() => { onPick(today); onClose() }} className="mt-3 w-full py-2 rounded-xl text-sm font-semibold bg-zinc-100 text-zinc-700">Hoje</button>
      </div>
    </div>
  )
}
