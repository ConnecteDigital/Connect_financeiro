'use client'

// Número, complemento (bloco/casa/apto) e referência — usado em todo lugar
// onde a Rodrigues digita um endereço.
export default function AddressExtraFields({ number, complement, reference, onChange, inputClassName, labelClassName }: {
  number: string
  complement: string
  reference: string
  onChange: (field: 'number' | 'complement' | 'reference', value: string) => void
  inputClassName: string
  labelClassName?: string
}) {
  const label = labelClassName ?? 'block text-sm font-medium text-slate-700 mb-1.5'
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label className={label}>Número</label>
        <input type="text" value={number} onChange={e => onChange('number', e.target.value)}
          placeholder="Ex: 25" className={inputClassName} />
      </div>
      <div className="sm:col-span-2">
        <label className={label}>Complemento</label>
        <input type="text" value={complement} onChange={e => onChange('complement', e.target.value)}
          placeholder="Bloco, casa, apto..." className={inputClassName} />
      </div>
      <div className="sm:col-span-3">
        <label className={label}>Referência <span className="text-slate-400 font-normal">(opcional)</span></label>
        <input type="text" value={reference} onChange={e => onChange('reference', e.target.value)}
          placeholder="Ex: perto da padaria, portão azul..." className={inputClassName} />
      </div>
    </div>
  )
}
