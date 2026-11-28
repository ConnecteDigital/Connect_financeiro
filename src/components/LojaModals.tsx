'use client'

import MoneyInput from '@/components/MoneyInput'
import Portal from '@/components/Portal'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X, Loader2, Search, Plus, Camera, Video, Paperclip, Play, Send, Download } from 'lucide-react'
import { localYmd } from '@/lib/tecnico-queue'
import { receiveItem, saveLojaItem, saveLojaMedia, saveLojaCosts, mediaUrl, isVideoFile, lojaErrorMessage, kindLabel, costKindLabel, COST_KINDS, EQUIPMENT_TYPES, type LojaItem, type LojaMedia, type LojaCost, type CostKind, type ItemKind } from '@/lib/db/loja'

const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
// AAAA-MM-DD no horário do Brasil
export function ymdOf(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
export const input = 'w-full px-3 py-2.5 border border-zinc-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]'
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Portal>
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[95dvh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-zinc-100 z-10">
          <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>{children}</div>
      </div>
    </div>
    </Portal>
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

// Cadastrar / editar equipamento ou peça
interface PendingMedia { id: string; file: File; preview: string; video: boolean }

export function ItemFormModal({ item, defaultKind, knownTypes = [], onClose, onSaved }: {
  item?: LojaItem | null; defaultKind: ItemKind; knownTypes?: string[]; onClose: () => void; onSaved: (warning?: string) => void
}) {
  const [kind, setKind] = useState<ItemKind>(item?.kind ?? defaultKind)
  const [name, setName] = useState(item?.name ?? '')
  const [brand, setBrand] = useState(item?.brand ?? '')
  const [model, setModel] = useState(item?.model ?? '')
  const [quantity, setQuantity] = useState(item ? String(item.quantity) : '1')
  const [cost, setCost] = useState(item ? String(item.unit_value || '') : '')
  const [price, setPrice] = useState(item ? String(item.sale_value || '') : '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [eqType, setEqType] = useState(item?.equipment_type ?? '')
  const [serial, setSerial] = useState(item?.serial_number ?? '')
  // Data de cadastro: hoje, ou a que já estava salva
  const origDate = item?.created_at ? ymdOf(item.created_at) : ''
  const [regDate, setRegDate] = useState(origDate || ymdOf(new Date().toISOString()))
  // Tipos: os prontos + os que a loja já usou + os criados agora no "+"
  const [extraTypes, setExtraTypes] = useState<string[]>([])
  const [addingType, setAddingType] = useState(false)
  const [newType, setNewType] = useState('')
  // Fotos e vídeos: os já salvos (keep), os removidos e os novos
  const [keep, setKeep] = useState<LojaMedia[]>(item?.media ?? [])
  const [removed, setRemoved] = useState<LojaMedia[]>([])
  const [pending, setPending] = useState<PendingMedia[]>([])
  // Gastos pra deixar o aparelho pronto pra venda (peça usada, conserto, carreto...)
  const [costs, setCosts] = useState<(LojaCost & { launch?: boolean })[]>(item?.costs ?? [])
  const [removedCosts, setRemovedCosts] = useState<LojaCost[]>([])
  const [costKind, setCostKind] = useState<CostKind>('peca')
  const [costDesc, setCostDesc] = useState('')
  const [costAmount, setCostAmount] = useState('')
  const [costLaunch, setCostLaunch] = useState(true)
  const photoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isEquip = kind === 'maquina'

  const types = Array.from(new Set([...EQUIPMENT_TYPES, ...knownTypes, ...extraTypes, ...(eqType ? [eqType] : [])].map(t => t.trim()).filter(Boolean)))

  function confirmNewType() {
    const t = newType.trim()
    if (t) { setExtraTypes(prev => [...prev, t]); setEqType(t) }
    setNewType(''); setAddingType(false)
  }

  function addCost() {
    const amount = Number(costAmount) || 0
    if (amount <= 0) { setError('Informe o valor do gasto.'); return }
    setError('')
    setCosts(prev => [...prev, { id: `${Date.now()}${Math.round(Math.random() * 1e6)}`, kind: costKind, description: costDesc.trim(), amount, launch: costLaunch }])
    setCostDesc(''); setCostAmount('')
  }
  const costsSum = costs.reduce((t, c) => t + Number(c.amount || 0), 0)
  const fullCost = (Number(cost) || 0) + costsSum
  const profit = (Number(price) || 0) - fullCost

  function addFiles(list: FileList | null) {
    if (!list?.length) return
    setPending(prev => [...prev, ...Array.from(list).map(file => ({
      id: `${Date.now()}${Math.random()}`, file, preview: URL.createObjectURL(file), video: isVideoFile(file),
    }))])
  }

  async function save() {
    const finalName = name.trim() || (isEquip ? eqType.trim() : '')
    if (!finalName) { setError(isEquip ? 'Escolha o equipamento ou digite uma descrição.' : 'Digite o nome da peça.'); return }
    setBusy(true); setError('')
    let id: string
    try {
      id = await saveLojaItem({
        kind, name: finalName, brand: brand.trim() || null, model: model.trim() || null, notes: notes.trim() || null,
        quantity: Math.max(0, Math.round(Number(quantity) || 0)), unit_value: Number(cost) || 0, sale_value: Number(price) || 0,
        equipment_type: isEquip ? (eqType.trim() || null) : null, serial_number: isEquip ? (serial.trim() || null) : null,
        // Só manda a data se mudou (meio-dia de Brasília pra não virar o dia)
        ...(regDate && regDate !== origDate ? { created_at: `${regDate}T12:00:00-03:00` } : {}),
      }, item?.id)
    } catch (e: any) {
      console.error(e)
      setError(lojaErrorMessage(e, 'Não foi possível salvar.'))
      setBusy(false)
      return
    }
    // O item já está salvo; gastos e fotos/vídeos vão depois
    let warning: string | undefined
    if (isEquip && (costs.length > 0 || removedCosts.length > 0)) {
      try {
        await saveLojaCosts(id, [finalName, brand.trim(), model.trim()].filter(Boolean).join(' '), costs, removedCosts)
      } catch (e: any) {
        console.error(e)
        warning = lojaErrorMessage(e, 'Item salvo, mas os gastos não foram gravados.')
      }
    }
    if (pending.length > 0 || removed.length > 0) {
      try {
        const failed = await saveLojaMedia(id, keep, removed, pending.map(p => p.file))
        if (failed > 0) warning = `Item salvo, mas ${failed} arquivo${failed > 1 ? 's' : ''} não subi${failed > 1 ? 'ram' : 'u'} (vídeo muito grande ou sem internet). Edite o item pra tentar de novo.`
      } catch (e: any) {
        console.error(e)
        warning = warning ?? lojaErrorMessage(e, 'Item salvo, mas as fotos não foram gravadas.')
      }
    }
    pending.forEach(p => URL.revokeObjectURL(p.preview))
    onSaved(warning)
  }

  const thumb = 'relative rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100 h-20'
  const removeBtn = 'absolute top-1 right-1 bg-black/60 text-white rounded-full p-1'

  return (
    <Sheet title={item ? 'Editar item' : 'Cadastrar item'} onClose={onClose}>
      <div className="flex bg-zinc-100 rounded-xl p-1">
        {([['maquina', 'Equipamento'], ['peca', 'Peça']] as const).map(([v, l]) => (
          <button key={v} type="button" onClick={() => setKind(v)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${kind === v ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>{l}</button>
        ))}
      </div>

      {isEquip && (
        <Field label="Qual equipamento? *">
          <div className="flex flex-wrap gap-2">
            {types.map(t => (
              <button key={t} type="button" onClick={() => setEqType(eqType === t ? '' : t)}
                className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${eqType === t ? 'text-white border-transparent' : 'bg-white text-zinc-700 border-zinc-200'}`}
                style={eqType === t ? { background: 'var(--primary)' } : {}}>{t}</button>
            ))}
            {!addingType && (
              <button type="button" onClick={() => setAddingType(true)} aria-label="Adicionar equipamento"
                className="px-3 py-2 rounded-xl text-sm font-semibold border border-dashed border-zinc-300 text-zinc-600 flex items-center gap-1">
                <Plus className="w-4 h-4" /> Outro
              </button>
            )}
          </div>
          {addingType && (
            <div className="flex gap-2 mt-2">
              <input autoFocus value={newType} onChange={e => setNewType(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') confirmNewType() }}
                className={input} placeholder="Ex: Lava-louças, Ar-condicionado..." />
              <button type="button" onClick={confirmNewType} className="px-4 rounded-xl text-sm font-bold text-white flex-shrink-0" style={{ background: 'var(--primary)' }}>OK</button>
            </div>
          )}
        </Field>
      )}

      <Field label={isEquip ? 'Descrição' : 'Nome *'}>
        <input value={name} onChange={e => setName(e.target.value)} className={input}
          placeholder={isEquip ? 'Ex: Frost Free 400L inox (opcional)' : 'Ex: Compressor 1/4 HP'} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Marca"><input value={brand} onChange={e => setBrand(e.target.value)} className={input} placeholder="Ex: Brastemp" /></Field>
        <Field label="Modelo"><input value={model} onChange={e => setModel(e.target.value)} className={input} placeholder="Ex: BRM50" /></Field>
      </div>
      {isEquip && (
        <Field label="Número de série"><input value={serial} onChange={e => setSerial(e.target.value)} className={input} placeholder="Está na etiqueta do aparelho" /></Field>
      )}
      <div className="grid grid-cols-3 gap-3">
        <Field label="Quantidade"><input type="number" inputMode="numeric" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} className={input} /></Field>
        <Field label="Custo (R$)"><MoneyInput inputMode="decimal" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} className={input} placeholder="0,00" /></Field>
        <Field label="Venda (R$)"><MoneyInput inputMode="decimal" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className={input} placeholder="0,00" /></Field>
      </div>
      <Field label="Data de cadastro"><input type="date" value={regDate} onChange={e => setRegDate(e.target.value)} className={input} /></Field>
      <Field label="Observação"><input value={notes} onChange={e => setNotes(e.target.value)} className={input} placeholder="Ex: usada, revisada, garantia 3 meses..." /></Field>

      {isEquip && (
        <Field label="Gastos com o aparelho (peça usada, conserto, carreto...)">
          {costs.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {costs.map(c => (
                <div key={c.id} className="flex items-center gap-2 bg-zinc-50 rounded-xl px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-800 truncate">{costKindLabel(c.kind)}{c.description ? ` · ${c.description}` : ''}</p>
                    <p className="text-[11px] text-zinc-400">{c.expense_id ? 'Lançado no caixa' : c.launch ? 'Vai pro caixa ao salvar' : 'Só no custo do aparelho'}</p>
                  </div>
                  <span className="text-sm font-bold text-zinc-800 flex-shrink-0">{fmt(c.amount)}</span>
                  <button type="button" aria-label="Remover gasto" onClick={() => { setCosts(l => l.filter(x => x.id !== c.id)); if (c.expense_id) setRemovedCosts(r => [...r, c]) }} className="p-1.5 text-red-400"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="rounded-xl border border-zinc-200 p-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {COST_KINDS.map(k => (
                <button key={k.key} type="button" onClick={() => setCostKind(k.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${costKind === k.key ? 'text-white border-transparent' : 'bg-white text-zinc-600 border-zinc-200'}`}
                  style={costKind === k.key ? { background: 'var(--primary)' } : {}}>{k.label}</button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input value={costDesc} onChange={e => setCostDesc(e.target.value)} className={`${input} col-span-2`} placeholder={COST_KINDS.find(k => k.key === costKind)!.placeholder} />
              <MoneyInput value={costAmount} onChange={e => setCostAmount(e.target.value)} className={input} placeholder="0,00" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={costLaunch} onChange={e => setCostLaunch(e.target.checked)} className="w-4 h-4 accent-orange-500" />
              <span className="text-xs text-zinc-600">Lançar como saída no caixa (dinheiro que saiu hoje)</span>
            </label>
            <button type="button" onClick={addCost} className="w-full py-2 rounded-xl text-sm font-semibold border border-dashed border-zinc-300 text-zinc-700 flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" /> Adicionar gasto
            </button>
          </div>
          {(fullCost > 0 || Number(price) > 0) && (
            <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2.5 mt-2 space-y-1 text-sm">
              <div className="flex justify-between text-zinc-600"><span>Compra</span><span>{fmt(Number(cost) || 0)}</span></div>
              <div className="flex justify-between text-zinc-600"><span>Gastos</span><span>{fmt(costsSum)}</span></div>
              <div className="flex justify-between font-bold text-zinc-900 border-t border-zinc-200 pt-1"><span>Custo total</span><span>{fmt(fullCost)}</span></div>
              {Number(price) > 0 && <div className={`flex justify-between font-bold ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}><span>Lucro se vender por {fmt(Number(price))}</span><span>{fmt(profit)}</span></div>}
            </div>
          )}
        </Field>
      )}

      {isEquip && (
        <Field label="Fotos e vídeos">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => photoRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-orange-50 border border-orange-200 text-orange-600"><Camera className="w-4 h-4" /> Foto</button>
            <button type="button" onClick={() => videoRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-orange-50 border border-orange-200 text-orange-600"><Video className="w-4 h-4" /> Vídeo</button>
            <button type="button" onClick={() => galleryRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium bg-zinc-50 border border-zinc-200 text-zinc-600"><Paperclip className="w-4 h-4" /> Galeria</button>
          </div>
          <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
          <input ref={videoRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
          <input ref={galleryRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
          {(keep.length > 0 || pending.length > 0) && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {keep.map(m => (
                <div key={m.path} className={thumb}>
                  <MediaThumb src={mediaUrl(m.path)} video={m.video} />
                  <button type="button" onClick={() => { setKeep(k => k.filter(x => x.path !== m.path)); setRemoved(r => [...r, m]) }} className={removeBtn}><X className="w-3 h-3" /></button>
                </div>
              ))}
              {pending.map(p => (
                <div key={p.id} className={thumb}>
                  <MediaThumb src={p.preview} video={p.video} />
                  <button type="button" onClick={() => { URL.revokeObjectURL(p.preview); setPending(l => l.filter(x => x.id !== p.id)) }} className={removeBtn}><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-zinc-400 mt-1.5">Vídeo curto sobe melhor. As fotos e vídeos são enviados quando você tocar em Salvar.</p>
        </Field>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      <Actions busy={busy} onClose={onClose} onSave={save} label={busy && pending.length > 0 ? 'Enviando...' : 'Salvar'} />
    </Sheet>
  )
}

// Miniatura de foto ou vídeo (vídeo aparece com o símbolo de play)
export function MediaThumb({ src, video }: { src: string; video: boolean }) {
  if (!video) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
  }
  return (
    <>
      <video src={`${src}#t=0.1`} muted playsInline preload="metadata" className="w-full h-full object-cover bg-zinc-800" />
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="w-8 h-8 rounded-full bg-black/55 flex items-center justify-center"><Play className="w-4 h-4 text-white fill-white" /></span>
      </span>
    </>
  )
}

// Ver as fotos e vídeos de um equipamento — e enviar pro cliente interessado.
// Os arquivos são baixados assim que a tela abre: o celular só deixa abrir
// o "compartilhar" se ele vier logo depois do toque.
export function MediaSheet({ item, onClose }: { item: LojaItem; onClose: () => void }) {
  const [files, setFiles] = useState<File[] | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all(item.media.map(async (m, i) => {
      const res = await fetch(mediaUrl(m.path))
      const blob = await res.blob()
      const ext = (m.path.split('.').pop() || (m.video ? 'mp4' : 'jpg')).toLowerCase()
      return new File([blob], `${item.name.replace(/[^a-zA-Z0-9]+/g, '_')}_${i + 1}.${ext}`, { type: blob.type || (m.video ? 'video/mp4' : 'image/jpeg') })
    })).then(f => { if (alive) setFiles(f) }).catch(e => { console.error(e); if (alive) setFiles([]) })
    return () => { alive = false }
  }, [item])

  function download(list: File[]) {
    for (const f of list) {
      const url = URL.createObjectURL(f)
      const a = document.createElement('a')
      a.href = url; a.download = f.name; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
    }
  }

  async function send() {
    if (!files?.length) return
    setBusy(true)
    try {
      if (navigator.canShare?.({ files })) await navigator.share({ files, title: item.name })
      else download(files)
    } catch (e: any) {
      if (e?.name !== 'AbortError') download(files)
    } finally { setBusy(false) }
  }

  return (
    <Sheet title={item.name} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={send} disabled={!files?.length || busy}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 disabled:opacity-50">
          {files === null || busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {files === null ? 'Preparando...' : 'Enviar pro cliente'}
        </button>
        <button type="button" onClick={() => files && download(files)} disabled={!files?.length}
          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-zinc-700 bg-zinc-100 disabled:opacity-50">
          <Download className="w-4 h-4" /> Baixar tudo
        </button>
      </div>
      <div className="space-y-3">
        {item.media.map(m => m.video ? (
          <video key={m.path} src={mediaUrl(m.path)} controls playsInline preload="metadata" className="w-full rounded-xl bg-black max-h-[70dvh]" />
        ) : (
          <a key={m.path} href={mediaUrl(m.path)} target="_blank" rel="noopener noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(m.path)} alt="" className="w-full rounded-xl border border-zinc-100" />
          </a>
        ))}
      </div>
    </Sheet>
  )
}

// Escolher o item (quando a venda/chegada começa pelo Início)
export function ItemPicker({ items, onPick }: { items: LojaItem[]; onPick: (i: LojaItem) => void }) {
  const [q, setQ] = useState('')
  const list = items.filter(i => norm([i.name, i.equipment_type, i.brand, i.model, i.serial_number].filter(Boolean).join(' ')).includes(norm(q.trim())))
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar equipamento ou peça..." className={`${input} pl-9`} />
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-zinc-50 border border-zinc-100 rounded-xl">
        {list.length === 0 ? <p className="px-3 py-4 text-sm text-zinc-400 text-center">Nada encontrado. Cadastre o item no Estoque.</p> : list.map(i => (
          <button key={i.id} type="button" onClick={() => onPick(i)} className="w-full text-left px-3 py-2.5 hover:bg-zinc-50 flex justify-between gap-2">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-zinc-800 truncate">{i.name}</span>
              <span className="block text-xs text-zinc-500 truncate">{[kindLabel(i.kind), i.brand, i.model].filter(Boolean).join(' · ')}</span>
            </span>
            <span className={`text-xs font-semibold flex-shrink-0 ${i.quantity > 0 ? 'text-zinc-500' : 'text-red-500'}`}>{i.quantity} un.</span>
          </button>
        ))}
      </div>
    </div>
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
    } catch (e) { console.error(e); setError(lojaErrorMessage(e, 'Não foi possível registrar.')) }
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
            <Field label="Custo unitário (R$)"><MoneyInput min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} className={input} placeholder="0,00" /></Field>
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
