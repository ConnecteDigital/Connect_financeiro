'use client'

import { useEffect, useState } from 'react'
import { UserCog, Save, Loader2, Check, Trash2, Plus } from 'lucide-react'
import { getAuxiliaries, updateAuxiliary, createAuxiliary, deleteAuxiliary } from '@/lib/db/auxiliaries'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/lib/tenant-context'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/business-hours'
import { toastSuccess } from '@/components/Toast'

interface TecRow { id: string; name: string; percentage: string; after: string }

// Configurações (Rodrigues): % de comissão de cada técnico em horário
// comercial e fora dele, e qual é o horário comercial da empresa.
export default function RodriguesCommissionSettings() {
  const { tenant, updateTenant } = useTenant()
  const [rows, setRows] = useState<TecRow[]>([])
  const [hours, setHours] = useState({ ...DEFAULT_BUSINESS_HOURS })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [newPct, setNewPct] = useState('')
  const [newAfter, setNewAfter] = useState('')
  const [adding, setAdding] = useState(false)

  function loadRows() {
    getAuxiliaries()
      .then(auxs => setRows(auxs
        .filter((a: any) => a.type === 'tecnico')
        .map((a: any) => ({
          id: a.id,
          name: a.name,
          percentage: String(a.percentage ?? ''),
          after: a.percentage_after_hours == null ? '' : String(a.percentage_after_hours),
        }))))
      .catch(console.error)
  }

  useEffect(() => { loadRows() }, [])

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    setError('')
    try {
      const created = await createAuxiliary(name, Number(newPct) || 0, 'tecnico')
      if (newAfter.trim() !== '') {
        await updateAuxiliary(created.id, { percentage_after_hours: Number(newAfter) })
      }
      setNewName(''); setNewPct(''); setNewAfter('')
      loadRows()
    } catch (e) {
      console.error(e)
      setError('Não foi possível adicionar o técnico.')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(row: TecRow) {
    const ok = confirm(
      `Excluir o técnico "${row.name}"?\n\n` +
      'O estoque dele será apagado junto, ele sai dos chamados em que está como técnico ' +
      'e o login dele deixa de funcionar como técnico. Isso não pode ser desfeito.'
    )
    if (!ok) return
    try {
      await deleteAuxiliary(row.id)
      setRows(prev => prev.filter(r => r.id !== row.id))
    } catch (e) {
      console.error(e)
      setError('Não foi possível excluir o técnico.')
    }
  }

  useEffect(() => {
    const bh = tenant?.call_form_config?.business_hours
    setHours({
      weekday_start: bh?.weekday_start || DEFAULT_BUSINESS_HOURS.weekday_start,
      weekday_end: bh?.weekday_end || DEFAULT_BUSINESS_HOURS.weekday_end,
      saturday_start: bh?.saturday_start || null,
      saturday_end: bh?.saturday_end || null,
    })
  }, [tenant])

  function updateRow(id: string, patch: Partial<TecRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
    setSaved(false)
  }

  async function handleSave() {
    if (!tenant) return
    setSaving(true)
    setError('')
    try {
      if (rows.some(r => !r.name.trim())) {
        setError('Todo técnico precisa ter um nome.')
        return
      }
      await Promise.all(rows.map(r => updateAuxiliary(r.id, {
        name: r.name.trim(),
        percentage: Number(r.percentage) || 0,
        percentage_after_hours: r.after.trim() === '' ? null : Number(r.after),
      })))

      // Mescla com o que já existe em call_form_config (rodrigues_custom etc.)
      const supabase = createClient()
      const { data: current, error: readErr } = await supabase
        .from('tenants').select('call_form_config').eq('id', tenant.id).single()
      if (readErr) throw readErr
      const business_hours = {
        weekday_start: hours.weekday_start || DEFAULT_BUSINESS_HOURS.weekday_start,
        weekday_end: hours.weekday_end || DEFAULT_BUSINESS_HOURS.weekday_end,
        saturday_start: hours.saturday_start || null,
        saturday_end: hours.saturday_end || null,
      }
      const merged = { ...(current?.call_form_config ?? {}), business_hours }
      const { error: writeErr } = await supabase.from('tenants').update({ call_form_config: merged }).eq('id', tenant.id)
      if (writeErr) throw writeErr
      updateTenant({ call_form_config: merged })
      setSaved(true)
      toastSuccess('Salvo!')
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      console.error(e)
      setError('Não foi possível salvar. Verifique se a migration_v25.sql foi executada no Supabase.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'input-field py-2 text-sm'

  return (
    <div className="rounded-xl border p-6 space-y-5"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
        <UserCog className="w-5 h-5" style={{ color: 'var(--primary)' }} />
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Técnicos e comissões</h2>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Horário comercial</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Seg–sex: início</label>
            <input type="time" value={hours.weekday_start ?? ''} onChange={e => { setHours(h => ({ ...h, weekday_start: e.target.value })); setSaved(false) }} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Seg–sex: fim</label>
            <input type="time" value={hours.weekday_end ?? ''} onChange={e => { setHours(h => ({ ...h, weekday_end: e.target.value })); setSaved(false) }} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Sábado: início</label>
            <input type="time" value={hours.saturday_start ?? ''} onChange={e => { setHours(h => ({ ...h, saturday_start: e.target.value || null })); setSaved(false) }} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Sábado: fim</label>
            <input type="time" value={hours.saturday_end ?? ''} onChange={e => { setHours(h => ({ ...h, saturday_end: e.target.value || null })); setSaved(false) }} className={inputCls} />
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Sábado em branco = sábado inteiro conta como fora do horário. Domingo é sempre fora do horário comercial.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Comissão por técnico (%)</p>
        {rows.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Nenhum técnico cadastrado.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_5rem_5rem_2rem] gap-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              <span>Técnico</span><span>Comercial</span><span>Fora do horário</span><span />
            </div>
            {rows.map(r => (
              <div key={r.id} className="grid grid-cols-[1fr_5rem_5rem_2rem] gap-2 items-center">
                <input type="text" value={r.name}
                  onChange={e => updateRow(r.id, { name: e.target.value })} className={inputCls} />
                <input type="number" min="0" max="100" step="0.01" value={r.percentage}
                  onChange={e => updateRow(r.id, { percentage: e.target.value })} className={inputCls} />
                <input type="number" min="0" max="100" step="0.01" value={r.after} placeholder={r.percentage || '—'}
                  onChange={e => updateRow(r.id, { after: e.target.value })} className={inputCls} />
                <button onClick={() => handleDelete(r)} title="Excluir técnico"
                  className="text-red-400 hover:text-red-600 transition flex justify-center">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              &quot;Fora do horário&quot; em branco = mesma comissão do horário comercial.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2 pt-1">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Adicionar técnico</p>
        <div className="grid grid-cols-[1fr_5rem_5rem_2rem] gap-2 items-center">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do técnico" className={inputCls} />
          <input type="number" min="0" max="100" step="0.01" value={newPct} onChange={e => setNewPct(e.target.value)} placeholder="%" className={inputCls} />
          <input type="number" min="0" max="100" step="0.01" value={newAfter} onChange={e => setNewAfter(e.target.value)} placeholder="%" className={inputCls} />
          <button onClick={handleAdd} disabled={adding || !newName.trim()} title="Adicionar"
            className="flex justify-center disabled:opacity-40 transition" style={{ color: 'var(--primary)' }}>
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Para o técnico entrar no aplicativo, o login dele é criado à parte e ligado a este cadastro pelo nome.
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm px-5 py-2.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}
