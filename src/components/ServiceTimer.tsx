'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, CheckCircle, XCircle, Loader2, Timer, Camera, Paperclip, X, CalendarClock } from 'lucide-react'
import {
  getCallVisits, startServiceVisit, finishServiceVisit, VISIT_OUTCOME_LABEL, type VisitOutcome,
} from '@/lib/db/service-visits'
import { formatDuration } from '@/lib/business-hours'
import { useTenant } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/client'
import Portal from '@/components/Portal'

const END_REASONS: { value: VisitOutcome; label: string; date: 'required' | 'optional' | 'none'; notes: boolean; time?: boolean }[] = [
  { value: 'orcamento', label: 'Orçamento — cliente vai decidir', date: 'none', notes: false },
  { value: 'nao_aprovou', label: 'Cliente não aprovou', date: 'none', notes: false },
  { value: 'sem_conserto', label: 'Não tem conserto', date: 'none', notes: false },
  { value: 'pagou_somente_visita', label: 'Pagou somente a taxa', date: 'none', notes: false },
  { value: 'cliente_ausente', label: 'Cliente não estava em casa', date: 'optional', notes: false },
  { value: 'remarcado', label: 'Cliente remarcou', date: 'optional', notes: false },
  { value: 'faltou_peca', label: 'Faltou peça', date: 'optional', notes: false },
  { value: 'outro', label: 'Outro', date: 'optional', notes: true },
]

