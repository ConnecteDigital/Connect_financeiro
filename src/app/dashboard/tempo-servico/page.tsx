'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Timer, Pencil, Check, X, Loader2 } from 'lucide-react'
import { useTenant } from '@/lib/tenant-context'
import { getVisitsInRange, updateServiceVisit, VISIT_OUTCOME_LABEL } from '@/lib/db/service-visits'
import { formatDuration } from '@/lib/business-hours'

// "yyyy-mm-ddThh:mm" local, pro input datetime-local
function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function durationMs(v: any) {
  return v.finished_at ? new Date(v.finished_at).getTime() - new Date(v.started_at).getTime() : 0
}

// Relatório de tempo de serviço — só o dono da Rodrigues Refrigeração.
export default function TempoServicoPage() {
  const { tenant, isTecnico } = useTenant()
  const isRodrigues = tenant?.call_form_config?.rodrigues_custom === true
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [visits, setVisits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const start = new Date(month.getFullYear(), month.getMonth(), 1)
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 1)
    getVisitsInRange(start.toISOString(), end.toISOString())
      .then(setVisits)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [month])

  useEffect(() => { if (isRodrigues && !isTecnico) load() }, [load, isRodrigues, isTecnico])

  const summary = useMemo(() => {
    const map: Record<string, { name: string; count: number; total: number; done: number }> = {}
    for (const v of visits) {
      const key = v.auxiliary_id ?? 'sem'
      if (!map[key]) map[key] = { name: v.auxiliary?.name ?? 'Sem técnico', count: 0, total: 0, done: 0 }
      map[key].count++
      if (v.finished_at) { map[key].total += durationMs(v); map[key].done++ }
    }
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
  }, [visits])

  function startEdit(v: any) {
    setEditingId(v.id)
    setEditStart(toLocalInput(v.started_at))
    setEditEnd(toLocalInput(v.finished_at))
    setError('')
  }

  async function saveEdit(v: any) {
    if (!editStart) return
    const startIso = new Date(editStart).toISOString()
    const endIso = editEnd ? new Date(editEnd).toISOString() : null
    if (endIso && endIso < startIso) { setError('O fim não pode ser antes do início.'); return }
    setSaving(true)
    try {
      await updateServiceVisit(v.id, {
        started_at: startIso,
        ...(endIso ? { finished_at: endIso } : {}),
      })
      setEditingId(null)
      load()
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível salvar.')
    } finally { setSaving(false) }
  }

  if (!isRodrigues || isTecnico) {
    return <div className="max-w-2xl mx-auto py-20 text-center text-sm text-zinc-500">Esta página não está disponível.</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Tempo de Serviço</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Quanto tempo cada atendimento levou, do &quot;Iniciar&quot; ao &quot;Encerrar&quot;</p>
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl border border-zinc-100 px-4 py-3 shadow-sm">
        <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="p-1.5 hover:bg-zinc-100 rounded-lg transition text-zinc-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="font-semibold text-zinc-800 capitalize">
          {month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>
        <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="p-1.5 hover:bg-zinc-100 rounded-lg transition text-zinc-500">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Resumo por técnico */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          [...Array(2)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-zinc-100 animate-pulse" />)
        ) : summary.length === 0 ? (
          <p className="text-sm text-zinc-400 sm:col-span-3">Nenhum atendimento registrado neste mês.</p>
        ) : summary.map(s => (
          <div key={s.name} className="bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm">
            <p className="font-semibold text-zinc-800 flex items-center gap-2">
              <Timer className="w-4 h-4" style={{ color: 'var(--primary)' }} /> {s.name}
            </p>
            <div className="grid grid-cols-3 gap-2 mt-2 text-center">
              <div>
                <p className="text-lg font-bold text-zinc-900">{s.count}</p>
                <p className="text-[11px] text-zinc-500">visitas</p>
              </div>
              <div>
                <p className="text-lg font-bold text-zinc-900">{formatDuration(s.total)}</p>
                <p className="text-[11px] text-zinc-500">total</p>
              </div>
              <div>
                <p className="text-lg font-bold text-zinc-900">{s.done ? formatDuration(s.total / s.done) : '—'}</p>
                <p className="text-[11px] text-zinc-500">média</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Atendimentos */}
      {!loading && visits.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden divide-y divide-zinc-50">
          {visits.map(v => {
            const cliente = v.call?.client?.name ?? v.call?.contact_name ?? 'Sem identificação'
            const editing = editingId === v.id
            return (
              <div key={v.id} className="px-4 py-3 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/dashboard/chamados/${v.call_id}`} className="text-sm font-semibold text-zinc-800 hover:underline truncate block">
                      {cliente}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      {new Date(v.started_at).toLocaleDateString('pt-BR')} · {v.auxiliary?.name ?? 'Sem técnico'}
                      {' · '}{v.finished_at ? (VISIT_OUTCOME_LABEL[v.outcome] ?? v.outcome ?? 'Encerrado manualmente') : 'em andamento'}
                    </p>
                    {v.notes && <p className="text-xs text-zinc-400 mt-0.5">{v.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-zinc-800 tabular-nums">
                      {v.finished_at ? formatDuration(durationMs(v)) : <span className="text-amber-600">em andamento</span>}
                    </p>
                    <p className="text-xs text-zinc-500 tabular-nums">
                      {timeOf(v.started_at)}–{v.finished_at ? timeOf(v.finished_at) : '…'}
                    </p>
                  </div>
                  {!editing && (
                    <button onClick={() => startEdit(v)} title="Corrigir horários"
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 rounded-lg transition flex-shrink-0">
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {editing && (
                  <div className="flex flex-wrap items-end gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] text-zinc-500 mb-0.5">Início</label>
                      <input type="datetime-local" value={editStart} onChange={e => setEditStart(e.target.value)}
                        className="border border-zinc-200 rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-500 mb-0.5">Fim</label>
                      <input type="datetime-local" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                        className="border border-zinc-200 rounded-lg px-2 py-1.5 text-sm" />
                    </div>
                    <button onClick={() => saveEdit(v)} disabled={saving}
                      className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setEditingId(null)} disabled={saving}
                      className="p-2 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
