'use client'

import { useState, useEffect, useRef } from 'react'
import { Users, Plus, Trash2, Save, Settings, Loader2, Wrench, UserCog, Power, Globe, X, Check, ToggleLeft, ToggleRight, Star, Palette, Upload } from 'lucide-react'
import { getTeams, createTeam, deleteTeam } from '@/lib/db/teams'
import { getAllServiceTypes, createServiceType, toggleServiceType, deleteServiceType } from '@/lib/db/service-types'
import { getAuxiliaries, createAuxiliary, updateAuxiliary, deleteAuxiliary } from '@/lib/db/auxiliaries'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/lib/tenant-context'

const ORIGIN_PRESETS = [
  'Indicação', 'WhatsApp', 'Site', 'Instagram',
  'Facebook', 'Google', 'Terceirizado', 'Telefone',
]

const PRESET_COLORS = [
  '#f97316', '#3b82f6', '#8b5cf6', '#10b981',
  '#ef4444', '#f59e0b', '#06b6d4', '#ec4899',
]

function AddAuxForm({ type, savingAux, onAdd }: {
  type: 'tecnico' | 'dono'
  savingAux: boolean
  onAdd: (name: string, pct: number) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [pct, setPct] = useState('')

  async function submit() {
    if (!name.trim()) return
    await onAdd(name.trim(), Number(pct) || 0)
    setName('')
    setPct('')
  }

  const isDono = type === 'dono'
  return (
    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
      <input type="text" value={name} onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder={isDono ? 'Nome do dono...' : 'Nome do técnico...'}
        className="input-field py-2.5 text-sm flex-1 min-w-[140px]" />
      <input type="number" min="0" max="100" step="0.01" value={pct}
        onChange={e => setPct(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="%"
        className="input-field py-2.5 text-sm w-20" />
      <button onClick={submit} disabled={savingAux || !name.trim()}
        className="btn-primary text-sm px-4 py-2.5 flex-shrink-0"
        style={isDono ? { background: '#7c3aed' } : {}}>
        {savingAux ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        {isDono ? 'Adicionar Dono' : 'Adicionar Técnico'}
      </button>
    </div>
  )
}

export default function ConfiguracoesPage() {
  const { tenant, updateTenant } = useTenant()
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
  const [savingAux, setSavingAux] = useState(false)
  const [togglingDefault, setTogglingDefault] = useState<string | null>(null)

  // Origens dos chamados
  const [origins, setOrigins] = useState<string[]>([])
  const [customOrigin, setCustomOrigin] = useState('')
  const [savingOrigins, setSavingOrigins] = useState(false)
  const [originsSaved, setOriginsSaved] = useState(false)

  // Dados da empresa
  const [companyName, setCompanyName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [phone, setPhone] = useState('')
  const [savingCompany, setSavingCompany] = useState(false)
  const [companySaved, setCompanySaved] = useState(false)

  // Identidade visual
  const [primaryColor, setPrimaryColor] = useState('#f97316')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [savingBrand, setSavingBrand] = useState(false)
  const [brandSaved, setBrandSaved] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!tenant) return
    if (tenant.call_origins) setOrigins(tenant.call_origins)
    setEnableCommissions(tenant.enable_commissions ?? false)
    setCompanyName(tenant.name ?? '')
    setCnpj(tenant.cnpj ?? '')
    setPhone(tenant.phone ?? '')
    setPrimaryColor(tenant.primary_color ?? '#f97316')
    setLogoPreview(tenant.logo_url ?? null)
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
      const { data, error } = await supabase
        .from('tenants')
        .update({ enable_commissions: next })
        .eq('id', tenant.id)
        .select('enable_commissions')
        .single()
      if (error || !data) {
        console.error('Falha ao salvar enable_commissions:', error)
        alert('Não foi possível salvar. Verifique se a migration_v6.sql foi executada no Supabase.')
        return
      }
      setEnableCommissions(data.enable_commissions)
      updateTenant({ enable_commissions: data.enable_commissions })
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
      const { data, error } = await supabase
        .from('tenants')
        .update({ call_origins: origins })
        .eq('id', tenant.id)
        .select('call_origins')
        .single()
      if (error || !data) {
        console.error('Falha ao salvar call_origins:', error)
        alert('Não foi possível salvar as origens. Verifique se a migration_v6.sql foi executada no Supabase.')
        return
      }
      setOriginsSaved(true)
      updateTenant({ call_origins: data.call_origins })
    } finally {
      setSavingOrigins(false)
    }
  }

  async function handleSaveCompany() {
    if (!tenant) return
    setSavingCompany(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tenants')
        .update({ name: companyName.trim(), cnpj: cnpj.trim() || null, phone: phone.trim() || null })
        .eq('id', tenant.id)
        .select('name, cnpj, phone')
        .single()
      if (error || !data) {
        console.error('Falha ao salvar dados da empresa:', error)
        alert('Não foi possível salvar. Verifique as migrações no Supabase.')
        return
      }
      setCompanySaved(true)
      updateTenant({ name: data.name, cnpj: data.cnpj, phone: data.phone })
      setTimeout(() => setCompanySaved(false), 3000)
    } finally {
      setSavingCompany(false)
    }
  }

  function pickLogo(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setBrandSaved(false)
  }

  async function handleSaveBrand() {
    if (!tenant) return
    setSavingBrand(true)
    try {
      const supabase = createClient()
      let logo_url: string | undefined

      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `${tenant.id}/logo.${ext}`
        const { error: upErr } = await supabase.storage
          .from('tenant-logos')
          .upload(path, logoFile, { upsert: true })
        if (upErr) {
          console.error('Falha no upload da logo:', upErr)
          alert('Não foi possível enviar a logo. Tente novamente.')
          return
        }
        const { data } = supabase.storage.from('tenant-logos').getPublicUrl(path)
        // Cache-buster para a logo nova aparecer na hora
        logo_url = `${data.publicUrl}?v=${Date.now()}`
      }

      const { data, error } = await supabase
        .from('tenants')
        .update({
          primary_color: primaryColor,
          ...(logo_url ? { logo_url } : {}),
        })
        .eq('id', tenant.id)
        .select('primary_color, logo_url')
        .single()
      if (error || !data) {
        console.error('Falha ao salvar identidade visual:', error)
        alert('Não foi possível salvar. Tente novamente.')
        return
      }
      updateTenant({ primary_color: data.primary_color, logo_url: data.logo_url })
      setLogoFile(null)
      setBrandSaved(true)
      // Aplica a cor na hora, sem precisar recarregar
      document.documentElement.style.setProperty('--primary', data.primary_color)
      setTimeout(() => setBrandSaved(false), 3000)
    } finally {
      setSavingBrand(false)
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
  async function handleToggleDefault(aux: any) {
    setTogglingDefault(aux.id)
    try {
      const next = !aux.is_default
      // If enabling default, disable all other donos first
      if (next && aux.type === 'dono') {
        const otherDonos = auxiliaries.filter(a => a.type === 'dono' && a.id !== aux.id && a.is_default)
        for (const d of otherDonos) {
          await updateAuxiliary(d.id, { is_default: false })
          setAuxiliaries(prev => prev.map(a => a.id === d.id ? { ...a, is_default: false } : a))
        }
      }
      const updated = await updateAuxiliary(aux.id, { is_default: next })
      setAuxiliaries(prev => prev.map(a => a.id === aux.id ? updated : a))
    } finally {
      setTogglingDefault(null)
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
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
      </div>
    )
  }

  const tecnicos = auxiliaries.filter(a => a.type !== 'dono')
  const donos = auxiliaries.filter(a => a.type === 'dono')

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
          <input type="text" value={newTeam} onChange={e => setNewTeam(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTeam()}
            placeholder="Nome da nova equipe..."
            className="input-field py-2.5 text-sm flex-1" />
          <button onClick={handleAddTeam} disabled={savingTeam || !newTeam.trim()} className="btn-primary text-sm px-4 py-2.5">
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
                <button onClick={() => handleDeleteServiceType(st.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <input type="text" value={newServiceType} onChange={e => setNewServiceType(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddServiceType()}
            placeholder="Nome do tipo de serviço..."
            className="input-field py-2.5 text-sm flex-1 min-w-[180px]" />
          <input type="text" value={newServiceCategory} onChange={e => setNewServiceCategory(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddServiceType()}
            placeholder="Categoria (opcional)"
            className="input-field py-2.5 text-sm w-44" />
          <button onClick={handleAddServiceType} disabled={savingServiceType || !newServiceType.trim()}
            className="btn-primary text-sm px-4 py-2.5">
            {savingServiceType ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar
          </button>
        </div>
      </div>

      {/* Donos (sempre visível) */}
      <div className="rounded-xl border p-6 space-y-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <Star className="w-5 h-5" style={{ color: '#7c3aed' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Donos</h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.12)', color: '#7c3aed' }}>Comissão</span>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Donos recebem comissão sobre os serviços. Marque como "padrão" para ele entrar automaticamente em todos os chamados.
        </p>

        <div className="space-y-2">
          {donos.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>Nenhum dono cadastrado</p>
          )}
          {donos.map(a => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: a.is_default ? 'rgba(139,92,246,0.08)' : 'var(--surface-secondary)', border: a.is_default ? '1px solid rgba(139,92,246,0.25)' : '1px solid transparent' }}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.name}</span>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{Number(a.percentage)}%</span>
                    {a.is_default && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(139,92,246,0.15)', color: '#7c3aed' }}>
                        Padrão
                      </span>
                    )}
                  </div>
                  {enableCommissions && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {a.is_default ? 'Entra automaticamente em todos os chamados' : 'Adicionado manualmente nos chamados'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {enableCommissions && (
                  <button
                    onClick={() => handleToggleDefault(a)}
                    disabled={togglingDefault === a.id}
                    title={a.is_default ? 'Remover como padrão' : 'Definir como padrão'}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
                    style={a.is_default
                      ? { background: 'rgba(139,92,246,0.15)', color: '#7c3aed' }
                      : { background: 'var(--surface-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                    }>
                    {togglingDefault === a.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Star className="w-3.5 h-3.5" fill={a.is_default ? 'currentColor' : 'none'} />
                    }
                    {a.is_default ? 'Padrão' : 'Definir padrão'}
                  </button>
                )}
                <button onClick={() => handleDeleteAuxiliary(a.id)} className="text-red-400 hover:text-red-600 transition p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add dono form */}
        <AddAuxForm
          type="dono"
          savingAux={savingAux}
          onAdd={async (name, pct) => {
            setSavingAux(true)
            try {
              const aux = await createAuxiliary(name, pct, 'dono')
              setAuxiliaries(a => [...a, aux])
            } finally { setSavingAux(false) }
          }}
        />
      </div>

      {/* Técnicos Auxiliares */}
      <div className="rounded-xl border p-6 space-y-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <UserCog className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Técnicos Auxiliares</h2>
        </div>

        <div className="space-y-2">
          {tecnicos.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>Nenhum técnico cadastrado</p>
          )}
          {tecnicos.map(a => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--surface-secondary)' }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.name}</span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{Number(a.percentage)}%</span>
              </div>
              <button onClick={() => handleDeleteAuxiliary(a.id)} className="text-red-400 hover:text-red-600 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <AddAuxForm
          type="tecnico"
          savingAux={savingAux}
          onAdd={async (name, pct) => {
            setSavingAux(true)
            try {
              const aux = await createAuxiliary(name, pct, 'tecnico')
              setAuxiliaries(a => [...a, aux])
            } finally { setSavingAux(false) }
          }}
        />
      </div>

      {/* Origens dos Chamados */}
      <div className="rounded-xl border p-6 space-y-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <Globe className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Origens dos Chamados</h2>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Canais pelos quais seus clientes entram em contato.</p>

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
          <input type="text" value={customOrigin} onChange={e => setCustomOrigin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomOrigin())}
            placeholder="Outro canal personalizado..."
            className="input-field py-2.5 text-sm flex-1" />
          <button onClick={addCustomOrigin} disabled={!customOrigin.trim()} className="btn-primary text-sm px-4 py-2.5">
            <Plus className="w-4 h-4" /> Adicionar
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
          <button onClick={handleSaveOrigins} disabled={savingOrigins} className="btn-primary text-sm px-5 py-2.5">
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
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome da Empresa</label>
            <input type="text" value={companyName} onChange={e => { setCompanyName(e.target.value); setCompanySaved(false) }}
              className="input-field py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>CNPJ</label>
            <input type="text" value={cnpj} onChange={e => { setCnpj(e.target.value); setCompanySaved(false) }}
              placeholder="00.000.000/0000-00"
              className="input-field py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Telefone</label>
            <input type="text" value={phone} onChange={e => { setPhone(e.target.value); setCompanySaved(false) }}
              placeholder="(51) 99999-9999"
              className="input-field py-2.5 text-sm" />
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSaveCompany} disabled={savingCompany} className="btn-primary text-sm px-5 py-2.5">
            {savingCompany ? <Loader2 className="w-4 h-4 animate-spin" /> : companySaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {companySaved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Identidade Visual */}
      <div className="rounded-xl border p-6 space-y-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <Palette className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Identidade Visual</h2>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Logo e cor que aparecem no sistema, nas Ordens de Serviço e nos Romaneios.
        </p>

        {/* Logo */}
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => logoInputRef.current?.click()}
            className="w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition flex-shrink-0"
            style={{ borderColor: 'var(--border-strong)', background: 'var(--surface-secondary)' }}>
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <Upload className="w-6 h-6" style={{ color: 'var(--text-tertiary)' }} />
            )}
          </button>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Logo da empresa</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>PNG ou JPG, de preferência com fundo transparente</p>
            <button type="button" onClick={() => logoInputRef.current?.click()}
              className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
              style={{ background: 'rgba(var(--primary-rgb),0.1)', color: 'var(--primary)' }}>
              {logoPreview ? 'Trocar logo' : 'Enviar logo'}
            </button>
          </div>
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => pickLogo(e.target.files)} />
        </div>

        {/* Cor */}
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Cor do sistema</p>
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_COLORS.map(c => (
              <button key={c} type="button"
                onClick={() => { setPrimaryColor(c); setBrandSaved(false) }}
                className="w-9 h-9 rounded-full transition flex items-center justify-center"
                style={{
                  background: c,
                  boxShadow: primaryColor === c ? `0 0 0 3px var(--surface), 0 0 0 5px ${c}` : 'none',
                }}>
                {primaryColor === c && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
              </button>
            ))}
            {/* Cor personalizada */}
            <label className="w-9 h-9 rounded-full cursor-pointer border-2 border-dashed flex items-center justify-center overflow-hidden relative"
              style={{ borderColor: 'var(--border-strong)' }}>
              <input type="color" value={primaryColor}
                onChange={e => { setPrimaryColor(e.target.value); setBrandSaved(false) }}
                className="absolute inset-0 opacity-0 cursor-pointer" />
              <Palette className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSaveBrand} disabled={savingBrand} className="btn-primary text-sm px-5 py-2.5">
            {savingBrand ? <Loader2 className="w-4 h-4 animate-spin" /> : brandSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {brandSaved ? 'Salvo!' : 'Salvar Identidade'}
          </button>
        </div>
      </div>
    </div>
  )
}
