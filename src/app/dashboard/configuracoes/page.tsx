'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Trash2, Save, Settings, Loader2, Wrench, UserCog, Power, Globe, X, Check, ToggleLeft, ToggleRight } from 'lucide-react'
import { getTeams, createTeam, deleteTeam } from '@/lib/db/teams'
import { getAllServiceTypes, createServiceType, toggleServiceType, deleteServiceType } from '@/lib/db/service-types'
import { getAuxiliaries, createAuxiliary, deleteAuxiliary } from '@/lib/db/auxiliaries'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/lib/tenant-context'

const ORIGIN_PRESETS = [
  'Indicação', 'WhatsApp', 'Site', 'Instagram',
  'Facebook', 'Google', 'Terceirizado', 'Telefone',
]

export default function ConfiguracoesPage() {
  const { tenant } = useTenant()
  const [loading, setLoading] = useState(true)

  // Commissions
  const [enableCommissions, setEnableCommissions] = useState(false)
  const [savingCommissions, setSavingCommissions] = useState(false)

  // Equipes
  const [teams, setTeams] = useState<any[]>([])
  const [newTeam, setNewTeam] = useState('')
  const [savingTeam, setSavingTeam] = useState(false)

  // Tipos de serviço
  const [serviceTypes, setServiceTypes] = useState<any[]>([])
  const [newServiceType, setNewServiceType] = useState('')
  const [newServiceCategory, setNewServiceCategory] = useState('')
  const [savingServiceType, setSavingServiceType] = useState(false)

  // Auxiliares
  const [auxiliaries, setAuxiliaries] = useState<any[]>([])
  const [newAuxName, setNewAuxName] = useState('')
  const [newAuxPct, setNewAuxPct] = useState('')
  const [newAuxType, setNewAuxType] = useState<'tecnico' | 'dono'>('tecnico')
  const [savingAux, setSavingAux] = useState(false)

  // Origens dos chamados
  const [origins, setOrigins] = useState<string[]>([])
  const [customOrigin, setCustomOrigin] = useState('')
  const [savingOrigins, setSavingOrigins] = useState(false)
  const [originsSaved, setOriginsSaved] = useState(false)

  useEffect(() => {
    if (tenant?.call_origins) setOrigins(tenant.call_origins)
    if (tenant) setEnableCommissions(tenant.enable_commissions ?? false)
  }, [tenant])

  useEffect(() => {
    Promise.all([getTeams(), getAllServiceTypes(), getAuxiliaries()])
      .then(([tms, sts, auxs]) => {
        setTeams(tms)
        setServiceTypes(sts)
        setAuxiliaries(auxs)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleToggleCommissions() {
    if (!tenant) return
    const next = !enableCommissions
    setSavingCommissions(true)
    try {
      const supabase = createClient()
      await supabase.from('tenants').update({ enable_commissions: next }).eq('id', tenant.id)
      setEnableCommissions(next)
    } finally {
      setSavingCommissions(false)
    }
  }

  function toggleOrigin(o: string) {
    setOrigins(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o])
    setOriginsSaved(false)
  }

  function addCustomOrigin() {
    const v = customOrigin.trim()
    if (!v || origins.includes(v)) return
    setOrigins(prev => [...prev, v])
    setCustomOrigin('')
    setOriginsSaved(false)
  }

  async function handleSaveOrigins() {
    if (!tenant) return
    setSavingOrigins(true)
    try {
      const supabase = createClient()
      await supabase.from('tenants').update({ call_origins: origins }).eq('id', tenant.id)
      setOriginsSaved(true)
    } finally {
      setSavingOrigins(false)
    }
  }

  // ── Equipes ──
  async function handleAddTeam() {
    if (!newTeam.trim()) return
    setSavingTeam(true)
    try {
      const team = await createTeam(newTeam.trim())
      setTeams(t => [...t, team])
      setNewTeam('')
    } finally {
      setSavingTeam(false)
    }
  }

  async function handleDeleteTeam(id: string) {
    if (!confirm('Remover esta equipe?')) return
    await deleteTeam(id)
    setTeams(t => t.filter(x => x.id !== id))
  }

  // ── Tipos de serviço ──
  async function handleAddServiceType() {
    if (!newServiceType.trim()) return
    setSavingServiceType(true)
    try {
      const st = await createServiceType(newServiceType.trim(), newServiceCategory.trim() || undefined)
      setServiceTypes(s => [...s, st])
      setNewServiceType('')
      setNewServiceCategory('')
    } finally {
      setSavingServiceType(false)
    }
  }

  async function handleToggleServiceType(id: string, active: boolean) {
    const updated = await toggleServiceType(id, !active)
    setServiceTypes(s => s.map(x => x.id === id ? updated : x))
  }

  async function handleDeleteServiceType(id: string) {
    if (!confirm('Remover este tipo de serviço?')) return
    await deleteServiceType(id)
    setServiceTypes(s => s.filter(x => x.id !== id))
  }

  // ── Auxiliares ──
  async function handleAddAuxiliary() {
    if (!newAuxName.trim()) return
    setSavingAux(true)
    try {
      const aux = await createAuxiliary(newAuxName.trim(), Number(newAuxPct) || 0, newAuxType)
      setAuxiliaries(a => [...a, aux])
      setNewAuxName('')
      setNewAuxPct('')
      setNewAuxType('tecnico')
    } finally {
      setSavingAux(false)
    }
  }

  async function handleDeleteAuxiliary(id: string) {
    if (!confirm('Remover este auxiliar?')) return
    await deleteAuxiliary(id)
    setAuxiliaries(a => a.filter(x => x.id !== id))
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Configurações</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Gerencie equipes, tipos de serviço, auxiliares e preferências do sistema</p>
      </div>

      {/* Módulo de Comissões */}
      <div className="rounded-xl border p-6 space-y-3"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <UserCog className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Módulo de Comissões</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Ativar controle de comissões</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Permite múltiplos auxiliares por chamado, comissão do dono e geração automática de saídas
            </p>
          </div>
          <button onClick={handleToggleCommissions} disabled={savingCommissions}
            className="flex items-center gap-2 transition flex-shrink-0 ml-4"
            style={{ opacity: savingCommissions ? 0.6 : 1 }}>
            {savingCommissions
              ? <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
              : enableCommissions
                ? <ToggleRight className="w-10 h-10" style={{ color: 'var(--primary)' }} />
                : <ToggleLeft className="w-10 h-10" style={{ color: 'var(--text-tertiary)' }} />
            }
          </button>
        </div>
        {enableCommissions && (
          <div className="rounded-lg px-4 py-3 text-xs" style={{ background: 'rgba(var(--primary-rgb),0.08)', color: 'var(--primary)' }}>
            ✓ Comissões ativas — múltiplos auxiliares e geração automática de saídas habilitados
          </div>
        )}
      </div>

      {/* Equipes */}
      <div className="rounded-xl border p-6 space-y-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <Users className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Equipes</h2>
        </div>

        <div className="space-y-2">
          {teams.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>Nenhuma equipe cadastrada</p>
          )}
          {teams.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-secondary)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
              <button onClick={() => handleDeleteTeam(t.id)} className="text-red-400 hover:text-red-600 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text" value={newTeam}
            onChange={e => setNewTeam(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTeam()}
            placeholder="Nome da nova equipe..."
            className="input-field py-2.5 text-sm flex-1"
          />
          <button onClick={handleAddTeam} disabled={savingTeam || !newTeam.trim()}
            className="btn-primary text-sm px-4 py-2.5">
            {savingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar
          </button>
        </div>
      </div>

      {/* Tipos de Serviço */}
      <div className="rounded-xl border p-6 space-y-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <Wrench className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Tipos de Serviço</h2>
        </div>

        <div className="space-y-2">
          {serviceTypes.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>Nenhum tipo de serviço cadastrado</p>
          )}
          {serviceTypes.map(st => (
            <div key={st.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-secondary)' }}>
              <div className="min-w-0">
                <span className={`text-sm font-medium ${!st.active ? 'line-through opacity-40' : ''}`} style={{ color: 'var(--text-primary)' }}>{st.name}</span>
                {st.category && <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>{st.category}</span>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleToggleServiceType(st.id, st.active)}
                  className={`p-1.5 rounded-lg transition ${st.active ? 'text-emerald-500 hover:bg-emerald-50' : 'hover:bg-slate-100'}`}
                  style={!st.active ? { color: 'var(--text-tertiary)' } : {}}
                  title={st.active ? 'Desativar' : 'Ativar'}>
                  <Power className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeleteServiceType(st.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Remover">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <input
            type="text" value={newServiceType}
            onChange={e => setNewServiceType(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddServiceType()}
            placeholder="Nome do tipo de serviço..."
            className="input-field py-2.5 text-sm flex-1 min-w-[180px]"
          />
          <input
            type="text" value={newServiceCategory}
            onChange={e => setNewServiceCategory(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddServiceType()}
            placeholder="Categoria (opcional)"
            className="input-field py-2.5 text-sm w-44"
          />
          <button onClick={handleAddServiceType} disabled={savingServiceType || !newServiceType.trim()}
            className="btn-primary text-sm px-4 py-2.5">
            {savingServiceType ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar
          </button>
        </div>
      </div>

      {/* Auxiliares / Comissões */}
      <div className="rounded-xl border p-6 space-y-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <UserCog className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {enableCommissions ? 'Técnicos e Donos' : 'Auxiliares'}
          </h2>
        </div>

        <div className="space-y-2">
          {auxiliaries.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>Nenhum auxiliar cadastrado</p>
          )}
          {auxiliaries.map(a => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-secondary)' }}>
              <div className="flex items-center gap-2">
                {enableCommissions && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={a.type === 'dono'
                      ? { background: 'rgba(139,92,246,0.15)', color: '#7c3aed' }
                      : { background: 'rgba(var(--primary-rgb),0.12)', color: 'var(--primary)' }
                    }>
                    {a.type === 'dono' ? 'Dono' : 'Técnico'}
                  </span>
                )}
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.name}</span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{Number(a.percentage)}%</span>
              </div>
              <button onClick={() => handleDeleteAuxiliary(a.id)} className="text-red-400 hover:text-red-600 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <input
            type="text" value={newAuxName}
            onChange={e => setNewAuxName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddAuxiliary()}
            placeholder="Nome..."
            className="input-field py-2.5 text-sm flex-1 min-w-[140px]"
          />
          <input
            type="number" min="0" max="100" step="0.01" value={newAuxPct}
            onChange={e => setNewAuxPct(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddAuxiliary()}
            placeholder="%"
            className="input-field py-2.5 text-sm w-20"
          />
          {enableCommissions && (
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              {(['tecnico', 'dono'] as const).map(t => (
                <button key={t} type="button" onClick={() => setNewAuxType(t)}
                  className="px-3 py-2 text-xs font-medium transition"
                  style={newAuxType === t
                    ? { background: 'var(--primary)', color: '#fff' }
                    : { background: 'var(--surface)', color: 'var(--text-secondary)' }
                  }>
                  {t === 'tecnico' ? 'Técnico' : 'Dono'}
                </button>
              ))}
            </div>
          )}
          <button onClick={handleAddAuxiliary} disabled={savingAux || !newAuxName.trim()}
            className="btn-primary text-sm px-4 py-2.5">
            {savingAux ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar
          </button>
        </div>
      </div>

      {/* Origens dos Chamados */}
      <div className="rounded-xl border p-6 space-y-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <Globe className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Origens dos Chamados</h2>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Canais pelos quais seus clientes entram em contato. Aparecem no formulário de criação de chamado.</p>

        <div className="flex flex-wrap gap-2">
          {ORIGIN_PRESETS.map(o => {
            const active = origins.includes(o)
            return (
              <button key={o} type="button" onClick={() => toggleOrigin(o)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition flex items-center gap-1.5"
                style={{
                  background: active ? 'var(--primary)' : 'var(--surface-secondary)',
                  borderColor: active ? 'var(--primary)' : 'var(--border)',
                  color: active ? '#fff' : 'var(--text-secondary)',
                }}>
                {active && <Check className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={3} />}
                {o}
              </button>
            )
          })}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={customOrigin}
            onChange={e => setCustomOrigin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomOrigin())}
            placeholder="Outro canal personalizado..."
            className="input-field py-2.5 text-sm flex-1"
          />
          <button onClick={addCustomOrigin} disabled={!customOrigin.trim()}
            className="btn-primary text-sm px-4 py-2.5">
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>

        {origins.filter(o => !ORIGIN_PRESETS.includes(o)).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {origins.filter(o => !ORIGIN_PRESETS.includes(o)).map(o => (
              <span key={o} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white"
                style={{ background: 'var(--primary)' }}>
                {o}
                <button type="button" onClick={() => toggleOrigin(o)} className="opacity-70 hover:opacity-100 transition">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{origins.length} canal{origins.length !== 1 ? 'is' : ''} selecionado{origins.length !== 1 ? 's' : ''}</p>
          <button onClick={handleSaveOrigins} disabled={savingOrigins}
            className="btn-primary text-sm px-5 py-2.5">
            {savingOrigins ? <Loader2 className="w-4 h-4 animate-spin" /> : originsSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {originsSaved ? 'Salvo!' : 'Salvar Origens'}
          </button>
        </div>
      </div>

      {/* Dados da empresa */}
      <div className="rounded-xl border p-6 space-y-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <Settings className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Dados da Empresa</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome da Empresa</label>
            <input type="text" defaultValue="Desentupidora Líder" className="input-field py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>CNPJ</label>
            <input type="text" defaultValue="50.773.617/0001-18" className="input-field py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Telefone</label>
            <input type="text" defaultValue="(51) 99960-8260" className="input-field py-2.5 text-sm" />
          </div>
        </div>

        <div className="flex justify-end">
          <button className="btn-primary text-sm px-5 py-2.5">
            <Save className="w-4 h-4" />
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
