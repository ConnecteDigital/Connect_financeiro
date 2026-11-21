'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, X, Pencil, Trash2, ShoppingCart, PackagePlus, Package, Refrigerator } from 'lucide-react'
import { getLojaItems, deleteLojaItem, mediaUrl, lojaErrorMessage, EQUIPMENT_TYPES, type LojaItem, type ItemKind } from '@/lib/db/loja'
import Link from 'next/link'
import { ItemFormModal, ReceiveModal, MediaSheet, MediaThumb } from '@/components/LojaModals'
import { toastSuccess, toastError } from '@/components/Toast'

const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Estoque da conta Loja: equipamentos e peças, com Vendi / Chegou em cada item
export default function LojaEstoque() {
  const [items, setItems] = useState<LojaItem[] | null>(null)
  const [kind, setKind] = useState<ItemKind>('maquina')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<{ item?: LojaItem | null } | null>(null)
  const [receive, setReceive] = useState<LojaItem | null>(null)
  const [mediaOf, setMediaOf] = useState<LojaItem | null>(null)
  const [loadError, setLoadError] = useState('')

  const load = () => getLojaItems().then(l => { setItems(l); setLoadError('') }).catch(e => { console.error(e); setItems([]); setLoadError(lojaErrorMessage(e, 'Não foi possível carregar o estoque.')) })
  useEffect(() => { load() }, [])

  const list = (items ?? []).filter(i => i.kind === kind && norm([i.name, i.equipment_type, i.brand, i.model, i.serial_number].filter(Boolean).join(' ')).includes(norm(query.trim())))
  // Tipos de equipamento que a loja criou (além dos que já vêm prontos)
  const customTypes = Array.from(new Set((items ?? []).map(i => i.equipment_type ?? '').filter(t => t && !EQUIPMENT_TYPES.includes(t))))
  const of = (k: ItemKind) => (items ?? []).filter(i => i.kind === k)
  const stockValue = (l: LojaItem[]) => l.reduce((s, i) => s + i.quantity * i.unit_value, 0)

  async function remove(i: LojaItem) {
    if (!confirm(`Excluir "${i.name}" do estoque?`)) return
    try {
      await deleteLojaItem(i.id, i.media)
      toastSuccess('Item excluído')
    } catch (e) { console.error(e); toastError(lojaErrorMessage(e, 'Não foi possível excluir.')) }
    load()
  }

  const done = (msg: string) => (warning?: string) => { setForm(null); setReceive(null); if (warning) toastError(warning); else toastSuccess(msg); load() }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Estoque</h1>
          <p className="text-sm text-zinc-500">Equipamentos e peças da loja</p>
        </div>
        <button type="button" onClick={() => setForm({ item: null })} className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Cadastrar
        </button>
      </div>

      {loadError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{loadError}</p>}

      {/* Equipamentos | Peças */}
      <div className="grid grid-cols-2 gap-2">
        {([['maquina', 'Equipamentos', Refrigerator], ['peca', 'Peças', Package]] as const).map(([k, l, Icon]) => {
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
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={kind === 'maquina' ? 'Buscar equipamento...' : 'Buscar peça...'}
          className="w-full pl-9 pr-9 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
        {query && <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400"><X className="w-4 h-4" /></button>}
      </div>

      <div className="space-y-2">
        {items === null ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-24 bg-zinc-100 rounded-2xl animate-pulse" />)
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 p-8 text-center">
            <p className="text-sm text-zinc-400">{query ? 'Nada encontrado' : kind === 'maquina' ? 'Nenhum equipamento cadastrado' : 'Nenhuma peça cadastrada'}</p>
            {!query && <button type="button" onClick={() => setForm({ item: null })} className="mt-2 text-sm font-semibold" style={{ color: 'var(--primary)' }}>Cadastrar agora</button>}
          </div>
        ) : list.map(i => (
          <div key={i.id} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 truncate">{i.name}</p>
                <p className="text-xs text-zinc-500 truncate">{[i.equipment_type && i.equipment_type !== i.name ? i.equipment_type : null, i.brand, i.model].filter(Boolean).join(' · ') || '—'}</p>
                {i.serial_number && <p className="text-xs text-zinc-500 truncate">Nº de série: <span className="font-medium text-zinc-700">{i.serial_number}</span></p>}
                {i.notes && <p className="text-xs text-zinc-400 truncate mt-0.5">{i.notes}</p>}
              </div>
              <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${i.quantity <= 0 ? 'bg-red-50 text-red-600' : i.quantity <= 1 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {i.quantity} un.
              </span>
            </div>
            {i.media.length > 0 && (
              <button type="button" onClick={() => setMediaOf(i)} className="flex gap-1.5 mt-2.5" aria-label="Ver fotos e vídeos">
                {i.media.slice(0, 4).map((m, idx) => (
                  <span key={m.path} className="relative block w-14 h-14 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100">
                    <MediaThumb src={mediaUrl(m.path)} video={m.video} />
                    {idx === 3 && i.media.length > 4 && <span className="absolute inset-0 bg-black/55 text-white text-xs font-bold flex items-center justify-center">+{i.media.length - 4}</span>}
                  </span>
                ))}
              </button>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
              <span>Custo <b className="text-zinc-700">{fmt(i.unit_value)}</b></span>
              <span>Venda <b className="text-zinc-700">{fmt(i.sale_value)}</b></span>
              {i.sale_value > 0 && i.unit_value > 0 && <span className="text-emerald-600 font-semibold">lucro {fmt(i.sale_value - i.unit_value)}</span>}
            </div>
            <div className="flex items-center gap-2 mt-3">
              {/* Abre a venda completa (comprador, pagamento, recibo) já com este item */}
              <Link href={`/dashboard/pedidos/novo?tipo=venda&item=${i.id}`} aria-disabled={i.quantity <= 0}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-white ${i.quantity <= 0 ? 'opacity-40 pointer-events-none' : ''}`}>
                <ShoppingCart className="w-4 h-4" /> Vendi
              </Link>
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

      {mediaOf && <MediaSheet item={mediaOf} onClose={() => setMediaOf(null)} />}
      {form && <ItemFormModal item={form.item} defaultKind={kind} knownTypes={customTypes} onClose={() => setForm(null)} onSaved={done(form.item ? 'Item atualizado!' : 'Item cadastrado!')} />}
      {receive && <ReceiveModal item={receive} onClose={() => setReceive(null)} onSaved={done('Estoque atualizado!')} />}
    </div>
  )
}
