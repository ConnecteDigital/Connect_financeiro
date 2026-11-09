'use client'

import { useEffect, useState } from 'react'
import { Package, Plus, Trash2, Pencil, X, Check, Search } from 'lucide-react'
import { useTenant } from '@/lib/tenant-context'
import { getStockItems, createStockItem, updateStockItem, deleteStockItem } from '@/lib/db/stock'
import { getAuxiliaries } from '@/lib/db/auxiliaries'

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

interface StockItem {
  id: string
  auxiliary_id: string | null
  name: string
  quantity: number
  unit_value: number
}

function StockSection({ title, items: allItems, auxiliaryId, onChanged, query = '' }: {
  title: string
  items: StockItem[]
  auxiliaryId: string | null
  onChanged: () => void
  query?: string
}) {
  const q = norm(query.trim())
  const items = q ? allItems.filter(i => norm(i.name).includes(q)) : allItems
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState(0)
  const [unitValue, setUnitValue] = useState(0)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editQty, setEditQty] = useState(0)
  const [editValue, setEditValue] = useState(0)

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createStockItem(name.trim(), quantity, unitValue, auxiliaryId)
      setName(''); setQuantity(0); setUnitValue(0); setAdding(false)
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  function startEdit(item: StockItem) {
    setEditingId(item.id)
    setEditName(item.name)
    setEditQty(item.quantity)
    setEditValue(item.unit_value)
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return
    setSaving(true)
    try {
      await updateStockItem(id, { name: editName.trim(), quantity: editQty, unit_value: editValue })
      setEditingId(null)
      onChanged()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este item do estoque?')) return
    await deleteStockItem(id)
    onChanged()
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <p className="text-sm font-semibold text-zinc-700">
          {title} <span className="text-xs font-normal text-zinc-400">({q ? `${items.length} de ${allItems.length}` : allItems.length})</span>
        </p>
        <button onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition"
          style={{ background: 'rgba(var(--primary-rgb),0.1)', color: 'var(--primary)' }}>
          <Plus className="w-3.5 h-3.5" /> Item
        </button>
      </div>

      {adding && (
        <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-100 space-y-2">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome da peça"
            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
          <div className="flex gap-2">
            <input type="number" min="0" value={quantity || ''} onChange={e => setQuantity(Number(e.target.value))} placeholder="Quantidade"
              className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            <input type="number" min="0" step="0.01" value={unitValue || ''} onChange={e => setUnitValue(Number(e.target.value))} placeholder="Valor unit. (R$)"
              className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
          </div>
          <button onClick={handleAdd} disabled={saving || !name.trim()}
            className="w-full py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition"
            style={{ background: 'var(--primary)' }}>
            {saving ? 'Salvando...' : 'Adicionar ao estoque'}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-400">{q ? 'Nenhuma peça encontrada' : 'Nenhum item cadastrado'}</p>
      ) : (
        <div className="divide-y divide-zinc-50">
          {items.map(item => editingId === item.id ? (
            <div key={item.id} className="px-4 py-3 bg-zinc-50 space-y-2">
              <label className="block text-xs font-medium text-zinc-500">Nome da peça</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Quantidade</label>
                  <input type="number" min="0" value={editQty} onChange={e => setEditQty(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Valor unit. (R$)</label>
                  <input type="number" min="0" step="0.01" value={editValue} onChange={e => setEditValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingId(null)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition">
                  <X className="w-4 h-4 inline mr-1" />Cancelar
                </button>
                <button onClick={() => saveEdit(item.id)} disabled={saving || !editName.trim()}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition"
                  style={{ background: 'var(--primary)' }}>
                  <Check className="w-4 h-4 inline mr-1" />{saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <div key={item.id} className="flex items-center justify-between px-4 py-3 gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-800 truncate">{item.name}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{fmt(item.unit_value)} / un.</p>
              </div>
              {(
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.quantity <= 0 ? 'bg-red-50 text-red-600' : item.quantity <= 2 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-700'}`}>
                    {item.quantity} un.
                  </span>
                  <button onClick={() => startEdit(item)} className="p-1.5 text-zinc-400 hover:bg-zinc-100 rounded-lg transition">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function EstoquePage() {
  const { tenant, isTecnico, loading: tenantLoading } = useTenant()
  const isRodrigues = tenant?.call_form_config?.rodrigues_custom === true
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<StockItem[]>([])
  const [technicians, setTechnicians] = useState<any[]>([])
  const [query, setQuery] = useState('')

  const searchBox = (
    <div className="sticky top-0 z-10 -mx-1 px-1 py-1" style={{ background: 'var(--background, #f5f5f7)' }}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar peça pelo nome..."
          className="w-full pl-9 pr-9 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400"><X className="w-4 h-4" /></button>
        )}
      </div>
    </div>
  )

  async function load() {
    setLoading(true)
    try {
      const [stockData, auxData] = await Promise.all([getStockItems(), getAuxiliaries()])
      setItems(stockData)
      setTechnicians(auxData.filter((a: any) => a.type === 'tecnico'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (tenantLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-8 bg-zinc-100 rounded w-48 animate-pulse" />
        {[...Array(2)].map((_, i) => <div key={i} className="h-32 bg-zinc-100 rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  if (!isRodrigues) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <Package className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">Esta função não está disponível para esta conta.</p>
      </div>
    )
  }

  if (isTecnico) {
    const myItems = items.filter(i => i.auxiliary_id)
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Meu Estoque</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Peças que você carrega para os serviços</p>
        </div>
        {searchBox}
        <StockSection title="Minhas Peças" items={myItems} auxiliaryId={myItems[0]?.auxiliary_id ?? null} onChanged={load} query={query} />
      </div>
    )
  }

  const storeItems = items.filter(i => !i.auxiliary_id)
  const byTechnician = technicians.map(t => ({
    technician: t,
    items: items.filter(i => i.auxiliary_id === t.id),
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Controle de Estoque</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Peças da loja e de cada técnico</p>
      </div>

      {searchBox}

      <StockSection title="Estoque da Loja" items={storeItems} auxiliaryId={null} onChanged={load} query={query} />

      {byTechnician.map(({ technician, items: techItems }) => (
        <StockSection key={technician.id} title={`Estoque — ${technician.name}`} items={techItems} auxiliaryId={technician.id} onChanged={load} query={query} />
      ))}

      {technicians.length === 0 && (
        <p className="text-center text-xs text-zinc-400 px-4">
          Cadastre um técnico (com login próprio) pra acompanhar o estoque individual dele aqui também.
        </p>
      )}
    </div>
  )
}
