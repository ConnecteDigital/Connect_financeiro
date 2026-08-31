'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Plus, Search, CheckCircle, XCircle, Clock, ChevronRight, ChevronLeft, List, CalendarDays, FileText } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getCalls, updateCall } from '@/lib/db/calls'
import { getOriginLabel } from '@/lib/use-call-origins'

type Status = 'todos' | 'agendado' | 'aprovado' | 'nao_quis_visita' | 'nao_aprovou' | 'cancelado'

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  agendado:        { label: 'Agendado',    color: 'bg-blue-50 text-blue-700 border-blue-200',        icon: Clock },
  aprovado:        { label: 'Aprovado',    color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  nao_quis_visita: { label: 'Não quis',   color: 'bg-zinc-100 text-zinc-600 border-zinc-200',        icon: XCircle },
  nao_aprovou:     { label: 'Não aprovou', color: 'bg-amber-50 text-amber-700 border-amber-200',      icon: XCircle },
  cancelado:       { label: 'Cancelado',  color: 'bg-red-50 text-red-600 border-red-200',            icon: XCircle },
}

const paymentConfig: Record<string, { label: string; color: string }> = {
  pago:        { label: 'Pago',    color: 'text-emerald-600' },
  pago_parcial:{ label: 'Parcial', color: 'text-amber-600' },
  pendente:    { label: 'Pendente',color: 'text-red-500' },
}


const filters: { value: Status; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'agendado', label: 'Agendado' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'nao_quis_visita', label: 'Não quis' },
  { value: 'nao_aprovou', label: 'Não aprovou' },
  { value: 'cancelado', label: 'Cancelado' },
]

