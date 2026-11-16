'use client'

import { useCallback, useEffect, useState } from 'react'
import { Undo2, Loader2, Trash2, Plus } from 'lucide-react'
import { getOsRefunds, registerOsRefund, undoOsRefund, type OsRefund } from '@/lib/db/service-visits'
import { Sheet, input } from '@/components/LojaModals'
import { toastSuccess } from '@/components/Toast'
import { ptDate } from '@/lib/period'
import { localYmd } from '@/lib/tecnico-queue'

const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

// Rodrigues: devolução (estorno) de parte ou de todo o valor de um serviço
// já feito. O gestor lança aqui; o banco tira do caixa como saída "Estorno"
// e desconta do técnico a parte da comissão referente ao valor devolvido.
// O técnico (readOnly) só enxerga o que foi devolvido e quanto saiu da
// comissão dele.
export default function OsRefunds({ so, readOnly = false, onChanged }: { so: any; readOnly?: boolean; onChanged?: () => void }) {
  const [list, setList] = useState<OsRefund[] | null>(null)
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [date, setDate] = useState(localYmd())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => { getOsRefunds(so.id).then(setList) }, [so.id])
  useEffect(() => { load() }, [load])

  const refunded = (list ?? []).reduce((s, r) => s + r.amount, 0)
  const discounted = (list ?? []).reduce((s, r) => s + r.commission_discount, 0)
  const left = Math.max(Number(so.total_value || 0) - refunded, 0)
  const value = Number(String(amount).replace(',', '.'))

  async function save() {
    if (!(value > 0)) { setError('Informe o valor devolvido.'); return }
    if (value > left + 0.005) { setError(`A devolução não pode passar de ${fmt(left)}.`); return }
    setBusy(true); setError('')
    try {
      const r: any = await registerOsRefund(so.id, value, reason.trim(), date)
      const disc = Number(r?.commission_discount || 0)
      toastSuccess(disc > 0 ? `Devolução lançada. ${fmt(disc)} descontados da comissão do técnico.` : 'Devolução lançada no caixa.')
      setOpen(false); setAmount(''); setReason(''); setDate(localYmd())
      load(); onChanged?.()
    } catch (e: any) {
      const m = String(e?.message ?? '')
      setError(/register_os_refund|os_refunds/.test(m) ? 'Rode a migration_v34.sql no Supabase pra usar a devolução.' : (m || 'Não foi possível lançar a devolução.'))
    } finally { setBusy(false) }
  }

  async function undo(r: OsRefund) {
    if (!confirm(`Desfazer a devolução de ${fmt(r.amount)}? A saída some do caixa e o desconto volta pra comissão do técnico.`)) return
    try {
      await undoOsRefund(r.id)
      toastSuccess('Devolução desfeita')
      load(); onChanged?.()
    } catch (e: any) { alert(e?.message ?? 'Não foi possível desfazer.') }
  }

  if (readOnly) {
    if (!list || list.length === 0) return null
    return (
      <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5 text-sm space-y-1">
        <p className="font-semibold text-red-700">Devolução ao cliente: {fmt(refunded)}</p>
        {list.map(r => (
          <p key={r.id} className="text-xs text-red-700">{ptDate(r.date)} · {fmt(r.amount)}{r.reason ? ` — ${r.reason}` : ''}</p>
        ))}
        {discounted > 0 && <p className="text-xs text-red-700">Descontado da sua comissão: <b>{fmt(discounted)}</b></p>}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
          <Undo2 className="w-4 h-4 text-red-500" /> Devolução / estorno
        </h2>
        {left > 0 && (
          <button type="button" onClick={() => { setError(''); setOpen(true) }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition">
            <Plus className="w-3.5 h-3.5" /> Lançar devolução
          </button>
        )}
      </div>

      {!list || list.length === 0 ? (
        <p className="text-xs text-slate-400">Precisou devolver dinheiro pro cliente? Lance aqui: sai do caixa como estorno e a comissão do técnico é ajustada.</p>
      ) : (
        <>
          <div className="divide-y divide-slate-50">
            {list.map(r => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="text-slate-700 font-medium">{fmt(r.amount)} <span className="text-slate-400 font-normal">· {ptDate(r.date)}</span></p>
                  <p className="text-xs text-slate-500 truncate">
                    {r.reason || 'Sem motivo informado'}
                    {r.commission_discount > 0 ? ` · comissão −${fmt(r.commission_discount)}` : ' · sem desconto de comissão'}
                  </p>
                </div>
                <button type="button" onClick={() => undo(r)} title="Desfazer devolução" className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm font-semibold border-t border-slate-100 pt-2">
            <span className="text-slate-600">Total devolvido</span><span className="text-red-600">− {fmt(refunded)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Ficou do serviço</span><span className="text-slate-700 font-medium">{fmt(left)}</span>
          </div>
        </>
      )}

      {open && (
        <Sheet title="Devolução ao cliente" onClose={() => setOpen(false)}>
          <div className="flex justify-between items-center rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-3 text-sm">
            <span className="text-zinc-600">{so.os_number ?? 'Serviço'} · valor{refunded > 0 ? ' restante' : ''}</span>
            <span className="font-bold text-zinc-900">{fmt(left)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Valor devolvido (R$) *</label>
              <input type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={input} placeholder="0,00" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={input} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Motivo</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} className={input} placeholder="Ex: peça voltou a dar defeito" />
          </div>
          <p className="text-xs text-zinc-500">
            O valor sai do caixa como saída <b>Estorno</b>. A comissão do técnico deste serviço é descontada na mesma porcentagem
            (aparece como um lançamento negativo na comissão dele, na data da devolução).
          </p>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="flex-1 py-3 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-600">Cancelar</button>
            <button type="button" onClick={save} disabled={busy}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-red-500 disabled:opacity-60 flex items-center justify-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Lançar devolução
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}
