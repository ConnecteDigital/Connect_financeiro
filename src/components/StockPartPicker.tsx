'use client'

import { useState } from 'react'
import { Plus, Search } from 'lucide-react'

interface StockItem { id: string; name: string; quantity: number; unit_value: number | string }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Busca de peça por nome com lista rolável (o <select> nativo não deixava
// digitar nem rolar direito no computador do cliente).
export default function StockPartPicker({ items, onAdd }: {
  items: StockItem[]
  onAdd: (item: StockItem, quantity: number) => void
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<StockItem | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [open, setOpen] = useState(false)

  const matches = items.filter(i => norm(i.name).includes(norm(query.trim())))

  function add() {
    if (!selected || quantity <= 0) return
    onAdd(selected, quantity)
    setSelected(null)
    setQuery('')
    setQuantity(1)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input type="text" value={selected ? selected.name : query}
          onChange={e => { setSelected(null); setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar peça pelo nome..."
          className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" />
        {open && !selected && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {matches.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-slate-400">Nenhuma peça encontrada</p>
            ) : matches.map(i => (
              <button key={i.id} type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { setSelected(i); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 border-b border-slate-50 last:border-0 flex justify-between gap-2">
                <span className="text-slate-700">{i.name}</span>
                <span className={`text-xs flex-shrink-0 ${Number(i.quantity) > 0 ? 'text-slate-400' : 'text-red-500 font-semibold'}`}>
                  {i.quantity} em estoque
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 items-center">
        <label className="text-xs text-slate-500">Qtd</label>
        <input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))}
          className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400" />
        <button type="button" onClick={add} disabled={!selected}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 text-white disabled:opacity-50">
          <Plus className="w-3.5 h-3.5" /> Adicionar peça
        </button>
      </div>
    </div>
  )
}
