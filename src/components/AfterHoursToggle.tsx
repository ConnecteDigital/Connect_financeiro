'use client'

// OS da Rodrigues: marca se o serviço foi fora do horário comercial (vale
// a comissão "fora do horário" do técnico). O dono pode marcar/desmarcar;
// pro técnico é só informativo — o banco calcula sozinho ao salvar.
export function commissionPctFor(tecnico: any, afterHours: boolean): number | null {
  if (!tecnico) return null
  if (afterHours && tecnico.percentage_after_hours != null) return Number(tecnico.percentage_after_hours)
  return Number(tecnico.percentage ?? 0)
}

export default function AfterHoursToggle({ checked, onChange, readOnly, tecnico }: {
  checked: boolean
  onChange?: (v: boolean) => void
  readOnly?: boolean
  tecnico?: any
}) {
  const pct = commissionPctFor(tecnico, checked)

  if (readOnly) {
    return (
      <p className="text-sm text-slate-600 mt-2">
        Fora do horário comercial: <span className="font-semibold">{checked ? 'Sim' : 'Não'}</span>
        <span className="text-slate-400"> — calculado automaticamente</span>
      </p>
    )
  }

  return (
    <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={e => onChange?.(e.target.checked)}
        className="w-4 h-4 accent-orange-500" />
      <span className="text-sm text-slate-700">Fora do horário comercial</span>
      {pct != null && (
        <span className="text-xs text-slate-400">· comissão de {pct}%</span>
      )}
    </label>
  )
}
