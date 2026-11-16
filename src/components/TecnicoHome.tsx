'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PhoneCall, CheckCircle, XCircle, Clock, Wallet, ChevronRight, ChevronLeft, CalendarDays, Timer, Lock, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/lib/tenant-context'
import { getOpenVisit } from '@/lib/db/service-visits'
import { formatDuration } from '@/lib/business-hours'
import { useTecnicoQueue, compareQueue, localYmd, callKind, CALL_KIND_STYLE } from '@/lib/tecnico-queue'
import { getBlocksForRange, blockLabel, type BlockOnDay } from '@/lib/db/schedule-blocks'
import { greeting } from '@/lib/greeting'
import { Sheet } from '@/components/LojaModals'

const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

function monthRange(offset: number) {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  return { start: localYmd(first), end: localYmd(last), label: first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }
}

// Semana atual, de segunda a domingo (a comissão é paga por semana)
function currentWeekRange() {
  const now = new Date()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  return { start: localYmd(monday), end: localYmd(sunday) }
}

const CALL_FIELDS = 'id, status, date, scheduled_date, scheduled_time, created_at, contact_name, service_category, call_address, address_number, call_neighborhood, return_of_call_id, client:clients(name)'

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  agendado: { label: 'Agendado', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  aprovado: { label: 'Aprovado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  retorno: { label: 'Retorno', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  orcamento: { label: 'Orçamento', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  nao_aprovou: { label: 'Não aprovou', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  pagou_somente_visita: { label: 'Pagou a taxa', cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  cancelado: { label: 'Cancelado', cls: 'bg-red-50 text-red-600 border-red-200' },
  nao_quis_visita: { label: 'Não quis visita', cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
}

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const nameOf = (c: any) => c.client?.name ?? c.contact_name ?? 'Sem identificação'
const dayOf = (c: any) => c.scheduled_date ?? c.date
const addressOf = (c: any) => [[c.call_address, c.address_number].filter(Boolean).join(', '), c.call_neighborhood].filter(Boolean).join(' · ')

// Linha de chamado nas listas (cards do resumo e busca). O endereço só
// aparece em chamado já atendido: os agendados seguem a ordem da fila.
function CallRow({ c }: { c: any }) {
  const pill = STATUS_PILL[c.status]
  const time = c.scheduled_time ? String(c.scheduled_time).slice(0, 5) : null
  const date = new Date(dayOf(c) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  return (
    <Link href={`/dashboard/chamados/${c.id}`} className="flex items-center gap-3 px-1 py-3 hover:bg-zinc-50 transition">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-800 truncate">{nameOf(c)}</p>
        <p className="text-xs text-zinc-500 truncate mt-0.5">
          {[`${date}${time ? ` ${time}` : ''}`, c.service_category].filter(Boolean).join(' · ')}
        </p>
        {c.status !== 'agendado' && addressOf(c) && <p className="text-xs text-zinc-400 truncate">{addressOf(c)}</p>}
      </div>
      {pill && <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border flex-shrink-0 ${pill.cls}`}>{pill.label}</span>}
      <ChevronRight className="w-4 h-4 text-zinc-300 flex-shrink-0" />
    </Link>
  )
}

type ListKey = 'total' | 'approved' | 'notApproved' | 'scheduled'
const LIST_FILTER: Record<ListKey, (c: any) => boolean> = {
  total: () => true,
  approved: c => c.status === 'aprovado',
  notApproved: c => c.status === 'nao_aprovou' || c.status === 'pagou_somente_visita',
  scheduled: c => c.status === 'agendado',
}

interface Summary {
  total: number
  approved: number
  notApproved: number
  scheduled: number
  commissionMonth: number
  commissionPending: number
}

// Tela de Início do login de técnico. Tudo aqui já vem filtrado pelo
// banco (RLS): o técnico só enxerga os próprios chamados e a própria
// comissão, então as consultas não precisam filtrar por ele.
// O resumo é sempre de UM mês (o atual por padrão): virou o mês, zera;
// os meses anteriores ficam acessíveis pela seta.
export default function TecnicoHome() {
  const { tenant, profileName } = useTenant()
  const [monthOffset, setMonthOffset] = useState(0)
  const [data, setData] = useState<Summary | null>(null)
  const [today, setToday] = useState<any[] | null>(null)
  const [openVisit, setOpenVisit] = useState<any>(null)
  const [now, setNow] = useState(() => Date.now())
  const { lockOf, visitsOf } = useTecnicoQueue(true)
  const [weekPending, setWeekPending] = useState<number | null>(null)
  // Bloqueios de agenda do técnico hoje (ex.: "Lava-louças na loja 13h–16h")
  const [todayBlocks, setTodayBlocks] = useState<BlockOnDay[]>([])
  // Chamados do mês (pra abrir a lista ao tocar num card) e busca
  const [monthCalls, setMonthCalls] = useState<any[]>([])
  const [listKey, setListKey] = useState<ListKey | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [allCalls, setAllCalls] = useState<any[] | null>(null)

  // Busca: carrega os chamados do técnico (último ano) na primeira vez que abre
  useEffect(() => {
    if (!searchOpen || allCalls) return
    const since = new Date(); since.setFullYear(since.getFullYear() - 1)
    createClient().from('calls').select(CALL_FIELDS)
      .gte('date', localYmd(since)).order('date', { ascending: false }).limit(1500)
      .then(({ data }) => setAllCalls(data ?? []))
  }, [searchOpen, allCalls])
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: aux } = await supabase.from('auxiliaries').select('id').eq('profile_id', user.id).maybeSingle()
      const day = localYmd()
      const list = await getBlocksForRange(day, day, aux?.id ?? null).catch(() => [] as BlockOnDay[])
      setTodayBlocks(list.filter(b => b.auxiliary_id === null || b.auxiliary_id === aux?.id))
    })
  }, [])

  // A receber nesta semana (sempre a semana atual)
  useEffect(() => {
    const { start, end } = currentWeekRange()
    createClient().from('expenses').select('amount').eq('status', 'pendente')
      .gte('due_date', start).lte('due_date', end)
      .then(({ data }) => setWeekPending((data ?? []).reduce((s, e) => s + Number(e.amount || 0), 0)))
  }, [])

  // Serviço em andamento: o tempo vem da hora de início gravada no banco
  useEffect(() => {
    getOpenVisit().then(setOpenVisit).catch(() => setOpenVisit(null))
  }, [])
  useEffect(() => {
    if (!openVisit) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [openVisit])

  // Chamados de hoje (sempre o dia atual, independente do mês escolhido)
  useEffect(() => {
    const day = localYmd()
    createClient()
      .from('calls')
      .select('id, status, date, scheduled_date, scheduled_time, created_at, contact_name, service_category, call_address, address_number, call_neighborhood, return_of_call_id, client:clients(name)')
      .eq('status', 'agendado')
      .or(`scheduled_date.eq.${day},and(scheduled_date.is.null,date.eq.${day})`)
      .then(({ data }) => setToday((data ?? []).sort(compareQueue)))
  }, [])

  // Resumo do mês escolhido
  useEffect(() => {
    setData(null)
    const supabase = createClient()
    const { start, end } = monthRange(monthOffset)
    Promise.all([
      supabase
        .from('calls')
        .select(CALL_FIELDS)
        .or(`and(date.gte.${start},date.lte.${end}),and(scheduled_date.gte.${start},scheduled_date.lte.${end})`),
      supabase.from('expenses').select('amount, status, due_date').gte('due_date', start).lte('due_date', end),
    ]).then(([callsRes, expRes]) => {
      const calls = callsRes.data ?? []
      const expenses = expRes.data ?? []
      setMonthCalls([...calls].sort((a: any, b: any) => `${dayOf(b)}${b.scheduled_time ?? ''}`.localeCompare(`${dayOf(a)}${a.scheduled_time ?? ''}`)))
      setData({
        total: calls.length,
        approved: calls.filter(c => c.status === 'aprovado').length,
        notApproved: calls.filter(c => c.status === 'nao_aprovou' || c.status === 'pagou_somente_visita').length,
        scheduled: calls.filter(c => c.status === 'agendado').length,
        commissionMonth: expenses.reduce((s, e) => s + Number(e.amount || 0), 0),
        commissionPending: expenses.filter(e => e.status === 'pendente').reduce((s, e) => s + Number(e.amount || 0), 0),
      })
    }).catch(console.error)
  }, [monthOffset])

  const { label: monthLabel } = monthRange(monthOffset)
  const loading = data === null

  const cards: { key: ListKey; label: string; value?: number; icon: any; color: string; bg: string }[] = [
    { key: 'total', label: 'Chamados', value: data?.total, icon: PhoneCall, color: 'text-blue-600', bg: 'bg-blue-50' },
    { key: 'approved', label: 'Aprovados', value: data?.approved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { key: 'notApproved', label: 'Não aprovados', value: data?.notApproved, icon: XCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { key: 'scheduled', label: 'Agendados', value: data?.scheduled, icon: Clock, color: 'text-violet-600', bg: 'bg-violet-50' },
  ]
  const listCalls = listKey ? monthCalls.filter(LIST_FILTER[listKey]) : []

  // Busca por nome do cliente ou endereço (endereço só de chamado já atendido)
  const q = norm(query.trim())
  const results = q.length < 2 ? [] : (allCalls ?? []).filter(c =>
    norm(nameOf(c)).includes(q)
    || norm(String(c.service_category ?? '')).includes(q)
    || (c.status !== 'agendado' && norm(addressOf(c)).includes(q))
  ).slice(0, 60)

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-zinc-500">{tenant?.name}</p>
          <h1 className="text-2xl font-bold text-zinc-900 truncate">{greeting(profileName, tenant?.name)}</h1>
        </div>
        <button type="button" onClick={() => setSearchOpen(true)} aria-label="Buscar chamado"
          className="w-11 h-11 rounded-full bg-white border border-zinc-200 shadow-sm flex items-center justify-center flex-shrink-0 active:scale-95 transition">
          <Search className="w-5 h-5" style={{ color: 'var(--primary)' }} />
        </button>
      </div>

      {openVisit && (
        <Link href={`/dashboard/chamados/${openVisit.call_id}`}
          className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-emerald-50 border border-emerald-200">
          <Timer className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Serviço em andamento</p>
            <p className="text-sm font-medium text-zinc-800 truncate">
              {openVisit.call?.client?.name ?? openVisit.call?.contact_name ?? 'Chamado'}
            </p>
          </div>
          <span className="text-lg font-bold tabular-nums text-emerald-700">
            {formatDuration(now - new Date(openVisit.started_at).getTime())}
          </span>
        </Link>
      )}

      {/* Chamados de hoje — na ordem da agenda, com cadeado nos próximos */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <p className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Seus chamados de hoje
          </p>
          <Link href="/dashboard/chamados" className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>Ver todos</Link>
        </div>
        {today === null ? (
          <div className="p-4 space-y-2">
            {[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-zinc-50 rounded-lg animate-pulse" />)}
          </div>
        ) : today.length === 0 && todayBlocks.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-400">Nenhum chamado agendado pra hoje</p>
        ) : (
          <div className="divide-y divide-zinc-50">
            {todayBlocks.map((b, i) => (
              <div key={`b${i}`} className="flex items-center gap-3 px-4 py-3 bg-zinc-100/70">
                <Lock className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-700 truncate">{blockLabel(b)} · {b.reason || 'Agenda bloqueada'}</p>
                  <p className="text-xs text-zinc-500">Sem atendimento nesse horário{b.repeat_weekly ? ' · toda semana' : ''}</p>
                </div>
              </div>
            ))}
            {today.map(c => {
              const lock = lockOf(c)
              const time = c.scheduled_time ? String(c.scheduled_time).slice(0, 5) : null
              const name = c.client?.name ?? c.contact_name ?? 'Sem identificação'
              const kind = callKind(c, visitsOf(c.id))
              const tags = (
                <>
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[11px] font-semibold border align-middle ${CALL_KIND_STYLE[kind]}`}>{kind}</span>
                  {c.call_neighborhood && <span className="ml-1.5 text-xs font-normal text-zinc-500">{c.call_neighborhood}</span>}
                </>
              )
              if (lock.locked) {
                return (
                  <Link key={c.id} href={`/dashboard/chamados/${c.id}`} className="flex items-center gap-3 px-4 py-3 bg-zinc-50/60 hover:bg-zinc-100 transition">
                    <Lock className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-600 truncate">{time && `${time} · `}{name}{tags}</p>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {[c.service_category, lock.message].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </Link>
                )
              }
              return (
                <Link key={c.id} href={`/dashboard/chamados/${c.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-800 truncate">
                      {time && <span style={{ color: 'var(--primary)' }}>{time} · </span>}{name}{tags}
                    </p>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">
                      {[c.service_category, [c.call_address, c.address_number].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-300 flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Seletor de mês do resumo */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-zinc-100 px-4 py-2.5 shadow-sm">
        <button onClick={() => setMonthOffset(o => o - 1)} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="font-semibold text-zinc-800 capitalize text-sm">Resumo de {monthLabel}</p>
        <button onClick={() => setMonthOffset(o => Math.min(0, o + 1))} disabled={monthOffset === 0}
          className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 disabled:opacity-30">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Comissão do mês */}
      <Link href="/dashboard/comissao"
        className="block rounded-3xl p-5 text-white shadow-sm"
        style={{ background: 'var(--primary)' }}>
        <div className="flex items-center gap-2 text-white/80 text-xs font-medium uppercase tracking-wide">
          <Wallet className="w-4 h-4" /> Comissão a receber · esta semana
        </div>
        <p className="text-3xl font-bold mt-1">{weekPending === null ? '—' : fmt(weekPending)}</p>
        <p className="text-sm text-white/80 mt-1 capitalize">
          Total de {monthLabel}: {loading ? '—' : fmt(data.commissionMonth)}
        </p>
      </Link>

      {/* Contagem de chamados do mês */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ key, label, value, icon: Icon, color, bg }) => (
          <button key={key} type="button" onClick={() => setListKey(key)} disabled={loading}
            className="text-left bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm active:scale-[0.98] transition">
            <div className="flex items-center justify-between">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-300" />
            </div>
            <p className="text-2xl font-bold text-zinc-900 mt-2">{loading ? '—' : value}</p>
            <p className="text-xs text-zinc-500 font-medium">{label}</p>
          </button>
        ))}
      </div>

      {/* Lista do card tocado */}
      {listKey && (
        <Sheet title={`${cards.find(c => c.key === listKey)!.label} · ${monthLabel}`} onClose={() => setListKey(null)}>
          {listCalls.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">Nenhum chamado aqui neste mês</p>
          ) : (
            <div className="divide-y divide-zinc-100 -mt-2">
              {listCalls.map(c => <CallRow key={c.id} c={c} />)}
            </div>
          )}
        </Sheet>
      )}

      {/* Busca por cliente ou endereço */}
      {searchOpen && (
        <Sheet title="Buscar chamado" onClose={() => { setSearchOpen(false); setQuery('') }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input type="text" inputMode="search" autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Nome do cliente ou endereço..."
              className="w-full pl-9 pr-9 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            {query && <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400"><X className="w-4 h-4" /></button>}
          </div>
          <div className="min-h-[40dvh]">
            {allCalls === null ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-zinc-50 rounded-lg animate-pulse" />)}</div>
            ) : q.length < 2 ? (
              <p className="py-8 text-center text-sm text-zinc-400">Digite o nome do cliente ou a rua pra achar o serviço e abrir a ordem.</p>
            ) : results.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-400">Nenhum chamado encontrado</p>
            ) : (
              <div className="divide-y divide-zinc-100 -mt-2">
                {results.map(c => <CallRow key={c.id} c={c} />)}
              </div>
            )}
          </div>
        </Sheet>
      )}
    </div>
  )
}
