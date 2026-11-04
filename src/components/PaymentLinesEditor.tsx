'use client'

import { useEffect, useRef } from 'react'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import { PAYMENT_METHOD_OPTIONS, PaymentLine, cardGross, paymentsSum } from '@/lib/payments'

const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400'

// Formas de pagamento divididas (Rodrigues). O dono informa também o valor
// líquido que caiu do cartão (showNet); o técnico nunca vê esse campo.
export default function PaymentLinesEditor({ lines, onChange, total, showNet = false, netValue = null, setNetValue }: {
  lines: PaymentLine[]
  onChange: (lines: PaymentLine[]) => void
  total: number
  showNet?: boolean
  netValue?: number | null
  setNetValue?: (v: number | null) => void
}) {
  // Com uma linha só, o valor acompanha o total até o usuário mexer nele
  const autoAmount = useRef(lines.length <= 1 && (lines[0]?.amount ?? 0) === 0)

  useEffect(() => {
    if (autoAmount.current && lines.length === 1 && lines[0].amount !== total) {
      onChange([{ ...lines[0], amount: total }])
    }
  }, [total, lines, onChange])

  function update(idx: number, patch: Partial<PaymentLine>) {
    if ('amount' in patch) autoAmount.current = false
    onChange(lines.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }

  function addLine() {
    const rest = Math.max(0, Math.round((total - paymentsSum(lines)) * 100) / 100)
    if (lines.length === 0) autoAmount.current = true
    else autoAmount.current = false
    onChange([...lines, { method: '', amount: lines.length === 0 ? total : rest }])
  }

  function removeLine(idx: number) {
    autoAmount.current = false
    onChange(lines.filter((_, i) => i !== idx))
  }

  const sum = paymentsSum(lines)
  const card = cardGross(lines)
  const mismatch = lines.length > 0 && total > 0 && Math.abs(sum - total) > 0.009
  const fee = showNet && card > 0 && netValue != null ? card - netValue : null

  return (
    <div className="space-y-2">
      {lines.map((l, idx) => (
        <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            {PAYMENT_METHOD_OPTIONS.map(m => (
              <button key={m} type="button" onClick={() => update(idx, { method: m })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${l.method === m ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                {m}
              </button>
            ))}
            <button type="button" onClick={() => removeLine(idx)} title="Remover"
              className="ml-auto p-1.5 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-36">
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor (R$)</label>
              <input type="number" min="0" step="0.01" value={l.amount || ''}
                onChange={e => update(idx, { amount: Number(e.target.value) })} className={inputCls} />
            </div>
            {l.method === 'Cartão' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Cartão</label>
                  <div className="flex gap-1.5">
                    {[{ v: 'debito', t: 'Débito' }, { v: 'credito', t: 'Crédito' }].map(o => (
                      <button key={o.v} type="button" onClick={() => update(idx, { card_type: o.v })}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${l.card_type === o.v ? 'text-white border-transparent bg-orange-500' : 'bg-white text-slate-500 border-slate-200'}`}>
                        {o.t}
                      </button>
                    ))}
                  </div>
                </div>
                {l.card_type === 'credito' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Parcelas</label>
                    <select value={l.installments ?? 1} onChange={e => update(idx, { installments: Number(e.target.value) })}
                      className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}x</option>)}
                    </select>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ))}

      <button type="button" onClick={addLine}
        className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 transition">
        <Plus className="w-4 h-4" /> {lines.length === 0 ? 'Adicionar forma de pagamento' : 'Adicionar outra forma de pagamento'}
      </button>

      {lines.length > 0 && (
        <p className={`text-xs flex items-center gap-1 ${mismatch ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
          {mismatch && <AlertTriangle className="w-3.5 h-3.5" />}
          Soma dos pagamentos: R$ {sum.toFixed(2)} · Total do serviço: R$ {total.toFixed(2)}
          {mismatch && ' — os valores não batem'}
        </p>
      )}

      {showNet && card > 0 && setNetValue && (
        <div className="p-3 rounded-lg border border-orange-100 bg-orange-50/50 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Valor líquido que caiu (cartão)</label>
            <input type="number" min="0" step="0.01" value={netValue ?? ''}
              onChange={e => setNetValue(e.target.value === '' ? null : Number(e.target.value))}
              placeholder="O que caiu na conta" className={inputCls} />
          </div>
          <div className="text-sm">
            <p className="text-xs text-slate-500">Total no cartão (bruto)</p>
            <p className="font-semibold text-slate-800">R$ {card.toFixed(2)}</p>
          </div>
          <div className="text-sm">
            <p className="text-xs text-slate-500">Taxa da maquininha</p>
            <p className={`font-semibold ${fee != null && fee > 0 ? 'text-red-500' : 'text-slate-400'}`}>
              {fee != null ? `R$ ${fee.toFixed(2)}` : 'aguardando o líquido'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
