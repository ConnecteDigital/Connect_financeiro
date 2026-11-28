'use client'

import MoneyInput from '@/components/MoneyInput'
import { useEffect, useState } from 'react'
import { Package, Plus, Minus, Trash2, Pencil, X, Search, PackagePlus, PackageMinus } from 'lucide-react'
import { Sheet, input } from '@/components/LojaModals'
import { toastSuccess, toastError } from '@/components/Toast'
import { useTenant } from '@/lib/tenant-context'
import { getStockItems, createStockItem, updateStockItem, deleteStockItem } from '@/lib/db/stock'
import { getAuxiliaries } from '@/lib/db/auxiliaries'
import LojaEstoque from '@/components/LojaEstoque'
import { isLojaMode } from '@/lib/loja'

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const fmt = (v: number) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

interface StockItem {
  id: string
  auxiliary_id: string | null
  name: string
  quantity: number
  unit_value: number
}

// Entrada (Chegou) ou saída (Saiu) de peças: só mexe na quantidade
function QtySheet({ item, mode, onClose, onSaved }: { item: StockItem; mode: 'in' | 'out'; onClose: () => void; onSaved: () => void }) {
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const next = mode === 'in' ? item.quantity + qty : item.quantity - qty

  async function save() {
    if (qty <= 0) { setError('Informe a quantidade.'); return }
    if (next < 0) { setError(`Só tem ${item.quantity} un. no estoque.`); return }
    setBusy(true); setError('')
    try {
      await updateStockItem(item.id, { quantity: next })
      onSaved()
    } catch (e) {
      console.error(e); setError('Não foi possível salvar.')
    } finally { setBusy(false) }
  }

  return (
    <Sheet title={mode === 'in' ? 'Chegou peça' : 'Saiu peça'} onClose={onClose}>
      <div>
        <p className="font-semibold text-zinc-900">{item.name}</p>
        <p className="text-xs text-zinc-500">Agora: {item.quantity} un.</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1.5">{mode === 'in' ? 'Quantas chegaram?' : 'Quantas saíram?'}</label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Menos"
            className="w-12 h-12 rounded-xl border border-zinc-200 bg-white text-zinc-600 flex items-center justify-center"><Minus className="w-5 h-5" /></button>
          <input type="number" inputMode="numeric" min="1" value={qty || ''} onChange={e => setQty(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            className={`${input} text-center text-lg font-bold`} />
          <button type="button" onClick={() => setQty(q => q + 1)} aria-label="Mais"
            className="w-12 h-12 rounded-xl border border-zinc-200 bg-white text-zinc-600 flex items-center justify-center"><Plus className="w-5 h-5" /></button>
        </div>
        <p className={`text-sm mt-2 ${next < 0 ? 'text-red-500' : 'text-zinc-600'}`}>Fica com <b>{next} un.</b></p>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-600">Cancelar</button>
        <button type="button" onClick={save} disabled={busy}
          className={`flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 ${mode === 'in' ? 'bg-orange-500' : 'bg-emerald-500'}`}>
          {busy ? 'Salvando...' : 'Confirmar'}
        </button>
      </div>
    </Sheet>
  )
}

// Cadastrar / editar peça
function ItemSheet({ item, auxiliaryId, onClose, onSaved }: { item: StockItem | null; auxiliaryId: string | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [quantity, setQuantity] = useState<number>(item?.quantity ?? 0)
  const [unitValue, setUnitValue] = useState<number>(item?.unit_value ?? 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!name.trim()) { setError('Informe o nome da peça.'); return }
    setBusy(true); setError('')
    try {
      if (item) await updateStockItem(item.id, { name: name.trim(), quantity, unit_value: unitValue })
      else await createStockItem(name.trim(), quantity, unitValue, auxiliaryId)
      onSaved()
    } catch (e) {
      console.error(e); setError('Não foi possível salvar.')
    } finally { setBusy(false) }
  }

  return (
    <Sheet title={item ? 'Editar peça' : 'Cadastrar peça'} onClose={onClose}>
      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1.5">Nome da peça *</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Termostato Brastemp" className={input} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">Quantidade</label>
          <input type="number" inputMode="numeric" min="0" value={quantity || ''} onChange={e => setQuantity(Number(e.target.value))} placeholder="0" className={input} />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">Valor unit. (R$)</label>
          <MoneyInput min="0" step="0.01" value={unitValue || ''} onChange={e => setUnitValue(Number(e.target.value))} placeholder="0,00" className={input} />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-600">Cancelar</button>
        <button type="button" onClick={save} disabled={busy}
          className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: 'var(--primary)' }}>
          {busy ? 'Salvando...' : item ? 'Salvar' : 'Cadastrar'}
        </button>
      </div>
    </Sheet>
  )
}

