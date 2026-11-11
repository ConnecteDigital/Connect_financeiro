'use client'

import { useState, type ReactNode } from 'react'
import { X, Loader2, Search } from 'lucide-react'
import { localYmd } from '@/lib/tecnico-queue'
import { sellItem, receiveItem, saveLojaItem, type LojaItem, type ItemKind } from '@/lib/db/loja'

const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
export const input = 'w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]'
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95dvh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-zinc-100 z-10">
          <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><label className="block text-xs font-medium text-zinc-500 mb-1.5">{label}</label>{children}</div>
}

function Actions({ busy, onClose, onSave, label, disabled }: { busy: boolean; onClose: () => void; onSave: () => void; label: string; disabled?: boolean }) {
  return (
    <div className="flex gap-2 pt-1">
      <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-600">Cancelar</button>
      <button type="button" onClick={onSave} disabled={busy || disabled}
        className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: 'var(--primary)' }}>
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} {label}
      </button>
    </div>
  )
}

// Cadastrar / editar máquina ou peça
export function ItemFormModal({ item, defaultKind, onClose, onSaved }: { item?: LojaItem | null; defaultKind: ItemKind; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<ItemKind>(item?.kind ?? defaultKind)
  const [name, setName] = useState(item?.name ?? '')
  const [brand, setBrand] = useState(item?.brand ?? '')
  const [model, setModel] = useState(item?.model ?? '')
  const [quantity, setQuantity] = useState(item ? String(item.quantity) : '1')
  const [cost, setCost] = useState(item ? String(item.unit_value || '') : '')
  const [price, setPrice] = useState(item ? String(item.sale_value || '') : '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!name.trim()) { setError('Digite o nome.'); return }
    setBusy(true); setError('')
    try {
      await saveLojaItem({
        kind, name: name.trim(), brand: brand.trim() || null, model: model.trim() || null, notes: notes.trim() || null,
        quantity: Math.max(0, Number(quantity) || 0), unit_value: Number(cost) || 0, sale_value: Number(price) || 0,
      }, item?.id)
      onSaved()
    } catch (e: any) {
      console.error(e)
      setError(String(e?.message ?? '').includes('kind') || String(e?.message ?? '').includes('sale_value') ? 'Rode a migration_v32.sql no Supabase.' : 'Não foi possível salvar.')
    } finally { setBusy(false) }
  }

  return (
    <Sheet title={item ? 'Editar item' : 'Cadastrar item'} onClose={onClose}>
      <div className="flex bg-zinc-100 rounded-xl p-1">
        {([['maquina', 'Máquina'], ['peca', 'Peça']] as const).map(([v, l]) => (
          <button key={v} type="button" onClick={() => setKind(v)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${kind === v ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>{l}</button>
        ))}
      </div>
      <Field label="Nome *"><input value={name} onChange={e => setName(e.target.value)} className={input} placeholder={kind === 'maquina' ? 'Ex: Geladeira Frost Free 400L' : 'Ex: Compressor 1/4 HP'} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Marca"><input value={brand} onChange={e => setBrand(e.target.value)} className={input} placeholder="Ex: Brastemp" /></Field>
        <Field label="Modelo"><input value={model} onChange={e => setModel(e.target.value)} className={input} placeholder="Ex: BRM50" /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Quantidade"><input type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} className={input} /></Field>
        <Field label="Custo (R$)"><input type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} className={input} placeholder="0,00" /></Field>
        <Field label="Venda (R$)"><input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className={input} placeholder="0,00" /></Field>
      </div>
      <Field label="Observação"><input value={notes} onChange={e => setNotes(e.target.value)} className={input} placeholder="Ex: usada, revisada, garantia 3 meses..." /></Field>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Actions busy={busy} onClose={onClose} onSave={save} label="Salvar" />
    </Sheet>
  )
}

// Escolher o item (quando a venda/chegada começa pelo Início)
export function ItemPicker({ items, onPick }: { items: LojaItem[]; onPick: (i: LojaItem) => void }) {
  const [q, setQ] = useState('')
  const list = items.filter(i => norm([i.name, i.brand, i.model].filter(Boolean).join(' ')).includes(norm(q.trim())))
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar máquina ou peça..." className={`${input} pl-9`} />
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-zinc-50 border border-zinc-100 rounded-xl">
        {list.length === 0 ? <p className="px-3 py-4 text-sm text-zinc-400 text-center">Nada encontrado. Cadastre o item no Estoque.</p> : list.map(i => (
          <button key={i.id} type="button" onClick={() => onPick(i)} className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 flex justify-between gap-2">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-zinc-800 truncate">{i.name}</span>
              <span className="block text-xs text-zinc-500 truncate">{[i.kind === 'maquina' ? 'Máquina' : 'Peça', i.brand, i.model].filter(Boolean).join(' · ')}</span>
            </span>
            <span className={`text-xs font-semibold flex-shrink-0 ${i.quantity > 0 ? 'text-zinc-500' : 'text-red-500'}`}>{i.quantity} un.</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const PAYMENTS = ['PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Boleto', 'Transferência']

// Vendeu
export function SellModal({ item, items, onClose, onSaved }: { item?: LojaItem | null; items?: LojaItem[]; onClose: () => void; onSaved: () => void }) {
  const [picked, setPicked] = useState<LojaItem | null>(item ?? null)
  const [quantity, setQuantity] = useState('1')
  const [price, setPrice] = useState(item?.sale_value ? String(item.sale_value) : '')
  const [date, setDate] = useState(localYmd())
  const [payment, setPayment] = useState('PIX')
  const [client, setClient] = useState('')
  const [received, setReceived] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const qty = Math.max(1, Number(quantity) || 1)
  const total = qty * (Number(price) || 0)

  async function save() {
    if (!picked) return
    if (!(Number(price) > 0)) { setError('Informe o valor da venda.'); return }
    setBusy(true); setError('')
    try {
      await sellItem(picked, { quantity: qty, unitPrice: Number(price), date, payment, client: client.trim(), received })
      onSaved()
    } catch (e) { console.error(e); setError('Não foi possível registrar a venda.') }
    finally { setBusy(false) }
  }

  return (
    <Sheet title="Registrar venda" onClose={onClose}>
      {!picked ? <ItemPicker items={items ?? []} onPick={i => { setPicked(i); setPrice(i.sale_value ? String(i.sale_value) : '') }} /> : (
        <>
          <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2.5 flex justify-between items-center gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-800 truncate">{picked.name}</p>
              <p className="text-xs text-zinc-500">{[picked.brand, picked.model].filter(Boolean).join(' · ') || (picked.kind === 'maquina' ? 'Máquina' : 'Peça')} · {picked.quantity} em estoque</p>
            </div>
            {!item && <button type="button" onClick={() => setPicked(null)} className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>Trocar</button>}
          </div>
          {picked.quantity < qty && <p className="text-xs text-amber-600">Atenção: o estoque tem só {picked.quantity}. Ele vai ficar zerado.</p>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantidade"><input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className={input} /></Field>
            <Field label="Valor unitário (R$) *"><input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className={input} placeholder="0,00" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={input} /></Field>
            <Field label="Pagamento">
              <select value={payment} onChange={e => setPayment(e.target.value)} className={input}>{PAYMENTS.map(p => <option key={p}>{p}</option>)}</select>
            </Field>
          </div>
          <Field label="Cliente (opcional)"><input value={client} onChange={e => setClient(e.target.value)} className={input} placeholder="Nome de quem comprou" /></Field>
          <label className="flex items-center gap-3 p-3 border border-zinc-200 rounded-xl cursor-pointer">
            <input type="checkbox" checked={received} onChange={e => setReceived(e.target.checked)} className="w-5 h-5 accent-emerald-500" />
            <span className="text-sm text-zinc-700">Já recebi o dinheiro</span>
          </label>
          <div className="flex justify-between items-center rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
            <span className="text-sm font-medium text-emerald-800">Total da venda</span>
            <span className="text-lg font-bold text-emerald-700">{fmt(total)}</span>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Actions busy={busy} onClose={onClose} onSave={save} label="Registrar venda" />
        </>
      )}
    </Sheet>
  )
}

// Chegou mercadoria
export function ReceiveModal({ item, items, onClose, onSaved }: { item?: LojaItem | null; items?: LojaItem[]; onClose: () => void; onSaved: () => void }) {
  const [picked, setPicked] = useState<LojaItem | null>(item ?? null)
  const [quantity, setQuantity] = useState('1')
  const [cost, setCost] = useState(item?.unit_value ? String(item.unit_value) : '')
  const [date, setDate] = useState(localYmd())
  const [supplier, setSupplier] = useState('')
  const [launch, setLaunch] = useState(true)
  const [paid, setPaid] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const qty = Math.max(1, Number(quantity) || 1)

  async function save() {
    if (!picked) return
    setBusy(true); setError('')
    try {
      await receiveItem(picked, { quantity: qty, unitCost: Number(cost) || 0, date, launchExpense: launch, paid, supplier: supplier.trim() })
      onSaved()
    } catch (e) { console.error(e); setError('Não foi possível registrar.') }
    finally { setBusy(false) }
  }

  return (
    <Sheet title="Chegou mercadoria" onClose={onClose}>
      {!picked ? <ItemPicker items={items ?? []} onPick={i => { setPicked(i); setCost(i.unit_value ? String(i.unit_value) : '') }} /> : (
        <>
          <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2.5 flex justify-between items-center gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-800 truncate">{picked.name}</p>
              <p className="text-xs text-zinc-500">{picked.quantity} em estoque agora</p>
            </div>
            {!item && <button type="button" onClick={() => setPicked(null)} className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>Trocar</button>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantidade que chegou"><input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className={input} /></Field>
            <Field label="Custo unitário (R$)"><input type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} className={input} placeholder="0,00" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={input} /></Field>
            <Field label="Fornecedor (opcional)"><input value={supplier} onChange={e => setSupplier(e.target.value)} className={input} /></Field>
          </div>
          <label className="flex items-center gap-3 p-3 border border-zinc-200 rounded-xl cursor-pointer">
            <input type="checkbox" checked={launch} onChange={e => setLaunch(e.target.checked)} className="w-5 h-5 accent-orange-500" />
            <span className="text-sm text-zinc-700">Lançar a compra como saída no Financeiro</span>
          </label>
          {launch && (
            <label className="flex items-center gap-3 p-3 border border-zinc-200 rounded-xl cursor-pointer">
              <input type="checkbox" checked={paid} onChange={e => setPaid(e.target.checked)} className="w-5 h-5 accent-orange-500" />
              <span className="text-sm text-zinc-700">Já paguei</span>
            </label>
          )}
          {launch && Number(cost) > 0 && (
            <div className="flex justify-between items-center rounded-xl bg-orange-50 border border-orange-100 px-4 py-3">
              <span className="text-sm font-medium text-orange-800">Total da compra</span>
              <span className="text-lg font-bold text-orange-700">{fmt(qty * Number(cost))}</span>
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Actions busy={busy} onClose={onClose} onSave={save} label="Registrar" />
        </>
      )}
    </Sheet>
  )
}
