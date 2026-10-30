import type { BusinessHours } from '@/lib/tenant-context'

export const DEFAULT_BUSINESS_HOURS: { weekday_start: string; weekday_end: string; saturday_start: string | null; saturday_end: string | null } = {
  weekday_start: '08:00',
  weekday_end: '18:00',
  saturday_start: null,
  saturday_end: null,
}

// Espelha compute_after_hours() da migration_v25: domingo é sempre fora
// do horário; sábado só é comercial se tiver horário configurado; dias
// úteis fora do intervalo início–fim são fora. Sem hora → 12:00.
export function isAfterHours(dateStr: string, timeStr: string | null, config?: BusinessHours | null): boolean {
  if (!dateStr) return false
  const dow = new Date(dateStr + 'T12:00:00').getDay()
  const t = (timeStr || '12:00').slice(0, 5)

  if (dow === 0) return true
  if (dow === 6) {
    const start = config?.saturday_start || null
    const end = config?.saturday_end || null
    if (!start || !end) return true
    return t < start.slice(0, 5) || t >= end.slice(0, 5)
  }
  const start = (config?.weekday_start || DEFAULT_BUSINESS_HOURS.weekday_start).slice(0, 5)
  const end = (config?.weekday_end || DEFAULT_BUSINESS_HOURS.weekday_end).slice(0, 5)
  return t < start || t >= end
}

// Data/hora local (yyyy-mm-dd, HH:MM) de um timestamp ISO
export function localDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return { date, time }
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
