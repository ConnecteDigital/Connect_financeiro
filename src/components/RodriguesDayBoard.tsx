'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { UserRound, Timer } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getAuxiliaries } from '@/lib/db/auxiliaries'
import { localYmd } from '@/lib/tecnico-queue'

// Aba Chamados do GERENTE da Rodrigues: em vez da lista de chamados, um
// painel do dia — cada técnico com sua linha do tempo (00h a 24h) e o
// resumo do dia dele. Quem aprova/recusa é o técnico; aqui é só acompanhar.

const NAME_COL = 'w-24 sm:w-44'
const ROW_H = 46
const DEFAULT_MIN = 60 // duração presumida de um serviço que ainda não começou

type Phase = 'a_fazer' | 'andamento' | 'aprovado' | 'orcamento' | 'recusado' | 'retorno' | 'outro'

const PHASE: Record<Phase, { label: string; block: string; dot: string }> = {
  a_fazer:   { label: 'A fazer',      block: 'bg-blue-50 border-blue-300 text-blue-900',          dot: 'bg-blue-400' },
  andamento: { label: 'Em andamento', block: 'bg-emerald-500 border-emerald-600 text-white',      dot: 'bg-emerald-500' },
  aprovado:  { label: 'Aprovado',     block: 'bg-emerald-50 border-emerald-300 text-emerald-900', dot: 'bg-emerald-300' },
  orcamento: { label: 'Orçamento',    block: 'bg-sky-50 border-sky-300 text-sky-900',             dot: 'bg-sky-400' },
  recusado:  { label: 'Recusado',     block: 'bg-amber-50 border-amber-300 text-amber-900',       dot: 'bg-amber-400' },
  retorno:   { label: 'Retorno',      block: 'bg-violet-50 border-violet-300 text-violet-900',    dot: 'bg-violet-400' },
  outro:     { label: 'Outro',        block: 'bg-zinc-100 border-zinc-300 text-zinc-700',         dot: 'bg-zinc-400' },
}

function phaseOf(c: any, open: boolean): Phase {
  if (open) return 'andamento'
  switch (c.status) {
    case 'agendado': return 'a_fazer'
    case 'aprovado': return 'aprovado'
    case 'orcamento': return 'orcamento'
    case 'retorno': return 'retorno'
    case 'nao_aprovou': case 'pagou_somente_visita': case 'nao_quis_visita': case 'cancelado': return 'recusado'
    default: return 'outro'
  }
}

