'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Trash2, Save, Settings, Loader2 } from 'lucide-react'
import { getTeams, createTeam, deleteTeam } from '@/lib/db/teams'

export default function ConfiguracoesPage() {
  const [teams, setTeams] = useState<any[]>([])
  const [newTeam, setNewTeam] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getTeams().then(setTeams).finally(() => setLoading(false))
  }, [])

  async function handleAddTeam() {
    if (!newTeam.trim()) return
    setSaving(true)
    try {
      const team = await createTeam(newTeam.trim())
      setTeams(t => [...t, team])
      setNewTeam('')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTeam(id: string) {
    if (!confirm('Remover esta equipe?')) return
    await deleteTeam(id)
    setTeams(t => t.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
        <p className="text-slate-500 text-sm mt-0.5">Gerencie equipes e preferências do sistema</p>
      </div>

      {/* Equipes */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Users className="w-5 h-5 text-orange-500" />
          <h2 className="font-semibold text-slate-800">Equipes</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ) : (
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
        )}

        <div className="flex gap-2">
          <input
            type="text" value={newTeam}
            onChange={e => setNewTeam(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTeam()}
            placeholder="Nome da nova equipe..."
            className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button onClick={handleAddTeam} disabled={saving || !newTeam.trim()}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-blue-300 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
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

