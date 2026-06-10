'use client'

import { useEffect, useState } from 'react'
import { UserCog, Trash2, Plus, TrendingUp } from 'lucide-react'
import { getAuxiliaries, createAuxiliary, deleteAuxiliary } from '@/lib/db/auxiliaries'
import { createClient } from '@/lib/supabase/client'

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

async function getAuxiliaryHistory(auxiliaryId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('service_orders')
    .select('id, os_number, date, total_value, auxiliary_value, calls!inner(call_number, contact_name, clients(name))')
    .eq('auxiliary_id', auxiliaryId)
    .order('date', { ascending: false })
  return data ?? []
}

export default function AuxiliaresPage() {
  const [auxiliaries, setAuxiliaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [pct, setPct] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [history, setHistory] = useState<Record<string, any[]>>({})
  const [histLoading, setHistLoading] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    getAuxiliaries().then(setAuxiliaries).finally(() => setLoading(false))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await createAuxiliary(name, parseFloat(pct))
      setName(''); setPct(''); setShowForm(false)
      load()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir auxiliar?')) return
    await deleteAuxiliary(id)
    load()
  }

  async function toggleExpanded(id: string) {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!history[id]) {
      setHistLoading(id)
      getAuxiliaryHistory(id)
        .then(rows => setHistory(h => ({ ...h, [id]: rows })))
        .finally(() => setHistLoading(null))
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-slate-500">Carregando...</div>

  const totalEarned = (id: string) =>
    (history[id] ?? []).reduce((s, r) => s + Number(r.auxiliary_value ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Auxiliares</h1>
          <p className="text-slate-500 text-sm">Técnicos auxiliares e seus ganhos</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm">
          <Plus className="w-4 h-4" />
          Novo Auxiliar
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              placeholder="Nome do auxiliar"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div className="w-36">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">% sobre bruto</label>
            <input required type="number" min="1" max="100" step="0.1" value={pct} onChange={e => setPct(e.target.value)}
              placeholder="Ex: 30"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <button type="submit" disabled={saving}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button type="button" onClick={() => setShowForm(false)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">
            Cancelar
          </button>
        </form>
      )}

      {auxiliaries.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
          <UserCog className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum auxiliar cadastrado</p>
          <p className="text-slate-400 text-sm mt-1">Clique em "Novo Auxiliar" para adicionar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {auxiliaries.map(aux => (
            <div key={aux.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
                    <UserCog className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{aux.name}</p>
                    <p className="text-sm text-slate-500">{aux.percentage}% sobre o bruto</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleExpanded(aux.id)}
                    className="flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-700 font-medium transition">
                    <TrendingUp className="w-4 h-4" />
                    {expanded === aux.id ? 'Ocultar histórico' : 'Ver histórico'}
                  </button>
                  <button onClick={() => handleDelete(aux.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expanded === aux.id && (
                <div className="border-t border-slate-100">
                  {histLoading === aux.id ? (
                    <p className="text-center py-6 text-slate-400 text-sm">Carregando histórico...</p>
                  ) : (history[aux.id] ?? []).length === 0 ? (
                    <p className="text-center py-6 text-slate-400 text-sm">Nenhum serviço registrado ainda</p>
                  ) : (
                    <>
                      <div className="px-5 py-3 bg-slate-50 flex items-center justify-between">
                        <p className="text-sm text-slate-500">{(history[aux.id] ?? []).length} serviços realizados</p>
                        <p className="text-sm font-bold text-orange-600">
                          Total ganho: {fmt(totalEarned(aux.id))}
                        </p>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                            <th className="text-left px-5 py-2">Data</th>
                            <th className="text-left px-4 py-2">OS</th>
                            <th className="text-left px-4 py-2">Cliente</th>
                            <th className="text-right px-5 py-2">Total OS</th>
                            <th className="text-right px-5 py-2">Ganho</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(history[aux.id] ?? []).map((row: any) => {
                            const clientName = row.calls?.clients?.name ?? row.calls?.contact_name ?? '—'
                            const date = row.date ? new Date(row.date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
                            return (
                              <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                                <td className="px-5 py-2.5 text-slate-600">{date}</td>
                                <td className="px-4 py-2.5 font-mono text-slate-700">{row.os_number ?? '—'}</td>
                                <td className="px-4 py-2.5 text-slate-700">{clientName}</td>
                                <td className="px-5 py-2.5 text-right text-slate-600">{fmt(Number(row.total_value ?? 0))}</td>
                                <td className="px-5 py-2.5 text-right font-semibold text-orange-600">{fmt(Number(row.auxiliary_value ?? 0))}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
