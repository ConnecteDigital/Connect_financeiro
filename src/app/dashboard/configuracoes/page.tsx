'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Trash2, Save, Settings, Loader2, Wrench, UserCog, Power } from 'lucide-react'
import { getTeams, createTeam, deleteTeam } from '@/lib/db/teams'
import { getAllServiceTypes, createServiceType, toggleServiceType, deleteServiceType } from '@/lib/db/service-types'
import { getAuxiliaries, createAuxiliary, deleteAuxiliary } from '@/lib/db/auxiliaries'

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true)

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
  const [savingAux, setSavingAux] = useState(false)

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
      const aux = await createAuxiliary(newAuxName.trim(), Number(newAuxPct) || 0)
      setAuxiliaries(a => [...a, aux])
      setNewAuxName('')
      setNewAuxPct('')
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
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <p className="text-slate-500 text-sm mt-0.5">Gerencie equipes, tipos de serviço, auxiliares e preferências do sistema</p>
      </div>

      {/* Equipes */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Users className="w-5 h-5 text-orange-500" />
          <h2 className="font-semibold text-slate-800">Equipes</h2>
        </div>

        <div className="space-y-2">
          {teams.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">Nenhuma equipe cadastrada</p>
          )}
          {teams.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium text-slate-700">{t.name}</span>
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
            className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button onClick={handleAddTeam} disabled={savingTeam || !newTeam.trim()}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition">
            {savingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar
          </button>
        </div>
      </div>

      {/* Tipos de Serviço */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Wrench className="w-5 h-5 text-orange-500" />
          <h2 className="font-semibold text-slate-800">Tipos de Serviço</h2>
        </div>

        <div className="space-y-2">
          {serviceTypes.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">Nenhum tipo de serviço cadastrado</p>
          )}
          {serviceTypes.map(st => (
            <div key={st.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="min-w-0">
                <span className={`text-sm font-medium ${st.active ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{st.name}</span>
                {st.category && <span className="text-xs text-slate-400 ml-2">{st.category}</span>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleToggleServiceType(st.id, st.active)}
                  className={`p-1.5 rounded-lg transition ${st.active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-100'}`}
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
            className="flex-1 min-w-[180px] px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <input
            type="text" value={newServiceCategory}
            onChange={e => setNewServiceCategory(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddServiceType()}
            placeholder="Categoria (opcional)"
            className="w-44 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button onClick={handleAddServiceType} disabled={savingServiceType || !newServiceType.trim()}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition">
            {savingServiceType ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar
          </button>
        </div>
      </div>

      {/* Auxiliares */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <UserCog className="w-5 h-5 text-orange-500" />
          <h2 className="font-semibold text-slate-800">Auxiliares</h2>
        </div>

        <div className="space-y-2">
          {auxiliaries.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">Nenhum auxiliar cadastrado</p>
          )}
          {auxiliaries.map(a => (
            <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-slate-700">{a.name}</span>
                <span className="text-xs text-slate-400 ml-2">{Number(a.percentage)}%</span>
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
            placeholder="Nome do auxiliar..."
            className="flex-1 min-w-[180px] px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <input
            type="number" min="0" max="100" step="0.01" value={newAuxPct}
            onChange={e => setNewAuxPct(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddAuxiliary()}
            placeholder="%"
            className="w-24 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button onClick={handleAddAuxiliary} disabled={savingAux || !newAuxName.trim()}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition">
            {savingAux ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar
          </button>
        </div>
      </div>

      {/* Dados da empresa */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Settings className="w-5 h-5 text-orange-500" />
          <h2 className="font-semibold text-slate-800">Dados da Empresa</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome da Empresa</label>
            <input type="text" defaultValue="Desentupidora Líder"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">CNPJ</label>
            <input type="text" defaultValue="50.773.617/0001-18"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefone</label>
            <input type="text" defaultValue="(51) 99960-8260"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>

        <div className="flex justify-end">
          <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
            <Save className="w-4 h-4" />
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
