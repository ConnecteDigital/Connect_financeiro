'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, Trash2, Lock } from 'lucide-react'
import { getAuxiliaries } from '@/lib/db/auxiliaries'
import { createScheduleBlock, updateScheduleBlock, deleteScheduleBlock, type ScheduleBlock } from '@/lib/db/schedule-blocks'

const SUGGESTIONS = [30, 60, 90, 120, 180, 240]
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

const addMin = (t: string, min: number) => {
  const [h, m] = t.split(':').map(Number)
  const tot = Math.min(h * 60 + m + min, 23 * 60 + 59)
  return `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`
}

// Novo bloqueio / editar bloqueio da agenda (Rodrigues)
export default function ScheduleBlockModal({ day, block, defaultAuxiliaryId, onClose, onSaved }: {
  day: string
  block?: ScheduleBlock | null
  defaultAuxiliaryId?: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [auxId, setAuxId] = useState<string>(block?.auxiliary_id ?? defaultAuxiliaryId ?? '')
  const [date, setDate] = useState(block?.date ?? day)
  const [allDay, setAllDay] = useState(block?.all_day ?? false)
  const [start, setStart] = useState(block?.start_time?.slice(0, 5) ?? '08:00')
  const [end, setEnd] = useState(block?.end_time?.slice(0, 5) ?? '09:00')
  const [reason, setReason] = useState(block?.reason ?? '')
  const [weekly, setWeekly] = useState(block?.repeat_weekly ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getAuxiliaries().then(a => setTecnicos(a.filter((x: any) => x.type === 'tecnico'))).catch(console.error)
  }, [])

  const weekday = WEEKDAYS[new Date(date + 'T12:00:00').getDay()]
  const valid = allDay || (start && end && end > start)

  async function save() {
    if (!valid) { setError(allDay ? '' : 'O fim precisa ser depois do início.'); return }
    setSaving(true); setError('')
    try {
      const values = {
        auxiliary_id: auxId || null, date, all_day: allDay,
        start_time: allDay ? null : start, end_time: allDay ? null : end,
        reason: reason.trim() || null, repeat_weekly: weekly, repeat_until: null,
      }
      if (block) await updateScheduleBlock(block.id, values)
      else await createScheduleBlock(values)
      onSaved()
    } catch (e: any) {
      console.error(e)
      setError(e?.message?.includes('schedule_blocks') ? 'Rode a migration_v30.sql no Supabase.' : 'Não foi possível salvar o bloqueio.')
    } finally { setSaving(false) }
  }

  async function remove() {
    if (!block || !confirm(block.repeat_weekly ? 'Remover este bloqueio de todas as semanas?' : 'Remover este bloqueio?')) return
    setSaving(true)
    try { await deleteScheduleBlock(block.id); onSaved() }
    catch { setError('Não foi possível remover.') }
    finally { setSaving(false) }
  }

  const input = 'w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]'

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95dvh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-zinc-100 z-10">
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><Lock className="w-5 h-5 text-zinc-400" /> {block ? 'Editar bloqueio' : 'Bloquear agenda'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Técnico</label>
            <select value={auxId} onChange={e => setAuxId(e.target.value)} className={input}>
              <option value="">Todos os técnicos</option>
              {tecnicos.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">Dia inteiro</span>
            <button type="button" onClick={() => setAllDay(v => !v)}
              className={`w-12 h-7 rounded-full transition relative ${allDay ? 'bg-emerald-500' : 'bg-zinc-300'}`}>
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition ${allDay ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className={allDay ? 'col-span-3' : ''}>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Dia</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={input} />
            </div>
            {!allDay && (
              <>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Começa</label>
                  <input type="time" value={start} onChange={e => setStart(e.target.value)} className={input} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Termina</label>
                  <input type="time" value={end} onChange={e => setEnd(e.target.value)} className={input} />
                </div>
              </>
            )}
          </div>

          {!allDay && (
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1.5">Sugestões de duração</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map(m => (
                  <button key={m} type="button" onClick={() => setEnd(addMin(start, m))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${addMin(start, m) === end ? 'text-white border-transparent' : 'bg-white border-zinc-200 text-zinc-600'}`}
                    style={addMin(start, m) === end ? { background: 'var(--primary)' } : {}}>
                    {m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? '30' : ''}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-3 p-3 border border-zinc-200 rounded-xl cursor-pointer">
            <input type="checkbox" checked={weekly} onChange={e => setWeekly(e.target.checked)} className="w-5 h-5 accent-orange-500" />
            <span className="text-sm text-zinc-700">Repete toda semana <span className="text-zinc-400">(toda {weekday})</span></span>
          </label>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Motivo</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Lava-louças na loja, Pessoal, Cabelo..." className={input} maxLength={120} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            {block && (
              <button type="button" onClick={remove} disabled={saving} className="p-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50"><Trash2 className="w-5 h-5" /></button>
            )}
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-600">Cancelar</button>
            <button type="button" onClick={save} disabled={saving || !valid}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: 'var(--primary)' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
