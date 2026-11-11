'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Loader2 } from 'lucide-react'
import { tecnicoChangeOutcome } from '@/lib/db/service-visits'
import { toastSuccess } from '@/components/Toast'

const OPTIONS = [
  { value: 'aprovado', label: 'Cliente aprovou', cls: 'bg-emerald-500 text-white border-emerald-500' },
  { value: 'orcamento', label: 'Orçamento', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'nao_aprovou', label: 'Não aprovou', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'pagou_somente_visita', label: 'Pagou a visita', cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
] as const

const LABEL: Record<string, string> = { orcamento: 'Orçamento', nao_aprovou: 'Não aprovou', pagou_somente_visita: 'Pagou a visita' }

// Técnico: chamado recusado ou orçamento → pode mudar o resultado.
// "Cliente aprovou" leva direto pra completar a OS.
export default function ChangeOutcome({ callId, status, onChanged }: { callId: string; status: string; onChanged: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function change(v: typeof OPTIONS[number]['value']) {
    setBusy(v); setError('')
    try {
      await tecnicoChangeOutcome(callId, v)
      if (v === 'aprovado') {
        toastSuccess('Aprovado! Complete a OS.')
        router.push(`/dashboard/chamados/${callId}/finalizar`)
        return
      }
      toastSuccess('Resultado alterado!')
      setOpen(false)
      onChanged()
    } catch (e: any) {
      setError(e?.message?.includes('tecnico_change_outcome') ? 'Rode a migration_v31.sql no Supabase.' : (e?.message ?? 'Não foi possível alterar.'))
    } finally { setBusy(null) }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Resultado</p>
          <p className="text-slate-800 font-semibold">{LABEL[status] ?? status}</p>
        </div>
        {!open && (
          <button type="button" onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700">
            <RefreshCw className="w-4 h-4" /> Mudar resultado
          </button>
        )}
      </div>
      {open && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {OPTIONS.filter(o => o.value !== status).map(o => (
              <button key={o.value} type="button" onClick={() => change(o.value)} disabled={!!busy}
                className={`py-3 rounded-xl text-sm font-bold border transition disabled:opacity-60 ${o.cls} ${o.value === 'aprovado' ? 'col-span-2' : ''}`}>
                {busy === o.value ? <Loader2 className="w-4 h-4 animate-spin inline" /> : o.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setOpen(false)} className="w-full py-2 text-sm text-slate-500">Cancelar</button>
        </>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
