'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Fila de serviços do técnico (Rodrigues): ele só vê endereço e pode
// iniciar o PRIMEIRO chamado agendado da fila; os demais ficam com
// cadeado até o anterior ser concluído, e os de dias futuros ficam com
// cadeado até o dia chegar.
//
// ATENÇÃO: isso é uma regra de TELA. O banco (RLS) continua deixando o
// técnico ler os próprios chamados — o cadeado só esconde as informações
// na interface pra ele seguir a ordem definida pelo Rodrigues.

export function localYmd(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface QueueCall {
  id: string
  date: string
  scheduled_date: string | null
  scheduled_time: string | null
  created_at: string | null
}

export const callDay = (c: { date: string; scheduled_date?: string | null }) => c.scheduled_date ?? c.date

// Ordem da fila: dia, horário agendado (sem horário vai pro fim do dia), criação
export function compareQueue(a: QueueCall, b: QueueCall) {
  const d = callDay(a).localeCompare(callDay(b))
  if (d !== 0) return d
  if (a.scheduled_time && !b.scheduled_time) return -1
  if (!a.scheduled_time && b.scheduled_time) return 1
  const t = String(a.scheduled_time ?? '').localeCompare(String(b.scheduled_time ?? ''))
  if (t !== 0) return t
  return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''))
}

export interface LockInfo { locked: boolean; message: string }

export interface VisitInfo { call_id: string; started_at: string; finished_at: string | null; outcome: string | null }

// Tipo do chamado mostrado no selo da fila do técnico
export type CallKind = 'Retorno' | 'Serviço' | 'Orçamento'
export function callKind(call: { return_of_call_id?: string | null }, visits: VisitInfo[]): CallKind {
  if (call.return_of_call_id) return 'Retorno'
  // Já teve uma visita que terminou em orçamento: agora é a execução
  if (visits.some(v => v.finished_at && v.outcome === 'orcamento')) return 'Serviço'
  return 'Orçamento'
}

export const CALL_KIND_STYLE: Record<CallKind, string> = {
  Retorno: 'bg-violet-50 text-violet-700 border-violet-200',
  Serviço: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Orçamento: 'bg-amber-50 text-amber-700 border-amber-200',
}

// Dia em que o chamado foi concluído: o fim da última visita; sem visita,
// o dia agendado
export function finishedDay(call: { date: string; scheduled_date?: string | null }, visits: VisitInfo[]): string {
  const last = visits.filter(v => v.finished_at).sort((a, b) => String(b.finished_at).localeCompare(String(a.finished_at)))[0]
  return last ? localYmd(new Date(last.finished_at!)) : callDay(call)
}

// Abas de concluídos do técnico
export const FINISHED_TABS: { key: string; label: string; statuses: string[] }[] = [
  { key: 'aprovados', label: 'Aprovados', statuses: ['aprovado', 'retorno'] },
  { key: 'orcamentos', label: 'Orçamentos', statuses: ['orcamento'] },
  { key: 'recusados', label: 'Recusados', statuses: ['nao_aprovou', 'pagou_somente_visita'] },
]

export function computeLocks(calls: QueueCall[], openCallIds: Set<string>, today: string): Map<string, LockInfo> {
  const locks = new Map<string, LockInfo>()
  const sorted = [...calls].sort(compareQueue)
  const head = sorted.find(c => callDay(c) <= today)
  for (const c of sorted) {
    const day = callDay(c)
    if (openCallIds.has(c.id) || c.id === head?.id) {
      locks.set(c.id, { locked: false, message: '' })
    } else if (day > today) {
      const [, m, d] = day.split('-')
      locks.set(c.id, { locked: true, message: `Liberado no dia ${d}/${m}` })
    } else {
      locks.set(c.id, { locked: true, message: 'Liberado após concluir o serviço anterior' })
    }
  }
  return locks
}

// Carrega os chamados agendados do técnico logado + visitas em andamento
// e devolve o estado de cadeado de cada um. Recalcula ao voltar pro app
// (foco/visibilidade) e a cada minuto, pra virar o dia sozinho à meia-noite.
export function useTecnicoQueue(enabled: boolean) {
  const [calls, setCalls] = useState<QueueCall[]>([])
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [visits, setVisits] = useState<VisitInfo[]>([])
  const [today, setToday] = useState(localYmd)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    if (!enabled) return
    const supabase = createClient()
    const [callsRes, visitsRes] = await Promise.all([
      supabase.from('calls').select('id, date, scheduled_date, scheduled_time, created_at').eq('status', 'agendado'),
      supabase.from('service_visits').select('call_id, started_at, finished_at, outcome'),
    ])
    const allVisits = (visitsRes.data ?? []) as VisitInfo[]
    setCalls((callsRes.data ?? []) as QueueCall[])
    setVisits(allVisits)
    setOpenIds(new Set(allVisits.filter(v => !v.finished_at).map(v => v.call_id)))
    setToday(localYmd())
    setLoaded(true)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    load().catch(console.error)
    const refresh = () => { if (document.visibilityState === 'visible') load().catch(console.error) }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    const tick = setInterval(() => setToday(prev => {
      const now = localYmd()
      if (now !== prev) load().catch(console.error)
      return now
    }), 60_000)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      clearInterval(tick)
    }
  }, [enabled, load])

  const locks = computeLocks(calls, openIds, today)
  const lockOf = (call: { id: string; status?: string }): LockInfo => {
    if (!enabled || (call.status && call.status !== 'agendado')) return { locked: false, message: '' }
    return locks.get(call.id) ?? { locked: false, message: '' }
  }

  const visitsOf = useCallback((callId: string) => visits.filter(v => v.call_id === callId), [visits])

  return { loaded: !enabled || loaded, lockOf, visitsOf, reload: load }
}
