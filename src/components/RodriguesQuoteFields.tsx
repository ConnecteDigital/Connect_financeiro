'use client'

import { APPLIANCE_BRANDS, APPLIANCE_TYPES } from '@/lib/service-config'
import { QuoteDetails, VISIT_PERIODS } from '@/lib/rodrigues-doc'

// Orçamento da Rodrigues: campos que aparecem em "Informações básicas",
// "Visita técnica" e "Pagamento" do documento. Ficam em quotes.details.
export default function RodriguesQuoteFields({ value, onChange }: {
  value: QuoteDetails
  onChange: (v: QuoteDetails) => void
}) {
  const set = (patch: Partial<QuoteDetails>) => onChange({ ...value, ...patch })
  const label = 'block text-xs font-medium mb-1.5'
  const lStyle = { color: 'var(--text-secondary)' }
  const input = 'input-field py-2.5 text-sm'
  const customPeriod = !!value.visit_period && !VISIT_PERIODS.includes(value.visit_period)

  return (
    <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Informações básicas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label} style={lStyle}>Aparelho</label>
          <select value={value.appliance ?? ''} onChange={e => set({ appliance: e.target.value })} className={input}>
            <option value="">Selecionar...</option>
            {APPLIANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            {value.appliance && !APPLIANCE_TYPES.includes(value.appliance) && <option value={value.appliance}>{value.appliance}</option>}
          </select>
        </div>
        <div>
          <label className={label} style={lStyle}>Marca</label>
          <input list="rod-quote-brands" type="text" value={value.brand ?? ''} onChange={e => set({ brand: e.target.value })}
            className={input} placeholder="Ex: Brastemp" />
          <datalist id="rod-quote-brands">
            {APPLIANCE_BRANDS.filter(b => b !== 'Outra').map(b => <option key={b} value={b} />)}
          </datalist>
        </div>
        <div>
          <label className={label} style={lStyle}>Modelo</label>
          <input type="text" value={value.model ?? ''} onChange={e => set({ model: e.target.value })} className={input} placeholder="Ex: BRM50" />
        </div>
        <div>
          <label className={label} style={lStyle}>Defeito</label>
          <input type="text" value={value.defect ?? ''} onChange={e => set({ defect: e.target.value })} className={input} placeholder="Ex: Não gela" />
        </div>
        <div>
          <label className={label} style={lStyle}>Validade do orçamento (dias)</label>
          <input type="number" min="1" value={value.validity_days ?? ''} onChange={e => set({ validity_days: e.target.value })} className={input} placeholder="7" />
        </div>
        <div>
          <label className={label} style={lStyle}>Condições de pagamento</label>
          <input type="text" value={value.payment_conditions ?? ''} onChange={e => set({ payment_conditions: e.target.value })} className={input} placeholder="À vista." />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <div>
          <label className={label} style={lStyle}>Visita técnica — data</label>
          <input type="date" value={value.visit_date ?? ''} onChange={e => set({ visit_date: e.target.value })} className={input} />
        </div>
        <div>
          <label className={label} style={lStyle}>Visita técnica — horário</label>
          <select value={customPeriod ? '__outro' : (value.visit_period ?? '')}
            onChange={e => set({ visit_period: e.target.value === '__outro' ? ' ' : e.target.value })} className={input}>
            <option value="">Não mostrar</option>
            {VISIT_PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
            <option value="__outro">Outro horário...</option>
          </select>
          {customPeriod && (
            <input type="text" value={value.visit_period?.trim() ?? ''} onChange={e => set({ visit_period: e.target.value || ' ' })}
              className={`${input} mt-2`} placeholder="Ex: 14:00" />
          )}
        </div>
      </div>
    </div>
  )
}
