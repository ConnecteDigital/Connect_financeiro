'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface DateRange {
  start: string
  end: string
  label: string
}

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
}

const today = () => new Date()
const fmt = (d: Date) => format(d, 'yyyy-MM-dd')
const fmtLabel = (d: Date) => format(d, 'dd/MM/yyyy')

const presets = [
  {
    label: 'Hoje',
    get: () => { const d = today(); return { start: fmt(d), end: fmt(d), label: 'Hoje' } }
  },
  {
    label: 'Ontem',
    get: () => {
      const d = new Date(today()); d.setDate(d.getDate() - 1)
      return { start: fmt(d), end: fmt(d), label: 'Ontem' }
    }
  },
  {
    label: 'Esta semana',
    get: () => {
      const d = today()
      return { start: fmt(startOfWeek(d, { weekStartsOn: 1 })), end: fmt(endOfWeek(d, { weekStartsOn: 1 })), label: 'Esta semana' }
    }
  },
  {
    label: 'Este mês',
    get: () => {
      const d = today()
      return { start: fmt(startOfMonth(d)), end: fmt(endOfMonth(d)), label: format(d, "MMMM 'de' yyyy", { locale: ptBR }) }
    }
  },
  {
    label: 'Mês passado',
    get: () => {
      const d = subMonths(today(), 1)
      return { start: fmt(startOfMonth(d)), end: fmt(endOfMonth(d)), label: format(d, "MMMM 'de' yyyy", { locale: ptBR }) }
    }
  },
  {
    label: 'Últimos 7 dias',
    get: () => {
      const e = today(); const s = new Date(e); s.setDate(s.getDate() - 6)
      return { start: fmt(s), end: fmt(e), label: 'Últimos 7 dias' }
    }
  },
  {
    label: 'Últimos 30 dias',
    get: () => {
      const e = today(); const s = new Date(e); s.setDate(s.getDate() - 29)
      return { start: fmt(s), end: fmt(e), label: 'Últimos 30 dias' }
    }
  },
]

export default function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [customStart, setCustomStart] = useState(value.start)
  const [customEnd, setCustomEnd] = useState(value.end)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function applyCustom() {
    if (!customStart || !customEnd) return
    onChange({
      start: customStart,
      end: customEnd,
      label: `${fmtLabel(new Date(customStart + 'T12:00:00'))} – ${fmtLabel(new Date(customEnd + 'T12:00:00'))}`
    })
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-2 shadow-sm hover:border-orange-300 transition text-sm font-medium text-zinc-700"
      >
        <Calendar className="w-4 h-4 text-orange-500 flex-shrink-0" />
        <span>{value.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
          style={{ width: 'min(288px, calc(100vw - 2rem))', maxHeight: '85vh', overflowY: 'auto' }}>
          {/* Presets */}
          <div className="p-2 border-b border-slate-100">
            {presets.map(p => {
              const range = p.get()
              const active = value.start === range.start && value.end === range.end
              return (
                <button key={p.label}
                  onClick={() => { onChange(range); setOpen(false) }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${active ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                  {p.label}
                </button>
              )
            })}
          </div>

          {/* Personalizado */}
          <div className="p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Período personalizado</p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-1 block">De</label>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-400 mb-1 block">Até</label>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <button onClick={applyCustom}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2 rounded-lg transition">
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
