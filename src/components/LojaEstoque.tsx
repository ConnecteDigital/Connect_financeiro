'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, X, Pencil, Trash2, ShoppingCart, PackagePlus, Package, Refrigerator, Camera } from 'lucide-react'
import { ptDate } from '@/lib/period'
import { getLojaItems, deleteLojaItem, mediaUrl, lojaErrorMessage, itemCostTotal, costsTotal, EQUIPMENT_TYPES, type LojaItem, type ItemKind } from '@/lib/db/loja'
import Link from 'next/link'
import { ItemFormModal, ReceiveModal, MediaSheet, ymdOf } from '@/components/LojaModals'
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
  const stockValue = (l: LojaItem[]) => l.reduce((s, i) => s + i.quantity * itemCostTotal(i), 0)

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

      {/* Lista (mesmo jeito do estoque do técnico): nome, valores, quantidade, editar e excluir */}
      {items === null ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-zinc-100 rounded-2xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
            <p className="text-sm font-semibold text-zinc-700">
              {kind === 'maquina' ? 'Equipamentos' : 'Peças'} <span className="text-xs font-normal text-zinc-400">({query ? `${list.length} de ${of(kind).length}` : of(kind).length})</span>
            </p>
            <button type="button" onClick={() => setForm({ item: null })}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition"
              style={{ background: 'rgba(var(--primary-rgb),0.1)', color: 'var(--primary)' }}>
              <Plus className="w-3.5 h-3.5" /> Item
            </button>
          </div>
          {list.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-400">{query ? 'Nada encontrado' : kind === 'maquina' ? 'Nenhum equipamento cadastrado' : 'Nenhuma peça cadastrada'}</p>
          ) : (
            <div className="divide-y divide-zinc-50">
              {list.map(i => {
                const sub = [i.equipment_type && i.equipment_type !== i.name ? i.equipment_type : null, i.brand, i.model, i.serial_number ? `Nº ${i.serial_number}` : null].filter(Boolean).join(' · ')
                return (
                  <div key={i.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-800 break-words">{i.name}</p>
                        {sub && <p className="text-xs text-zinc-500 truncate">{sub}</p>}
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Custo {fmt(itemCostTotal(i))} · Venda {fmt(i.sale_value)}
                          {i.sale_value > 0 && itemCostTotal(i) > 0 && <span className={i.sale_value - itemCostTotal(i) >= 0 ? 'text-emerald-600' : 'text-red-500'}> · lucro {fmt(i.sale_value - itemCostTotal(i))}</span>}
                        </p>
                        {i.created_at && <p className="text-[11px] text-zinc-400">Cadastrado em {ptDate(ymdOf(i.created_at))}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${i.quantity <= 0 ? 'bg-red-50 text-red-600' : i.quantity <= 2 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-700'}`}>
                          {i.quantity} un.
                        </span>
                        <button type="button" aria-label="Editar" onClick={() => setForm({ item: i })} className="p-1.5 text-zinc-400 hover:bg-zinc-100 rounded-lg transition"><Pencil className="w-3.5 h-3.5" /></button>
                        <button type="button" aria-label="Excluir" onClick={() => remove(i)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    {/* Vender / chegou mais / fotos, sem ocupar a linha toda */}
                    <div className="flex items-center gap-3 mt-1.5 text-xs font-semibold">
                      <Link href={`/dashboard/pedidos/novo?tipo=venda&item=${i.id}`} aria-disabled={i.quantity <= 0}
                        className={`flex items-center gap-1 text-emerald-600 ${i.quantity <= 0 ? 'opacity-40 pointer-events-none' : ''}`}>
                        <ShoppingCart className="w-3.5 h-3.5" /> {i.kind === 'maquina' ? 'Vendido' : 'Vendi'}
                      </Link>
                      <button type="button" onClick={() => setReceive(i)} className="flex items-center gap-1 text-orange-600">
                        <PackagePlus className="w-3.5 h-3.5" /> Chegou
                      </button>
                      {i.media.length > 0 && (
                        <button type="button" onClick={() => setMediaOf(i)} className="flex items-center gap-1 text-zinc-500">
                          <Camera className="w-3.5 h-3.5" /> {i.media.length} foto{i.media.length !== 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {mediaOf && <MediaSheet item={mediaOf} onClose={() => setMediaOf(null)} />}
      {form && <ItemFormModal item={form.item} defaultKind={kind} knownTypes={customTypes} onClose={() => setForm(null)} onSaved={done(form.item ? 'Item atualizado!' : 'Item cadastrado!')} />}
      {receive && <ReceiveModal item={receive} onClose={() => setReceive(null)} onSaved={done('Estoque atualizado!')} />}
    </div>
  )
}
