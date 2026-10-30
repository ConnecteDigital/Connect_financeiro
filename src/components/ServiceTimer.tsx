'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, CheckCircle, XCircle, Loader2, Timer } from 'lucide-react'
import {
  getCallVisits, startServiceVisit, finishServiceVisit, VISIT_OUTCOME_LABEL, type VisitOutcome,
} from '@/lib/db/service-visits'
import { formatDuration } from '@/lib/business-hours'

const END_REASONS: { value: VisitOutcome; label: string; date: 'required' | 'optional' | 'none'; notes: boolean }[] = [
  { value: 'remarcado', label: 'Faltou peça / remarcar', date: 'required', notes: false },
  { value: 'cliente_ausente', label: 'Cliente não estava em casa', date: 'optional', notes: false },
  { value: 'nao_aprovou', label: 'Cliente não aprovou', date: 'none', notes: false },
  { value: 'pagou_somente_visita', label: 'Pagou somente a visita', date: 'none', notes: false },
  { value: 'outro', label: 'Outro', date: 'optional', notes: true },
]

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// Iniciar / encerrar serviço (Rodrigues). O tempo nunca é guardado no
// celular: o banco grava a hora de início e a tela só mostra quanto passou
// desde então — fechar o app, trocar de aparelho etc. não perde nada.
export default function ServiceTimer({ callId, status, onChanged }: {
  callId: string
  status: string
  onChanged: () => void
}) {
  const router = useRouter()
  const [visits, setVisits] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [endOpen, setEndOpen] = useState(false)
  const [reason, setReason] = useState<VisitOutcome>('remarcado')
  const [newDate, setNewDate] = useState('')
  const [notes, setNotes] = useState('')

  const load = useCallback(() => {
    getCallVisits(callId)
      .then(setVisits)
      .catch(console.error)
      .finally(() => setLoaded(true))
  }, [callId])

  useEffect(() => { load() }, [load])

  const open = visits.find(v => !v.finished_at)
  const finished = visits.filter(v => v.finished_at)

  useEffect(() => {
    if (!open) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [open])

  async function handleStart() {
    setBusy(true); setError('')
    try {
      await startServiceVisit(callId)
      load()
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível iniciar o serviço.')
    } finally { setBusy(false) }
  }

  async function handleApproved() {
    setBusy(true); setError('')
    try {
      await finishServiceVisit(callId, 'aprovado')
      router.push(`/dashboard/chamados/${callId}/editar`)
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível encerrar o serviço.')
      setBusy(false)
    }
  }

  const reasonCfg = END_REASONS.find(r => r.value === reason)!
  const canConfirmEnd = (reasonCfg.date !== 'required' || !!newDate) && (!reasonCfg.notes || notes.trim().length > 0)

  async function handleEnd() {
    if (!canConfirmEnd) return
    setBusy(true); setError('')
    try {
      await finishServiceVisit(callId, reason, notes, reasonCfg.date === 'none' ? undefined : (newDate || undefined))
      setEndOpen(false)
      setNotes(''); setNewDate('')
      load()
      onChanged()
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível encerrar o serviço.')
    } finally { setBusy(false) }
  }

  if (!loaded) return null
  if (status !== 'agendado' && !open && finished.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
      <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
        <Timer className="w-4 h-4 text-blue-600" />
        Atendimento
      </h2>

      {open ? (
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-xs text-slate-500">Serviço em andamento desde {timeOf(open.started_at)}</p>
            <p className="text-4xl font-bold tabular-nums text-slate-800 mt-1">
              {formatDuration(now - new Date(open.started_at).getTime())}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleApproved} disabled={busy}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60 transition">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Serviço aprovado
            </button>
            <button onClick={() => setEndOpen(true)} disabled={busy}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-60 transition">
              <XCircle className="w-4 h-4" />
              Encerrar serviço
            </button>
          </div>
        </div>
      ) : status === 'agendado' && (
        <button onClick={handleStart} disabled={busy}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-bold text-white disabled:opacity-60 transition active:scale-[0.98]"
          style={{ background: 'var(--primary)' }}>
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
          Iniciar serviço
        </button>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {finished.length > 0 && (
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Visitas anteriores</p>
          {finished.map(v => (
            <div key={v.id} className="text-sm">
              <p className="text-slate-700">
                <span className="font-medium">{new Date(v.started_at).toLocaleDateString('pt-BR')}</span>
                {' · '}{timeOf(v.started_at)}–{timeOf(v.finished_at)}
                {' · '}<span className="font-semibold">{formatDuration(new Date(v.finished_at).getTime() - new Date(v.started_at).getTime())}</span>
              </p>
              <p className="text-xs text-slate-500">
                {VISIT_OUTCOME_LABEL[v.outcome] ?? v.outcome ?? 'Encerrado manualmente'}{v.notes ? ` — ${v.notes}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      {endOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
            <h2 className="text-lg font-bold text-zinc-900">Encerrar serviço</h2>
            <div className="space-y-2">
              {END_REASONS.map(r => (
                <label key={r.value} className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition hover:bg-zinc-50"
                  style={{ borderColor: reason === r.value ? '#f97316' : '#e4e4e7' }}>
                  <input type="radio" name="endReason" checked={reason === r.value}
                    onChange={() => setReason(r.value)} className="accent-orange-500" />
                  <span className="text-sm font-medium text-zinc-700">{r.label}</span>
                </label>
              ))}
            </div>
            {reasonCfg.date !== 'none' && (
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                  Nova data {reasonCfg.date === 'required' ? '*' : '(opcional)'}
                </label>
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Observação {reasonCfg.notes ? '*' : '(opcional)'}
              </label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                placeholder="Ex: precisa de compressor 1/4 HP..." />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEndOpen(false)} disabled={busy}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition">
                Cancelar
              </button>
              <button onClick={handleEnd} disabled={busy || !canConfirmEnd}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition">
                {busy ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