export default function ChamadosPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<Status>('todos')
  const [originFilter, setOriginFilter] = useState('todos')
  const [calls, setCalls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [view, setView] = useState<'lista' | 'calendario'>('lista')
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [actionModal, setActionModal] = useState<{ callId: string; type: 'approve' | 'refuse' } | null>(null)
  const [actionNotes, setActionNotes] = useState('')
  const [actionRefuseReason, setActionRefuseReason] = useState('nao_aprovou')
  const [actionRefuseNotes, setActionRefuseNotes] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Agrupa os chamados por dia do serviço (usa a data agendada; sem ela, a data do chamado)
  const callsByDay = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const c of calls) {
      const day = c.scheduled_date ?? c.date
      if (!map[day]) map[day] = []
      map[day].push(c)
    }
    return map
  }, [calls])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 350)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCalls({ status: statusFilter, search: debouncedSearch })
      setCalls(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [statusFilter, debouncedSearch])

  // Contagem por origem (sobre todos os chamados carregados, antes do filtro de origem)
  const originCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of calls) {
      const o = c.origin ?? 'sem_origem'
      map[o] = (map[o] || 0) + 1
    }
    return map
  }, [calls])

  // Origens presentes nos chamados atuais
  const presentOrigins = useMemo(() => {
    return Object.keys(originCounts).filter(o => o !== 'sem_origem')
  }, [originCounts])

  // Filtro de origem aplicado client-side (já que getCalls carregou tudo)
  const filteredCalls = useMemo(() => {
    if (originFilter === 'todos') return calls
    return calls.filter(c => (c.origin ?? '') === originFilter)
  }, [calls, originFilter])

  useEffect(() => { load() }, [load])

  async function handleQuickApprove(callId: string, notes?: string) {
    setUpdatingId(callId)
    try {
      await updateCall(callId, { status: 'aprovado', ...(notes ? { notes } : {}) })
      router.push(`/dashboard/chamados/${callId}/editar`)
    } catch (e) {
      console.error(e)
      setUpdatingId(null)
    }
  }

  async function handleQuickRefuse(callId: string, reason: string, notes?: string) {
    setUpdatingId(callId)
    try {
      await updateCall(callId, { status: reason, ...(notes ? { notes } : {}) })
      setActionModal(null)
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Chamados</h1>
          <p className="text-zinc-500 text-sm mt-0.5 hidden sm:block">Gerencie chamados e ordens de serviço</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <button onClick={() => setView('lista')} title="Lista"
              className={`p-2.5 transition ${view === 'lista' ? 'text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
              style={view === 'lista' ? { background: 'var(--primary)' } : {}}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setView('calendario')} title="Calendário"
              className={`p-2.5 transition ${view === 'calendario' ? 'text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
              style={view === 'calendario' ? { background: 'var(--primary)' } : {}}>
              <CalendarDays className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => {
              const today = new Date()
              const d = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
              sessionStorage.setItem('resumo_dia_date', d)
              window.open('/resumo-dia', '_blank')
            }}
            className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border font-semibold transition"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--surface)' }}>
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Resumo do Dia</span>
          </button>
          <Link href="/dashboard/chamados/novo"
            className="flex items-center gap-2 btn-primary text-sm px-4 py-2.5 rounded-xl">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Chamado</span>
            <span className="sm:hidden">Novo</span>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input type="text" placeholder="Buscar cliente, contato ou código OS..."
          value={search} onChange={e => handleSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] shadow-sm" />
      </div>

      {/* Status filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
        {filters.map(f => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition ${
              statusFilter === f.value
                ? 'text-white border-transparent shadow-sm'
                : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
            }`}
            style={statusFilter === f.value ? { background: 'var(--primary)' } : {}}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Origin filters — só aparece se houver origens */}
      {presentOrigins.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
          <button onClick={() => setOriginFilter('todos')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              originFilter === 'todos'
                ? 'bg-zinc-800 text-white border-zinc-800'
                : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
            }`}>
            Todas origens
            <span className="text-[10px] opacity-70">({calls.length})</span>
          </button>
          {presentOrigins.map(origin => (
            <button key={origin} onClick={() => setOriginFilter(origin)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                originFilter === origin
                  ? 'bg-zinc-800 text-white border-zinc-800'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
              }`}>
              {getOriginLabel(origin)}
              <span className="text-[10px] opacity-70">({originCounts[origin]})</span>
            </button>
          ))}
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-zinc-100 p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : view === 'calendario' ? (
        <div className="space-y-3">
          {/* Navegação do mês */}
          <div className="flex items-center justify-between bg-white rounded-2xl border border-zinc-100 px-4 py-3 shadow-sm">
            <button onClick={() => { setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1)); setSelectedDay(null) }}
              className="p-1.5 hover:bg-zinc-100 rounded-lg transition text-zinc-500">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <p className="font-semibold text-zinc-800 capitalize">
              {calMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
            <button onClick={() => { setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1)); setSelectedDay(null) }}
              className="p-1.5 hover:bg-zinc-100 rounded-lg transition text-zinc-500">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Grade do mês */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-3 shadow-sm">
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-zinc-400 uppercase mb-2">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const year = calMonth.getFullYear()
                const month = calMonth.getMonth()
                const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
                const daysInMonth = new Date(year, month + 1, 0).getDate()
                const todayKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
                const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
                return cells.map((day, idx) => {
                  if (day === null) return <div key={`e${idx}`} />
                  const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const dayCalls = callsByDay[key] ?? []
                  const isToday = key === todayKey
                  const isSelected = key === selectedDay
                  return (
                    <button key={key} onClick={() => setSelectedDay(isSelected ? null : key)}
                      className="min-h-[52px] sm:min-h-[64px] rounded-lg border p-1 text-left transition flex flex-col"
                      style={isSelected ? { borderColor: 'var(--primary)', background: 'rgba(var(--primary-rgb),0.06)' } :
                             isToday ? { borderColor: 'var(--primary)', background: 'rgba(var(--primary-rgb),0.03)' } :
                             {}}>
                      <span className="text-xs font-semibold" style={isToday ? { color: 'var(--primary)' } : { color: '#52525b' }}>{day}</span>
                      {dayCalls.length > 0 && (
                        <span className="mt-auto self-center text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none" style={{ background: 'var(--primary)' }}>
                          {dayCalls.length}
                        </span>
                      )}
                    </button>
                  )
                })
              })()}
            </div>
          </div>

          {/* Chamados do dia selecionado */}
          {selectedDay && (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
              <p className="px-4 py-3 border-b border-zinc-100 text-sm font-semibold text-zinc-700">
                Chamados de {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {(callsByDay[selectedDay] ?? []).length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-zinc-400">Nenhum chamado neste dia</p>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {(callsByDay[selectedDay] ?? []).map(c => {
                    const cfg = statusConfig[c.status]
                    return (
                      <Link key={c.id} href={`/dashboard/chamados/${c.id}`}
                        className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-800 truncate">
                            {c.client?.name ?? c.contact_name ?? 'Sem identificação'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {c.scheduled_time && <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>🕐 {String(c.scheduled_time).slice(0, 5)}</span>}
                            {c.service_category && <span className="text-xs text-zinc-500 truncate">{c.service_category}</span>}
                          </div>
                        </div>
                        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg?.color}`}>{cfg?.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : filteredCalls.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center">
          <p className="text-zinc-400 text-sm">Nenhum chamado encontrado</p>
          <Link href="/dashboard/chamados/novo" className="text-sm font-medium mt-2 inline-block" style={{ color: 'var(--primary)' }}>
            Registrar novo chamado
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredCalls.map(c => {
            const so = c.service_orders?.[0]
            const cfg = statusConfig[c.status]
            const StatusIcon = cfg?.icon || Clock
            const pay = so ? paymentConfig[so.payment_status] : null
            const iconBg = c.status === 'aprovado' ? 'bg-emerald-50' : c.status === 'agendado' ? 'bg-blue-50' : c.status === 'cancelado' ? 'bg-red-50' : 'bg-zinc-50'
            const iconColor = c.status === 'aprovado' ? 'text-emerald-500' : c.status === 'agendado' ? 'text-blue-500' : c.status === 'cancelado' ? 'text-red-500' : 'text-zinc-400'

            return (
              <div key={c.id} className="bg-white rounded-2xl border border-zinc-100 hover:shadow-sm transition" style={{ ['--tw-border-opacity' as any]: 1 }} onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(var(--primary-rgb),0.35)')} onMouseLeave={e => (e.currentTarget.style.borderColor = '')}>
                <Link href={`/dashboard/chamados/${c.id}`}
                  className="flex items-start gap-3 p-4 active:scale-[0.99] transition">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    <StatusIcon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-zinc-900 text-sm truncate">
                        {c.client?.name ?? c.contact_name ?? 'Sem identificação'}
                      </p>
                      <ChevronRight className="w-4 h-4 text-zinc-300 flex-shrink-0" />
                    </div>
                    {c.service_category && <p className="text-xs text-zinc-500 mt-0.5">{c.service_category}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cfg?.color}`}>{cfg?.label}</span>
                      <span className="text-xs text-zinc-400">{new Date(c.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      <span className="text-xs text-zinc-400">{getOriginLabel(c.origin)}</span>
                    </div>
                    {so && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-50">
                        <span className={`text-xs font-semibold ${pay?.color}`}>{pay?.label}</span>
                        <span className="text-sm font-bold text-zinc-800">
                          R$ {Number(so.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
                {c.status === 'agendado' && (
                  <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                    <button onClick={() => { setActionModal({ callId: c.id, type: 'approve' }); setActionNotes('') }} disabled={updatingId === c.id}
                      className="py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition">
                      ✓ Aprovado?
                    </button>
                    <button onClick={() => { setActionModal({ callId: c.id, type: 'refuse' }); setActionRefuseReason('nao_aprovou'); setActionRefuseNotes('') }} disabled={updatingId === c.id}
                      className="py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition">
                      ✗ Recusado?
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            {actionModal.type === 'approve' ? (
              <>
                <h2 className="text-lg font-bold text-zinc-900">Chamado Aprovado</h2>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Observação (opcional)</label>
                  <textarea
                    value={actionNotes}
                    onChange={e => setActionNotes(e.target.value)}
                    rows={3}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                    placeholder="Adicione uma observação..."
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setActionModal(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition">
                    Cancelar
                  </button>
                  <button onClick={() => { setActionModal(null); handleQuickApprove(actionModal.callId, actionNotes || undefined) }}
                    disabled={updatingId === actionModal.callId}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition">
                    Confirmar Aprovação
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-zinc-900">Chamado Recusado</h2>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Motivo</label>
                  {[
                    { value: 'nao_aprovou', label: 'Não aprovou' },
                    { value: 'nao_quis_visita', label: 'Não quis visita' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition hover:bg-zinc-50"
                      style={{ borderColor: actionRefuseReason === opt.value ? '#f97316' : '#e4e4e7' }}>
                      <input type="radio" name="refuseReason" value={opt.value}
                        checked={actionRefuseReason === opt.value}
                        onChange={() => setActionRefuseReason(opt.value)}
                        className="accent-orange-500" />
                      <span className="text-sm font-medium text-zinc-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Descrição / Motivo (opcional)</label>
                  <textarea
                    value={actionRefuseNotes}
                    onChange={e => setActionRefuseNotes(e.target.value)}
                    rows={3}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                    placeholder="Ex: cliente achou o valor alto, já tem outro orçamento..."
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setActionModal(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition">
                    Cancelar
                  </button>
                  <button onClick={() => handleQuickRefuse(actionModal.callId, actionRefuseReason, actionRefuseNotes || undefined)}
                    disabled={updatingId === actionModal.callId}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition">
                    Confirmar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
