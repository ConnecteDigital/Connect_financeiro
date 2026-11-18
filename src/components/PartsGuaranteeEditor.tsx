'use client'

import { Plus, Trash2 } from 'lucide-react'
import { PART_PERIODS, type PartGuarantee } from '@/lib/parts-guarantee'

// Garantia das peças: uma linha por peça, com o prazo de cada uma.
// `suggestions` são as peças já lançadas no serviço — um toque adiciona.
export default function PartsGuaranteeEditor({ value, onChange, suggestions = [], inputCls }: {
  value: PartGuarantee[]
  onChange: (v: PartGuarantee[]) => void
  suggestions?: string[]
  inputCls: string
}) {
  const set = (i: number, patch: Partial<PartGuarantee>) => onChange(value.map((g, idx) => idx === i ? { ...g, ...patch } : g))
  const used = new Set(value.map(g => g.part.trim().toLowerCase()))
  const pending = Array.from(new Set(suggestions.map(s => s.trim()).filter(Boolean))).filter(s => !used.has(s.toLowerCase()))

  return (
    <div className="space-y-2">
      {value.map((g, i) => (
        <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-xl bg-slate-50 sm:bg-transparent p-2 sm:p-0">
          {/* No celular o nome da peça ocupa a linha inteira (pra caber "Compressor Embraco 1/4") */}
          <input type="text" value={g.part} onChange={e => set(i, { part: e.target.value })}
            placeholder="Peça (ex: Compressor)" className={`${inputCls} !w-full sm:!w-auto sm:flex-1 min-w-0`} />
          <select value={g.period} onChange={e => set(i, { period: e.target.value })} className={`${inputCls} !w-auto flex-1 sm:flex-none sm:!w-28`}>
            {PART_PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
            {g.period && !PART_PERIODS.includes(g.period) && <option value={g.period}>{g.period}</option>}
          </select>
          <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))} aria-label="Remover garantia da peça"
            className="p-2 text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {pending.map(s => (
          <button key={s} type="button" onClick={() => onChange([...value, { part: s, period: '90 dias' }])}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-600 max-w-full">
            <Plus className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{s}</span>
          </button>
        ))}
        <button type="button" onClick={() => onChange([...value, { part: '', period: '90 dias' }])}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border border-dashed border-slate-300 text-slate-600">
          <Plus className="w-3.5 h-3.5" /> {pending.length > 0 ? 'Outra peça' : 'Adicionar garantia de peça'}
        </button>
      </div>
    </div>
  )
}
