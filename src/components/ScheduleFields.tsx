'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Clock } from 'lucide-react'
import { findScheduleConflicts, type Conflict } from '@/lib/db/schedule-blocks'

const DURATIONS = [30, 60, 90, 120, 180, 240]
const durLabel = (m: number) => m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? '30' : ''}`
const addMin = (t: string, min: number) => {
  const [h, m] = t.split(':').map(Number)
  const tot = h * 60 + m + min
  return `${String(Math.floor(tot / 60) % 24).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`
}

// Cadastro de chamado (Rodrigues): quanto tempo o serviço deve levar e
// aviso (só aviso, não trava) quando bate com outro chamado ou bloqueio
// do técnico.
export default function ScheduleFields({ auxiliaryId, day, time, duration, onDuration, ignoreCallId }: {
  auxiliaryId: string
  day: string
  time: string
  duration: number
  onDuration: (m: number) => void
  ignoreCallId?: string | null
}) {
  const [conflicts, setConflicts] = useState<Conflict[]>([])

  useEffect(() => {
    if (!auxiliaryId || !day || !time) { setConflicts([]); return }
    let alive = true
    const t = setTimeout(() => {
      findScheduleConflicts({ auxiliaryId, day, time, durationMin: duration, ignoreCallId })
        .then(c => { if (alive) setConflicts(c) })
        .catch(() => { if (alive) setConflicts([]) })
    }, 400)
    return () => { alive = false; clearTimeout(t) }
  }, [auxiliaryId, day, time, duration, ignoreCallId])

  return (
    <div className="sm:col-span-2 space-y-2">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-400" /> Duração prevista
          {time && <span className="text-xs font-normal text-slate-400">· até {addMin(time, duration)}</span>}
        </label>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map(m => (
            <button key={m} type="button" onClick={() => onDuration(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${duration === m ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'}`}>
              {durLabel(m)}
            </button>
          ))}
        </div>
      </div>
      {conflicts.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800">
          <p className="font-semibold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Esse horário bate com:</p>
          <ul className="mt-1 space-y-0.5 text-xs">
            {conflicts.map((c, i) => (
              <li key={i}>• {c.kind === 'bloqueio' ? 'Bloqueio' : 'Chamado'} · {c.label} · {c.range}</li>
            ))}
          </ul>
          <p className="text-xs mt-1 text-amber-700">Pode salvar mesmo assim, é só um aviso.</p>
        </div>
      )}
    </div>
  )
}