// No login do técnico o "Encerrar serviço" é só pra serviço que NÃO foi fechado
const TECNICO_END_REASONS: VisitOutcome[] = ['nao_aprovou', 'sem_conserto', 'pagou_somente_visita']

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
  const { isTecnico } = useTenant()
  const [visits, setVisits] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [endOpen, setEndOpen] = useState(false)
  // "Serviço aprovado": feito agora (vai pra OS) ou aprovado pra fazer em outro horário
  const [approveOpen, setApproveOpen] = useState(false)
  const [later, setLater] = useState(false)
  const [laterDate, setLaterDate] = useState('')
  const [laterTime, setLaterTime] = useState('')
  const [reason, setReason] = useState<VisitOutcome | null>(null)
  const [newDate, setNewDate] = useState('')
  const [notes, setNotes] = useState('')
  const [newTime, setNewTime] = useState('')
  // Fotos de como o técnico encontrou o aparelho (ficam no chamado e saem no relatório)
  const [photos, setPhotos] = useState<{ id: string; file: File; preview: string }[]>([])
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

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
      // Técnico completa a OS numa tela própria (não edita o chamado do dono)
      router.push(`/dashboard/chamados/${callId}/${isTecnico ? 'finalizar' : 'editar'}`)
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível encerrar o serviço.')
      setBusy(false)
    }
  }

  // Cliente aprovou, mas o técnico tem outro serviço agora: o chamado continua
  // agendado, já como aprovado, na nova data e horário
  async function handleApprovedLater() {
    if (!laterDate || !laterTime) { setError('Escolha a nova data e o horário.'); return }
    setBusy(true); setError('')
    try {
      await finishServiceVisit(callId, 'aprovado_reagendado', undefined, laterDate, laterTime)
      setApproveOpen(false); setLater(false); setLaterDate(''); setLaterTime('')
      load()
      onChanged()
    } catch (e: any) {
      setError(/resultado inv|p_new_time|finish_service_visit/i.test(e?.message ?? '') ? 'Falta rodar a migration_v38.sql no Supabase.' : (e?.message ?? 'Não foi possível salvar.'))
    } finally { setBusy(false) }
  }

  const endReasons = isTecnico ? END_REASONS.filter(r => TECNICO_END_REASONS.includes(r.value)) : END_REASONS
  const reasonCfg = endReasons.find(r => r.value === reason) ?? null
  const missing = !reasonCfg ? 'Escolha o motivo'
    : reasonCfg.date === 'required' && !newDate ? 'Escolha a nova data'
    : reasonCfg.time && !newTime ? 'Escolha o novo horário'
    : reasonCfg.notes && !notes.trim() ? 'Escreva uma observação'
    : ''
  const canConfirmEnd = !missing

  function addPhotos(list: FileList | null) {
    if (!list?.length) return
    setPhotos(prev => [...prev, ...Array.from(list).map(file => ({ id: `${Date.now()}${Math.random()}`, file, preview: URL.createObjectURL(file) }))])
  }

  async function handleEnd() {
    if (!canConfirmEnd || !reasonCfg) return
    setBusy(true); setError('')
    try {
      await finishServiceVisit(callId, reasonCfg.value, notes, reasonCfg.date === 'none' ? undefined : (newDate || undefined), reasonCfg.time ? (newTime || undefined) : undefined)
      // Fotos de como encontrou o aparelho: sobem depois de encerrar (se alguma falhar, o encerramento vale)
      if (photos.length > 0) {
        const storage = createClient().storage.from('chamados-anexos')
        await Promise.all(photos.map(({ file }, i) => {
          const safe = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
          return storage.upload(`${callId}/${Date.now() + i}_${safe}`, file).catch(console.error)
        }))
        photos.forEach(p => URL.revokeObjectURL(p.preview))
      }
      setEndOpen(false)
      setNotes(''); setNewDate(''); setNewTime(''); setReason(null); setPhotos([])
      load()
      onChanged()
    } catch (e: any) {
      setError(/resultado inv|p_new_time|finish_service_visit/i.test(e?.message ?? '') ? 'Esse motivo é novo: rode a migration_v38.sql no Supabase.' : (e?.message ?? 'Não foi possível encerrar o serviço.'))
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
            <button onClick={() => { setError(''); setLater(false); setApproveOpen(true) }} disabled={busy}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60 transition">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Serviço aprovado
            </button>
            <button onClick={() => setEndOpen(true)} disabled={busy}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-60 transition">
              <XCircle className="w-4 h-4" />
              {isTecnico ? 'Não aprovado' : 'Encerrar serviço'}
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

      {approveOpen && (
        <Portal>
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
            <h2 className="text-lg font-bold text-zinc-900">Serviço aprovado</h2>
            <div className="space-y-2">
              <button type="button" onClick={handleApproved} disabled={busy}
                className="w-full flex items-center gap-3 p-4 rounded-xl text-left bg-emerald-500 text-white disabled:opacity-60">
                {busy && !later ? <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" /> : <CheckCircle className="w-5 h-5 flex-shrink-0" />}
                <span><span className="block text-sm font-bold">Feito agora</span><span className="block text-xs opacity-90">Completar a ordem de serviço</span></span>
              </button>
              <button type="button" onClick={() => { setLater(true); setError('') }} disabled={busy}
                className="w-full flex items-center gap-3 p-4 rounded-xl text-left border transition"
                style={{ borderColor: later ? '#f97316' : '#e4e4e7', background: later ? '#fff7ed' : '#fff' }}>
                <CalendarClock className="w-5 h-5 flex-shrink-0 text-orange-500" />
                <span><span className="block text-sm font-bold text-zinc-800">Vou fazer em outro horário</span><span className="block text-xs text-zinc-500">Cliente aprovou, mas o serviço fica pra depois</span></span>
              </button>
            </div>
            {later && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Nova data *</label>
                    <input type="date" value={laterDate} onChange={e => setLaterDate(e.target.value)}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Novo horário *</label>
                    <input type="time" value={laterTime} onChange={e => setLaterTime(e.target.value)}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                </div>
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                  O chamado continua na agenda, já como aprovado, no dia e horário escolhidos.
                </p>
              </>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setApproveOpen(false); setError('') }} disabled={busy}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition">Cancelar</button>
              {later && (
                <button onClick={handleApprovedLater} disabled={busy || !laterDate || !laterTime}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-orange-500 disabled:opacity-50 transition">
                  {busy ? 'Salvando...' : 'Confirmar'}
                </button>
              )}
            </div>
          </div>
        </div>
        </Portal>
      )}

      {endOpen && (
        <Portal>
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
            <h2 className="text-lg font-bold text-zinc-900">{isTecnico ? 'Serviço não aprovado' : 'Encerrar serviço'}</h2>
            <div className="space-y-2">
              {endReasons.map(r => (
                <label key={r.value} className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition hover:bg-zinc-50"
                  style={{ borderColor: reason === r.value ? '#f97316' : '#e4e4e7' }}>
                  <input type="radio" name="endReason" checked={reason === r.value}
                    onChange={() => setReason(r.value)} className="accent-orange-500" />
                  <span className="text-sm font-medium text-zinc-700">{r.label}</span>
                </label>
              ))}
            </div>
            {reasonCfg && reasonCfg.date !== 'none' && (
              <div className={reasonCfg.time ? 'grid grid-cols-2 gap-3' : ''}>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                    Nova data {reasonCfg.date === 'required' ? '*' : '(opcional)'}
                  </label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                {reasonCfg.time && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1.5">Novo horário *</label>
                    <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  </div>
                )}
              </div>
            )}
            {reasonCfg?.time && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                O chamado continua na sua agenda, já como aprovado, no dia e horário escolhidos.
              </p>
            )}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Observação {reasonCfg?.notes ? '*' : '(opcional)'}
              </label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                placeholder="Ex: precisa de compressor 1/4 HP..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Foto de como encontrou o aparelho (opcional)</label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => cameraRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-orange-50 border border-orange-200 text-orange-600"><Camera className="w-4 h-4" /> Tirar foto</button>
                <button type="button" onClick={() => galleryRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-zinc-50 border border-zinc-200 text-zinc-600"><Paperclip className="w-4 h-4" /> Galeria</button>
              </div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
              <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { addPhotos(e.target.files); e.target.value = '' }} />
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {photos.map(p => (
                    <div key={p.id} className="relative rounded-lg overflow-hidden border border-zinc-200 bg-zinc-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.preview} alt="" className="w-full h-20 object-cover" />
                      <button type="button" onClick={() => { URL.revokeObjectURL(p.preview); setPhotos(l => l.filter(x => x.id !== p.id)) }}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {missing && <p className="text-xs text-zinc-400 text-center">{missing} pra confirmar.</p>}
            <div className="flex gap-3">
              <button onClick={() => { setEndOpen(false); setError('') }} disabled={busy}
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
        </Portal>
      )}
    </div>
  )
}