const fmtMoney = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(Math.round(min % 60)).padStart(2, '0')}`

interface Block {
  call: any
  phase: Phase
  start: number // minutos desde 00:00
  end: number
  timed: boolean
  row: number
}

interface Lane {
  id: string
  name: string
  blocks: Block[]
  untimed: Block[]
  rows: number
  total: number
  revenue: number
  counts: Record<Phase, number>
}

export default function RodriguesDayBoard({ calls, day }: { calls: any[]; day: string }) {
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [visits, setVisits] = useState<any[]>([])
  const [now, setNow] = useState(() => new Date())
  const scrollRef = useRef<HTMLDivElement>(null)
  // Escala da linha do tempo: mais compacta no celular
  const [HOUR_PX, setHourPx] = useState(120)
  useEffect(() => {
    const fit = () => setHourPx(window.innerWidth < 640 ? 88 : 120)
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  const DAY_PX = HOUR_PX * 24
  const isToday = day === localYmd(now)

  useEffect(() => {
    getAuxiliaries().then(a => setTecnicos(a.filter((x: any) => x.type === 'tecnico'))).catch(console.error)
  }, [])

  // Visitas (Iniciar/Encerrar do técnico) dos chamados do dia — atualiza
  // a cada minuto pra acompanhar quem está em atendimento
  const callIds = useMemo(() => calls.map(c => c.id).sort().join(','), [calls])
  useEffect(() => {
    const ids = callIds ? callIds.split(',') : []
    const load = () => {
      if (!ids.length) { setVisits([]); return }
      createClient().from('service_visits').select('call_id, started_at, finished_at, outcome').in('call_id', ids)
        .then(({ data }) => setVisits(data ?? []))
    }
    load()
    const t = setInterval(() => { load(); setNow(new Date()) }, 60_000)
    return () => clearInterval(t)
  }, [callIds])

  // Começa mostrando a partir das 07h (ou 1h antes de agora, se for hoje)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const n = new Date()
    const startHour = day === localYmd(n) ? Math.max(0, Math.min(n.getHours() - 1, 7)) : 7
    el.scrollLeft = startHour * HOUR_PX
  }, [day, HOUR_PX])

  const dayStart = useMemo(() => new Date(day + 'T00:00:00').getTime(), [day])
  const toMin = (iso: string) => Math.min(1440, Math.max(0, (new Date(iso).getTime() - dayStart) / 60_000))

  const lanes: Lane[] = useMemo(() => {
    const byCall = new Map<string, any[]>()
    for (const v of visits) {
      if (!byCall.has(v.call_id)) byCall.set(v.call_id, [])
      byCall.get(v.call_id)!.push(v)
    }
    const nowMin = (now.getTime() - dayStart) / 60_000

    const build = (id: string, name: string, list: any[]): Lane => {
      const blocks: Block[] = []
      const untimed: Block[] = []
      const counts = Object.fromEntries(Object.keys(PHASE).map(k => [k, 0])) as Record<Phase, number>
      let revenue = 0
      for (const c of list) {
        const vs = (byCall.get(c.id) ?? []).sort((a, b) => a.started_at.localeCompare(b.started_at))
        const open = vs.some(v => !v.finished_at)
        const phase = phaseOf(c, open)
        counts[phase]++
        revenue += Number(c.service_orders?.[0]?.total_value ?? 0)
        // Horário: o que aconteceu de verdade (visitas) ou o agendado
        let start: number | null = null
        let end: number | null = null
        if (vs.length) {
          start = toMin(vs[0].started_at)
          const last = vs[vs.length - 1]
          end = last.finished_at ? toMin(last.finished_at) : Math.min(1440, Math.max(nowMin, start + 15))
        } else if (c.scheduled_time) {
          const [h, m] = String(c.scheduled_time).split(':').map(Number)
          start = h * 60 + (m || 0)
          end = start + DEFAULT_MIN
        }
        const b: Block = { call: c, phase, start: start ?? 0, end: Math.min(1440, Math.max(end ?? 0, (start ?? 0) + 30)), timed: start !== null, row: 0 }
        ;(b.timed ? blocks : untimed).push(b)
      }
      // Empilha os que se sobrepõem em linhas
      blocks.sort((a, b) => a.start - b.start)
      const rowEnds: number[] = []
      for (const b of blocks) {
        let r = rowEnds.findIndex(e => e <= b.start)
        if (r === -1) { r = rowEnds.length; rowEnds.push(0) }
        rowEnds[r] = b.end
        b.row = r
      }
      return { id, name, blocks, untimed, rows: Math.max(1, rowEnds.length), total: list.length, revenue, counts }
    }

    const byTec = new Map<string, any[]>()
    const noTec: any[] = []
    for (const c of calls) {
      if (c.technician_id) {
        if (!byTec.has(c.technician_id)) byTec.set(c.technician_id, [])
        byTec.get(c.technician_id)!.push(c)
      } else noTec.push(c)
    }
    const out = tecnicos.map(t => build(t.id, t.name, byTec.get(t.id) ?? []))
    // Chamado com técnico que não está mais na lista (ex.: excluído)
    for (const [tid, list] of byTec) {
      if (!tecnicos.some(t => t.id === tid)) out.push(build(tid, 'Técnico removido', list))
    }
    out.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    if (noTec.length) out.push(build('none', 'Sem técnico', noTec))
    return out
  }, [calls, tecnicos, visits, now, dayStart])

  const dayCounts = useMemo(() => {
    const c = Object.fromEntries(Object.keys(PHASE).map(k => [k, 0])) as Record<Phase, number>
    for (const l of lanes) for (const k of Object.keys(c) as Phase[]) c[k] += l.counts[k]
    return c
  }, [lanes])
  const dayRevenue = lanes.reduce((s, l) => s + l.revenue, 0)
  const nowMin = (now.getTime() - dayStart) / 60_000

  const summary: { label: string; value: number | string; cls: string }[] = [
    { label: 'Chamados', value: calls.length, cls: 'text-zinc-900' },
    { label: 'A fazer', value: dayCounts.a_fazer, cls: 'text-blue-600' },
    { label: 'Em andamento', value: dayCounts.andamento, cls: 'text-emerald-600' },
    { label: 'Aprovados', value: dayCounts.aprovado + dayCounts.retorno, cls: 'text-emerald-700' },
    { label: 'Orçamentos', value: dayCounts.orcamento, cls: 'text-sky-600' },
    { label: 'Recusados', value: dayCounts.recusado, cls: 'text-amber-600' },
  ]

  return (
    <div className="space-y-4">
      {/* Resumo do dia */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {summary.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-3 py-2.5">
            <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-[11px] font-medium text-zinc-500 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
      {dayRevenue > 0 && (
        <p className="text-xs text-zinc-500 -mt-2">Faturado no dia: <span className="font-semibold text-zinc-700">{fmtMoney(dayRevenue)}</span></p>
      )}

      {/* Linha do tempo por técnico */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div ref={scrollRef} className="overflow-x-auto">
          <div className="relative" style={{ width: 'max-content' }}>
            {/* Régua de horas */}
            <div className="flex border-b border-zinc-100 sticky top-0 bg-white z-20">
              <div className={`${NAME_COL} flex-shrink-0 sticky left-0 bg-white z-30 border-r border-zinc-100 px-3 py-2 text-[11px] font-semibold text-zinc-400 uppercase`}>
                Técnico
              </div>
              <div className="relative h-8" style={{ width: DAY_PX }}>
                {Array.from({ length: 24 }).map((_, h) => (
                  <span key={h} className="absolute top-2 text-[11px] text-zinc-400 tabular-nums -translate-x-1/2"
                    style={{ left: h * HOUR_PX + (h === 0 ? 14 : 0) }}>
                    {String(h).padStart(2, '0')}h
                  </span>
                ))}
              </div>
            </div>

            {lanes.length === 0 && (
              <p className="px-4 py-10 text-sm text-zinc-400 sticky left-0">Nenhum técnico cadastrado.</p>
            )}

            {lanes.map(l => (
              <div key={l.id} className="flex border-b border-zinc-50 last:border-b-0">
                {/* Nome + resumo do técnico */}
                <div className={`${NAME_COL} flex-shrink-0 sticky left-0 bg-white z-10 border-r border-zinc-100 px-3 py-2`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <UserRound className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
                    <p className={`text-sm font-semibold truncate ${l.id === 'none' ? 'text-red-600' : 'text-zinc-800'}`}>{l.name}</p>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {l.total === 0 ? 'Livre' : `${l.total} serviço${l.total > 1 ? 's' : ''}`}
                  </p>
                  {l.total > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(Object.keys(PHASE) as Phase[]).filter(k => l.counts[k] > 0).map(k => (
                        <span key={k} title={PHASE[k].label} className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-zinc-600">
                          <span className={`w-1.5 h-1.5 rounded-full ${PHASE[k].dot}`} />{l.counts[k]}
                        </span>
                      ))}
                    </div>
                  )}
                  {l.revenue > 0 && <p className="text-[10px] text-zinc-400 mt-0.5 hidden sm:block">{fmtMoney(l.revenue)}</p>}
                </div>

                {/* Faixa do dia */}
                <div className="relative" style={{ width: DAY_PX, height: Math.max(l.rows * ROW_H + 12, 64) }}>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className={`absolute top-0 bottom-0 border-l ${h % 6 === 0 ? 'border-zinc-200' : 'border-zinc-100'}`} style={{ left: h * HOUR_PX }} />
                  ))}
                  {l.blocks.map(b => {
                    const w = Math.max((b.end - b.start) / 60 * HOUR_PX, 70)
                    const name = b.call.client?.name ?? b.call.contact_name ?? 'Sem nome'
                    return (
                      <Link key={b.call.id} href={`/dashboard/chamados/${b.call.id}`}
                        title={`${hhmm(b.start)} · ${name} · ${PHASE[b.phase].label}${b.call.service_category ? ` · ${b.call.service_category}` : ''}`}
                        className={`absolute rounded-lg border px-1.5 py-1 overflow-hidden hover:shadow-md hover:z-10 transition ${PHASE[b.phase].block}`}
                        style={{ left: b.start / 60 * HOUR_PX + 1, width: w - 2, top: 6 + b.row * ROW_H, height: ROW_H - 6 }}>
                        <p className="text-[11px] font-bold leading-tight truncate">
                          {hhmm(b.start)} {name}
                        </p>
                        <p className="text-[10px] leading-tight truncate opacity-80">
                          {b.phase === 'andamento' ? <><span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-1 align-middle" /><Timer className="inline w-2.5 h-2.5 -mt-0.5" /> em andamento</> : [b.call.call_neighborhood, b.call.service_category].filter(Boolean).join(' · ') || PHASE[b.phase].label}
                        </p>
                      </Link>
                    )
                  })}
                  {isToday && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-[5] pointer-events-none" style={{ left: nowMin / 60 * HOUR_PX }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {(['a_fazer', 'andamento', 'aprovado', 'orcamento', 'recusado', 'retorno'] as Phase[]).map(k => (
          <span key={k} className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
            <span className={`w-2.5 h-2.5 rounded-sm ${PHASE[k].dot}`} />{PHASE[k].label}
          </span>
        ))}
        {isToday && (
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
            <span className="w-0.5 h-3 bg-red-500" />Agora
          </span>
        )}
      </div>

      {/* Sem horário marcado */}
      {lanes.some(l => l.untimed.length > 0) && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <p className="px-4 py-3 border-b border-zinc-100 text-sm font-semibold text-zinc-700">Sem horário marcado</p>
          <div className="divide-y divide-zinc-50">
            {lanes.flatMap(l => l.untimed.map(b => (
              <Link key={b.call.id} href={`/dashboard/chamados/${b.call.id}`}
                className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-zinc-50 transition">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{b.call.client?.name ?? b.call.contact_name ?? 'Sem nome'}</p>
                  <p className="text-xs text-zinc-500 truncate">{[l.name, b.call.service_category].filter(Boolean).join(' · ')}</p>
                </div>
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${PHASE[b.phase].block}`}>{PHASE[b.phase].label}</span>
              </Link>
            )))}
          </div>
        </div>
      )}
    </div>
  )
}
