'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, X, Pencil, Trash2, ShoppingCart, PackagePlus, Package, Refrigerator } from 'lucide-react'
import { getLojaItems, deleteLojaItem, type LojaItem, type ItemKind } from '@/lib/db/loja'
import { ItemFormModal, SellModal, ReceiveModal } from '@/components/LojaModals'
import { toastSuccess } from '@/components/Toast'

const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Estoque da conta Loja: máquinas e peças, com Vendi / Chegou em cada item
export default function LojaEstoque() {
  const [items, setItems] = useState<LojaItem[] | null>(null)
  const [kind, setKind] = useState<ItemKind>('maquina')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<{ item?: LojaItem | null } | null>(null)
  const [sell, setSell] = useState<LojaItem | null>(null)
  const [receive, setReceive] = useState<LojaItem | null>(null)

  const load = () => getLojaItems().then(setItems).catch(e => { console.error(e); setItems([]) })
  useEffect(() => { load() }, [])

  const list = (items ?? []).filter(i => i.kind === kind && norm([i.name, i.brand, i.model].filter(Boolean).join(' ')).includes(norm(query.trim())))
  const of = (k: ItemKind) => (items ?? []).filter(i => i.kind === k)
  const stockValue = (l: LojaItem[]) => l.reduce((s, i) => s + i.quantity * i.unit_value, 0)

  async function remove(i: LojaItem) {
    if (!confirm(`Excluir "${i.name}" do estoque?`)) return
    await deleteLojaItem(i.id)
    toastSuccess('Item excluído')
    load()
  }

  const done = (msg: string) => () => { setForm(null); setSell(null); setReceive(null); toastSuccess(msg); load() }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Estoque</h1>
          <p className="text-sm text-zinc-500">Máquinas e peças da loja</p>
        </div>
        <button type="button" onClick={() => setForm({ item: null })} className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Cadastrar
        </button>
      </div>

      {/* Máquinas | Peças */}
      <div className="grid grid-cols-2 gap-2">
        {([['maquina', 'Máquinas', Refrigerator], ['peca', 'Peças', Package]] as const).map(([k, l, Icon]) => {
          const active = kind === k
          const all = of(k)
          return (
            <button key={k} type="button" onClick={() => setKind(k)}
              className={`text-left rounded-2xl border px-4 py-3 transition ${active ? 'bg-white shadow-sm' : 'bg-white/70 border-zinc-100'}`}
              style={active ? { borderColor: 'var(--primary)', boxShadow: '0 0 0 1px var(--primary)' } : {}}>
              <p className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5"><Icon className="w-4 h-4 text-zinc-400" /> {l}</p>
              <p className="text-xl font-bold text-zinc-900">{all.reduce((s, i) => s + i.quantity, 0)} <span className="text-xs font-medium text-zinc-500">un.</span></p>
              <p className="text-[11px] text-zinc-500">{all.length} tipo{all.length !== 1 ? 's' : ''} · {fmt(stockValue(all))} em estoque</p>
            </button>
          )
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={kind === 'maquina' ? 'Buscar máquina...' : 'Buscar peça...'}
          className="w-full pl-9 pr-9 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
        {query && <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400"><X className="w-4 h-4" /></button>}
      </div>

      <div className="space-y-2">
        {items === null ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-24 bg-zinc-100 rounded-2xl animate-pulse" />)
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 p-8 text-center">
            <p className="text-sm text-zinc-400">{query ? 'Nada encontrado' : kind === 'maquina' ? 'Nenhuma máquina cadastrada' : 'Nenhuma peça cadastrada'}</p>
            {!query && <button type="button" onClick={() => setForm({ item: null })} className="mt-2 text-sm font-semibold" style={{ color: 'var(--primary)' }}>Cadastrar agora</button>}
          </div>
        ) : list.map(i => (
          <div key={i.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 truncate">{i.name}</p>
                <p className="text-xs text-zinc-500 truncate">{[i.brand, i.model].filter(Boolean).join(' · ') || '—'}</p>
                {i.notes && <p className="text-xs text-zinc-400 truncate mt-0.5">{i.notes}</p>}
              </div>
              <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${i.quantity <= 0 ? 'bg-red-50 text-red-600' : i.quantity <= 1 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {i.quantity} un.
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
              <span>Custo <b className="text-zinc-700">{fmt(i.unit_value)}</b></span>
              <span>Venda <b className="text-zinc-700">{fmt(i.sale_value)}</b></span>
              {i.sale_value > 0 && i.unit_value > 0 && <span className="text-emerald-600 font-semibold">lucro {fmt(i.sale_value - i.unit_value)}</span>}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button type="button" onClick={() => setSell(i)} disabled={i.quantity <= 0}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-white disabled:opacity-40">
                <ShoppingCart className="w-4 h-4" /> Vendi
              </button>
              <button type="button" onClick={() => setReceive(i)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                <PackagePlus className="w-4 h-4" /> Chegou
              </button>
              <button type="button" onClick={() => setForm({ item: i })} className="p-2 rounded-xl text-zinc-400 hover:bg-zinc-100"><Pencil className="w-4 h-4" /></button>
              <button type="button" onClick={() => remove(i)} className="p-2 rounded-xl text-red-400 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {form && <ItemFormModal item={form.item} defaultKind={kind} onClose={() => setForm(null)} onSaved={done(form.item ? 'Item atualizado!' : 'Item cadastrado!')} />}
      {sell && <SellModal item={sell} onClose={() => setSell(null)} onSaved={done('Venda registrada!')} />}
      {receive && <ReceiveModal item={receive} onClose={() => setReceive(null)} onSaved={done('Estoque atualizado!')} />}
    </div>
  )
}