// Estoque em cartões (igual ao da conta Loja): Saiu / Chegou em cada peça
function StockSection({ title, items: allItems, auxiliaryId, onChanged, query = '' }: {
  title: string
  items: StockItem[]
  auxiliaryId: string | null
  onChanged: () => void
  query?: string
}) {
  const q = norm(query.trim())
  const items = q ? allItems.filter(i => norm(i.name).includes(q)) : allItems
  const [form, setForm] = useState<{ item: StockItem | null } | null>(null)
  const [move, setMove] = useState<{ item: StockItem; mode: 'in' | 'out' } | null>(null)
  const units = allItems.reduce((s, i) => s + Number(i.quantity || 0), 0)
  const value = allItems.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unit_value || 0), 0)

  async function handleDelete(item: StockItem) {
    if (!confirm(`Excluir "${item.name}" do estoque?`)) return
    try { await deleteStockItem(item.id); toastSuccess('Peça excluída') }
    catch (e) { console.error(e); toastError('Não foi possível excluir.') }
    onChanged()
  }

  const done = (msg: string) => () => { setForm(null); setMove(null); toastSuccess(msg); onChanged() }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-700 truncate">
            {title} <span className="text-xs font-normal text-zinc-400">({q ? `${items.length} de ${allItems.length}` : allItems.length})</span>
          </p>
          <p className="text-[11px] text-zinc-500">{units} un. · {fmt(value)} em estoque</p>
        </div>
        <button type="button" onClick={() => setForm({ item: null })}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition flex-shrink-0"
          style={{ background: 'rgba(var(--primary-rgb),0.1)', color: 'var(--primary)' }}>
          <Plus className="w-3.5 h-3.5" /> Cadastrar
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-8 text-center">
          <p className="text-sm text-zinc-400">{q ? 'Nenhuma peça encontrada' : 'Nenhuma peça cadastrada'}</p>
        </div>
      ) : items.map(item => (
        <div key={item.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold text-zinc-900 min-w-0 break-words">{item.name}</p>
            <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${item.quantity <= 0 ? 'bg-red-50 text-red-600' : item.quantity <= 1 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {item.quantity} un.
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
            <span>Valor <b className="text-zinc-700">{fmt(item.unit_value)}</b> / un.</span>
            {item.quantity > 0 && item.unit_value > 0 && <span>Total <b className="text-zinc-700">{fmt(item.quantity * item.unit_value)}</b></span>}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button type="button" onClick={() => setMove({ item, mode: 'out' })} disabled={item.quantity <= 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-white disabled:opacity-40">
              <PackageMinus className="w-4 h-4" /> Saiu
            </button>
            <button type="button" onClick={() => setMove({ item, mode: 'in' })}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold bg-orange-50 text-orange-700 border border-orange-200">
              <PackagePlus className="w-4 h-4" /> Chegou
            </button>
            <button type="button" aria-label="Editar" onClick={() => setForm({ item })} className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100"><Pencil className="w-4 h-4" /></button>
            <button type="button" aria-label="Excluir" onClick={() => handleDelete(item)} className="p-2 rounded-xl text-red-400 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      ))}

      {form && <ItemSheet item={form.item} auxiliaryId={auxiliaryId} onClose={() => setForm(null)} onSaved={done(form.item ? 'Peça atualizada!' : 'Peça cadastrada!')} />}
      {move && <QtySheet item={move.item} mode={move.mode} onClose={() => setMove(null)} onSaved={done('Estoque atualizado!')} />}
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

  // silent = recarrega sem trocar a lista pelo "carregando": a tela fica
  // parada onde estava (editar/excluir uma peça lá embaixo não volta pro topo)
  async function load(silent = false) {
    if (!silent) setLoading(true)
    try {
      const [stockData, auxData] = await Promise.all([getStockItems(), getAuxiliaries()])
      setItems(stockData)
      setTechnicians(auxData.filter((a: any) => a.type === 'tecnico'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  const reload = () => { load(true) }

  if (tenantLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="h-8 bg-zinc-100 rounded w-48 animate-pulse" />
        {[...Array(2)].map((_, i) => <div key={i} className="h-32 bg-zinc-100 rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  if (isLojaMode(tenant)) return <LojaEstoque />

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
        <StockSection title="Minhas Peças" items={myItems} auxiliaryId={myItems[0]?.auxiliary_id ?? null} onChanged={reload} query={query} />
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

      <StockSection title="Estoque da Loja" items={storeItems} auxiliaryId={null} onChanged={reload} query={query} />

      {byTechnician.map(({ technician, items: techItems }) => (
        <StockSection key={technician.id} title={`Estoque — ${technician.name}`} items={techItems} auxiliaryId={technician.id} onChanged={reload} query={query} />
      ))}

      {technicians.length === 0 && (
        <p className="text-center text-xs text-zinc-400 px-4">
          Cadastre um técnico (com login próprio) pra acompanhar o estoque individual dele aqui também.
        </p>
      )}
    </div>
  )
}
