'use client'

// Cartão (Rodrigues): débito/crédito, parcelas e o valor líquido que caiu
// da maquininha. A diferença bruto − líquido vira a saída "Taxa
// Maquininha" no financeiro (calculada no banco, migration_v23).
export default function RodriguesCardFields({ cardType, setCardType, installments, setInstallments, netValue, setNetValue, bruto }: {
  cardType: string
  setCardType: (v: string) => void
  installments: number
  setInstallments: (v: number) => void
  netValue: number | null
  setNetValue: (v: number | null) => void
  bruto: number
}) {
  const fee = netValue != null ? bruto - netValue : null
  return (
    <div className="mt-3 p-3 rounded-lg border border-orange-100 bg-orange-50/50 space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cartão: débito ou crédito?</label>
        <div className="flex gap-2">
          {[{ v: 'debito', l: 'Débito' }, { v: 'credito', l: 'Crédito' }].map(opt => (
            <button key={opt.v} type="button" onClick={() => setCardType(opt.v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${cardType === opt.v ? 'text-white border-transparent bg-orange-500' : 'bg-white text-slate-500 border-slate-200'}`}>
              {opt.l}
            </button>
          ))}
        </div>
      </div>
      {cardType === 'credito' && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Quantas vezes</label>
          <select value={installments} onChange={e => setInstallments(Number(e.target.value))}
            className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}x</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Valor líquido recebido (R$)</label>
          <input type="number" min="0" step="0.01" value={netValue ?? ''}
            onChange={e => setNetValue(e.target.value === '' ? null : Number(e.target.value))}
            placeholder="O que caiu na conta"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div className="text-sm">
          <p className="text-xs text-slate-500">Valor bruto (máquina)</p>
          <p className="font-semibold text-slate-800">R$ {bruto.toFixed(2)}</p>
        </div>
        <div className="text-sm">
          <p className="text-xs text-slate-500">Taxa da maquininha</p>
          <p className={`font-semibold ${fee != null && fee > 0 ? 'text-red-500' : 'text-slate-400'}`}>
            {fee != null ? `R$ ${fee.toFixed(2)}` : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}
