'use client'

import { APPLIANCE_BRANDS, APPLIANCE_TYPES } from '@/lib/service-config'

interface Line { flatValue?: number; notes: string }

// Rodrigues: escolhe o aparelho (chips), e dentro dele a marca, o serviço
// (opcional) e — quando aprovado — o valor e a descrição. Por baixo fica
// uma única linha de serviço por chamado.
export default function RodriguesApplianceSection(props: {
  appliance: string
  onApplianceChange: (v: string) => void
  brand: string
  setBrand: (v: string) => void
  brandOther: string
  setBrandOther: (v: string) => void
  serviceNames: string[]
  service: string
  onServiceChange: (v: string) => void
  line?: Line
  onLineChange: (patch: Partial<Line>) => void
  showValues: boolean
  inputCls: string
}) {
  const { appliance, brand, service, line, inputCls } = props
  const chip = (active: boolean) =>
    `px-3 py-2 rounded-xl text-sm font-medium border transition ${active ? 'bg-orange-500 border-orange-500 text-white shadow-sm' : 'border-slate-200 text-slate-600 hover:border-orange-300 bg-white'}`

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Aparelho</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {APPLIANCE_TYPES.map(t => (
          <button key={t} type="button" onClick={() => props.onApplianceChange(appliance === t ? '' : t)} className={chip(appliance === t)}>
            {t}
          </button>
        ))}
      </div>

      {appliance && (
        <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-4 mt-3 space-y-3">
          <p className="text-sm font-bold text-orange-600">{appliance}</p>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Marca do Aparelho</label>
            <select value={brand} onChange={e => props.setBrand(e.target.value)} className={inputCls}>
              <option value="">Selecione...</option>
              {APPLIANCE_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            {brand === 'Outra' && (
              <input type="text" value={props.brandOther} onChange={e => props.setBrandOther(e.target.value)}
                placeholder="Digite a marca..." className={`${inputCls} mt-2`} />
            )}
          </div>

          {props.serviceNames.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Serviço <span className="text-slate-400 font-normal">(opcional)</span></label>
              <div className="flex flex-wrap gap-2">
                {props.serviceNames.map(s => (
                  <button key={s} type="button" onClick={() => props.onServiceChange(service === s ? '' : s)} className={chip(service === s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {props.showValues && line && (
            <div className="bg-white border border-orange-100 rounded-xl p-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Valor Total do Serviço (R$)</label>
                <input type="number" min="0" step="0.01" value={line.flatValue || ''}
                  onChange={e => props.onLineChange({ flatValue: Number(e.target.value) })}
                  className={inputCls} />
              </div>
              <input type="text" value={line.notes} onChange={e => props.onLineChange({ notes: e.target.value })}
                placeholder="Descrição do serviço..." className={inputCls} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
