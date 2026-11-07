// Períodos de Dia / Semana / Mês navegáveis (usado nas telas da Rodrigues)
import { localYmd } from '@/lib/tecnico-queue'

export type PeriodMode = 'dia' | 'semana' | 'mes'

export interface Period { start: string; end: string; label: string; isCurrent: boolean }

const short = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

export function periodOf(mode: PeriodMode, offset: number, base = new Date()): Period {
  const y = base.getFullYear(), m = base.getMonth(), d = base.getDate()
  if (mode === 'dia') {
    const day = new Date(y, m, d + offset)
    const label = offset === 0 ? 'Hoje' : offset === -1 ? 'Ontem'
      : day.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
    return { start: localYmd(day), end: localYmd(day), label, isCurrent: offset === 0 }
  }
  if (mode === 'semana') {
    const monday = new Date(y, m, d - ((base.getDay() + 6) % 7) + offset * 7)
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
    const range = `${short(monday)} a ${short(sunday)}`
    return { start: localYmd(monday), end: localYmd(sunday), label: offset === 0 ? `Esta semana · ${range}` : range, isCurrent: offset === 0 }
  }
  const first = new Date(y, m + offset, 1)
  const last = new Date(y, m + offset + 1, 0)
  return { start: localYmd(first), end: localYmd(last), label: first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), isCurrent: offset === 0 }
}

export const ptDate = (s?: string | null) => s ? new Date(String(s).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : ''
