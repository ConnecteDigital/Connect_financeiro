'use client'

// Garantia da OS (Rodrigues): uma opção só. "Sem garantia" pede o motivo,
// que sai no bloco "Observações" da Ordem de Serviço.
export type GuaranteeKey = 'none' | '60' | '90' | '6m' | '1y'

export const GUARANTEE_OPTIONS: { key: GuaranteeKey; label: string }[] = [
  { key: '60', label: '60 dias' },
  { key: '90', label: '90 dias' },
  { key: '6m', label: '6 meses' },
  { key: '1y', label: '1 ano' },
  { key: 'none', label: 'Sem garantia' },
]

export function guaranteeFromOs(so: any): GuaranteeKey | '' {
  if (!so) return ''
  if (so.has_no_guarantee) return 'none'
  if (so.has_guarantee_1y) return '1y'
  if (so.has_guarantee_6m) return '6m'
  if (so.has_guarantee_90) return '90'
  if (so.has_guarantee_60) return '60'
  return ''
}

export function guaranteeFields(key: GuaranteeKey | '', reason: string) {
  return {
    has_no_guarantee: key === 'none',
    has_guarantee_60: key === '60',
    has_guarantee_90: key === '90',
    has_guarantee_6m: key === '6m',
    has_guarantee_1y: key === '1y',
    no_guarantee_reason: key === 'none' ? (reason.trim() || null) : null,
  }
}

export default function GuaranteePicker({ value, onChange, reason, onReason, inputCls }: {
  value: GuaranteeKey | ''
  onChange: (k: GuaranteeKey) => void
  reason: string
  onReason: (v: string) => void
  inputCls: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {GUARANTEE_OPTIONS.map(o => (
          <button key={o.key} type="button" onClick={() => onChange(o.key)}
            className={`px-3 py-2 rounded-xl text-sm font-medium border transition ${value === o.key ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300'}`}>
            {o.label}
          </button>
        ))}
      </div>
      {value === 'none' && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Por que não tem garantia? *</label>
          <textarea rows={2} value={reason} onChange={e => onReason(e.target.value)}
            placeholder="Ex: cliente não quis trocar a peça indicada, só limpeza..." className={`${inputCls} resize-none`} />
          <p className="text-xs text-slate-400 mt-1">Esse texto aparece na Ordem de Serviço, em Observações.</p>
        </div>
      )}
    </div>
  )
}
