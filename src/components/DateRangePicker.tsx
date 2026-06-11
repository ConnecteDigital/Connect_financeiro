'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronDown, X } from 'lucide-react'
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
  /** 'overlay' = sobre fundo colorido (hero); 'card' = sobre fundo claro da página */
  variant?: 'overlay' | 'card'
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

export default function DateRangePicker({ value, onChange, variant = 'overlay' }: Props) {
  const [open, setOpen] = useState(false)
  const [customStart, setCustomStart] = useState(value.start)
  const [customEnd, setCustomEnd] = useState(value.end)
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close on outside click — precisa reconhecer o sheet mobile E o dropdown
  // desktop, senão o touchstart fecha o portal antes do click no preset.
  useEffect(() => {
    if (!open) return
    function handle(e: Event) {
      const target = e.target as Node
      if (buttonRef.current?.contains(target)) return
      const dropdown = document.getElementById('drp-dropdown')
      if (dropdown && dropdown.contains(target)) return
      const sheet = document.getElementById('drp-mobile-sheet')
      if (sheet && sheet.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('touchstart', handle)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('touchstart', handle)
    }
  }, [open])

  function handleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const isMobile = window.innerWidth < 640
      if (isMobile) {
        // Bottom sheet — position doesn't matter, it's full-width fixed bottom
        setDropPos({ top: 0, right: 0 })
      } else {
        setDropPos({
          top: rect.bottom + 6,
          right: window.innerWidth - rect.right,
        })
      }
    }
    setOpen(o => !o)
  }

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
    <>
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={variant === 'overlay'
          ? 'flex items-center gap-1.5 bg-white/20 backdrop-blur rounded-xl px-3 py-2 text-white text-sm font-medium transition hover:bg-white/30'
          : 'flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition'}
        style={variant === 'card' ? {
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-strong)',
          boxShadow: 'var(--shadow-sm)',
        } : undefined}
      >
        <Calendar className="w-4 h-4 flex-shrink-0 opacity-80" />
        <span className="max-w-[120px] truncate">{value.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <>
          {/* Mobile: full-screen bottom sheet */}
          <div className="sm:hidden fixed inset-0 z-[70]">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <div id="drp-mobile-sheet" className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl overflow-hidden"
              style={{ maxHeight: '85dvh' }}>
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <p className="font-semibold text-slate-800">Selecionar período</p>
                <button onClick={() => setOpen(false)} className="p-2 rounded-full bg-slate-100">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(85dvh - 60px)' }}>
                <div className="px-4 pb-2 space-y-1">
                  {presets.map(p => {
                    const range = p.get()
                    const active = value.start === range.start && value.end === range.end
                    return (
                      <button key={p.label}
                        onClick={() => { onChange(range); setOpen(false) }}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition ${active ? 'bg-orange-50 text-orange-600' : 'text-slate-700 hover:bg-slate-50'}`}>
                        {p.label}
                        {active && <span className="ml-2 text-orange-400">✓</span>}
                      </button>
                    )
                  })}
                </div>
                <div className="px-4 py-3 border-t border-slate-100 space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Período personalizado</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">De</label>
                      <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Até</label>
                      <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  </div>
                  <button onClick={applyCustom}
                    className="w-full bg-orange-500 text-white text-sm font-semibold py-3 rounded-xl">
                    Aplicar período
                  </button>
                </div>
                <div className="h-[env(safe-area-inset-bottom,20px)]" />
              </div>
            </div>
          </div>

          {/* Desktop: dropdown */}
          <div id="drp-dropdown"
            className="hidden sm:block fixed z-[70] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
            style={{ top: dropPos.top, right: dropPos.right, width: 288, maxHeight: '85vh', overflowY: 'auto' }}>
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
            <div className="p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Período personalizado</p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">De</label>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Até</label>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>
              <button onClick={applyCustom}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2 rounded-lg transition">
                Aplicar
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
