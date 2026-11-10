'use client'

import { useState } from 'react'
import { Radio, Plus, X, Loader2, Check, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/lib/tenant-context'
import { BASE_CHANNELS, customChannels, channelValueOf, type Channel } from '@/lib/channels'

// Configurações: canais de atendimento (por onde o cliente chegou).
// Os 5 padrão ficam sempre; aqui a empresa cria os dela (ex.: Google Maps).
export default function ChannelSettings() {
  const { tenant, updateTenant } = useTenant()
  const [list, setList] = useState<Channel[]>(() => customChannels(tenant))
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function add() {
    const label = name.trim()
    const value = channelValueOf(label)
    if (!label || !value) return
    if ([...BASE_CHANNELS, ...list].some(c => c.value === value)) { setError('Esse canal já existe.'); return }
    setList(prev => [...prev, { value, label }])
    setName(''); setError(''); setSaved(false)
  }

  async function save() {
    if (!tenant) return
    setSaving(true); setError('')
    try {
      const supabase = createClient()
      const { data: current, error: readErr } = await supabase.from('tenants').select('call_form_config').eq('id', tenant.id).single()
      if (readErr) throw readErr
      const merged = { ...(current?.call_form_config ?? {}), custom_channels: list }
      const { error: writeErr } = await supabase.from('tenants').update({ call_form_config: merged }).eq('id', tenant.id)
      if (writeErr) throw writeErr
      updateTenant({ call_form_config: merged })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      console.error(e)
      setError('Não foi possível salvar os canais.')
    } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl border p-6 space-y-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
        <Radio className="w-5 h-5" style={{ color: 'var(--primary)' }} />
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Canais de Atendimento</h2>
      </div>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Por onde o cliente chegou. Aparecem no cadastro do chamado, nos filtros e nos relatórios.</p>

      <div className="flex flex-wrap gap-2">
        {BASE_CHANNELS.map(c => (
          <span key={c.value} className="px-3 py-1.5 rounded-lg text-sm font-medium border" style={{ background: 'var(--surface-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{c.label}</span>
        ))}
        {list.map(c => (
          <span key={c.value} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--primary)' }}>
            {c.label}
            <button type="button" onClick={() => { setList(prev => prev.filter(x => x.value !== c.value)); setSaved(false) }} className="opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Novo canal (ex.: Google Maps, Instagram...)" className="input-field py-2.5 text-sm flex-1" />
        <button type="button" onClick={add} disabled={!name.trim()} className="btn-primary text-sm px-4 py-2.5"><Plus className="w-4 h-4" /> Adicionar</button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="btn-primary text-sm px-5 py-2.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Salvo!' : 'Salvar Canais'}
        </button>
      </div>
    </div>
  )
}
