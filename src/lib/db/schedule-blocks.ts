import { createClient } from '@/lib/supabase/client'
import { getMyTenantId } from '@/lib/db/tenant'
import { localYmd } from '@/lib/tecnico-queue'

// Bloqueios de agenda (Rodrigues): horário em que o técnico não pode ser
// agendado. Um bloqueio pode valer num dia só ou repetir toda semana.

export interface ScheduleBlock {
  id: string
  auxiliary_id: string | null
  date: string
  all_day: boolean
  start_time: string | null
  end_time: string | null
  reason: string | null
  repeat_weekly: boolean
  repeat_until: string | null
}

// Um bloqueio "materializado" num dia específico
export interface BlockOnDay extends ScheduleBlock { day: string; startMin: number; endMin: number }

export type ScheduleBlockInput = Omit<ScheduleBlock, 'id'>

const toMin = (t: string | null, fallback: number) => {
  if (!t) return fallback
  const [h, m] = String(t).split(':').map(Number)
  return h * 60 + (m || 0)
}

export function blockLabel(b: ScheduleBlock) {
  if (b.all_day) return 'Dia inteiro'
  return `${String(b.start_time ?? '').slice(0, 5)} – ${String(b.end_time ?? '').slice(0, 5)}`
}

// Bloqueios que caem em cada dia do intervalo (expande os semanais)
export function expandBlocks(blocks: ScheduleBlock[], start: string, end: string): BlockOnDay[] {
  const out: BlockOnDay[] = []
  const s = new Date(start + 'T12:00:00'), e = new Date(end + 'T12:00:00')
  for (const b of blocks) {
    const first = new Date(b.date + 'T12:00:00')
    const push = (day: string) => out.push({ ...b, day, startMin: b.all_day ? 0 : toMin(b.start_time, 0), endMin: b.all_day ? 1440 : toMin(b.end_time, 1440) })
    if (!b.repeat_weekly) {
      if (b.date >= start && b.date <= end) push(b.date)
      continue
    }
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== first.getDay() || d < first) continue
      const ymd = localYmd(d)
      if (b.repeat_until && ymd > b.repeat_until) continue
      push(ymd)
    }
  }
  return out.sort((a, b) => a.day.localeCompare(b.day) || a.startMin - b.startMin)
}

// Busca os bloqueios que podem cair no intervalo (os semanais vêm todos)
export async function getBlocksForRange(start: string, end: string, auxiliaryId?: string | null): Promise<BlockOnDay[]> {
  const supabase = createClient()
  let q = supabase.from('schedule_blocks').select('*')
    .or(`and(date.gte.${start},date.lte.${end}),and(repeat_weekly.eq.true,date.lte.${end})`)
  if (auxiliaryId) q = q.or(`auxiliary_id.eq.${auxiliaryId},auxiliary_id.is.null`)
  const { data, error } = await q
  if (error) throw error
  return expandBlocks((data ?? []) as ScheduleBlock[], start, end)
}

export async function createScheduleBlock(values: ScheduleBlockInput) {
  const supabase = createClient()
  const tenant_id = await getMyTenantId()
  const { data, error } = await supabase.from('schedule_blocks').insert({ ...values, tenant_id }).select().single()
  if (error) throw error
  return data as ScheduleBlock
}

export async function updateScheduleBlock(id: string, values: Partial<ScheduleBlockInput>) {
  const { error } = await createClient().from('schedule_blocks').update(values).eq('id', id)
  if (error) throw error
}

export async function deleteScheduleBlock(id: string) {
  const { error } = await createClient().from('schedule_blocks').delete().eq('id', id)
  if (error) throw error
}

// Conflitos de agenda de um técnico num dia/horário: outros chamados
// (pela duração) e bloqueios. Só avisa — nunca trava.
export interface Conflict { kind: 'chamado' | 'bloqueio'; label: string; range: string }

export async function findScheduleConflicts(opts: {
  auxiliaryId: string; day: string; time: string; durationMin: number; ignoreCallId?: string | null
}): Promise<Conflict[]> {
  const { auxiliaryId, day, time, durationMin, ignoreCallId } = opts
  if (!auxiliaryId || !day || !time) return []
  const start = toMin(time, 0), end = start + Math.max(durationMin || 60, 15)
  const overlaps = (s: number, e: number) => s < end && e > start
  const fmtT = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  const supabase = createClient()
  const [{ data: calls }, blocks] = await Promise.all([
    supabase.from('calls').select('id, contact_name, scheduled_time, duration_minutes, status, client:clients(name)')
      .eq('technician_id', auxiliaryId).eq('status', 'agendado')
      .or(`scheduled_date.eq.${day},and(scheduled_date.is.null,date.eq.${day})`),
    getBlocksForRange(day, day, auxiliaryId),
  ])
  const out: Conflict[] = []
  for (const c of (calls ?? []) as any[]) {
    if (c.id === ignoreCallId || !c.scheduled_time) continue
    const s = toMin(c.scheduled_time, 0), e = s + (Number(c.duration_minutes) || 60)
    if (overlaps(s, e)) {
      const name = (Array.isArray(c.client) ? c.client[0] : c.client)?.name ?? c.contact_name ?? 'cliente'
      out.push({ kind: 'chamado', label: name, range: `${fmtT(s)} – ${fmtT(e)}` })
    }
  }
  for (const b of blocks) {
    if (overlaps(b.startMin, b.endMin)) out.push({ kind: 'bloqueio', label: b.reason || 'Bloqueio', range: b.all_day ? 'dia inteiro' : `${fmtT(b.startMin)} – ${fmtT(b.endMin)}` })
  }
  return out
}
