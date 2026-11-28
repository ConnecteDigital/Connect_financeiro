'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Fuel, Camera, Paperclip, X, Loader2, Trash2, Receipt } from 'lucide-react'
import MoneyInput from '@/components/MoneyInput'
import { Sheet, input } from '@/components/LojaModals'
import { toastSuccess, toastError } from '@/components/Toast'
import { getFuelLogs, registerFuel, deleteFuel, fuelPhotoUrl, fuelErrorMessage, type FuelLog } from '@/lib/db/fuel'
import { localYmd } from '@/lib/tecnico-queue'
import { ptDate } from '@/lib/period'

const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

// Segunda a domingo da semana atual (a comissão é paga por semana)
function weekRange() {
  const now = new Date()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  return { start: localYmd(monday), end: localYmd(sunday) }
}

// Lançar abastecimento: valor + foto da nota
function FuelForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(localYmd())
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  function pick(list: FileList | null) {
    const file = list?.[0]
    if (!file) return
    if (photo) URL.revokeObjectURL(photo.preview)
    setPhoto({ file, preview: URL.createObjectURL(file) })
  }

  async function save() {
    const value = Number(amount) || 0
    if (value <= 0) { setError('Informe o valor do abastecimento.'); return }
    if (!photo) { setError('Tire a foto da nota fiscal.'); return }
    setBusy(true); setError('')
    try {
      await registerFuel({ amount: value, date, photo: photo.file, notes: notes.trim() })
      URL.revokeObjectURL(photo.preview)
      onSaved()
    } catch (e: any) {
      console.error(e)
      setError(fuelErrorMessage(e, 'Não foi possível lançar o abastecimento.'))
    } finally { setBusy(false) }
  }

  return (
    <Sheet title="Abastecimento" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">Valor (R$) *</label>
          <MoneyInput value={amount} onChange={e => setAmount(e.target.value)} className={input} placeholder="0,00" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">Data</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={input} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1.5">Foto da nota fiscal *</label>
        {photo ? (
          <div className="relative rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.preview} alt="Nota fiscal" className="w-full max-h-64 object-contain" />
            <button type="button" aria-label="Trocar foto" onClick={() => { URL.revokeObjectURL(photo.preview); setPhoto(null) }}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={() => cameraRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-orange-50 border border-orange-200 text-orange-600"><Camera className="w-4 h-4" /> Tirar foto</button>
            <button type="button" onClick={() => galleryRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-zinc-50 border border-zinc-200 text-zinc-600"><Paperclip className="w-4 h-4" /> Galeria</button>
          </div>
        )}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { pick(e.target.files); e.target.value = '' }} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={e => { pick(e.target.files); e.target.value = '' }} />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1.5">Observação (opcional)</label>
        <input value={notes} onChange={e => setNotes(e.target.value)} className={input} placeholder="Ex: Posto Ipiranga, tanque cheio" />
      </div>

      <p className="text-xs text-zinc-500">
        O valor volta pra você como reembolso, junto com a comissão da semana. A gasolina sai da base da comissão,
        então você perde só a sua porcentagem dela.
      </p>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-600">Cancelar</button>
        <button type="button" onClick={save} disabled={busy}
          className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2" style={{ background: 'var(--primary)' }}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Lançar
        </button>
      </div>
    </Sheet>
  )
}

// Lista de abastecimentos (com a foto da nota)
function FuelList({ logs, showName, onDelete }: { logs: FuelLog[]; showName?: boolean; onDelete: (l: FuelLog) => void }) {
  return (
    <div className="divide-y divide-zinc-50">
      {logs.map(l => (
        <div key={l.id} className="flex items-center gap-3 px-4 py-2.5">
          {l.photo_path ? (
            <a href={fuelPhotoUrl(l.photo_path)} target="_blank" rel="noopener noreferrer" aria-label="Ver nota fiscal"
              className="w-11 h-11 rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fuelPhotoUrl(l.photo_path)} alt="" loading="lazy" className="w-full h-full object-cover" />
            </a>
          ) : (
            <span className="w-11 h-11 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0"><Receipt className="w-4 h-4 text-zinc-400" /></span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-800 truncate">{showName ? `${l.auxiliary?.name ?? 'Técnico'} · ` : ''}{ptDate(l.date)}</p>
            <p className="text-xs text-zinc-500 truncate">
              {l.commission_pct > 0 ? `Comissão − ${fmt(l.amount * l.commission_pct / 100)} (${l.commission_pct}%)` : 'Sem desconto na comissão'}{l.notes ? ` · ${l.notes}` : ''}
            </p>
          </div>
          <span className="text-sm font-bold text-zinc-800 flex-shrink-0">{fmt(l.amount)}</span>
          <button type="button" aria-label="Apagar abastecimento" onClick={() => onDelete(l)} className="p-1.5 text-red-400 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
    </div>
  )
}

async function confirmDelete(l: FuelLog, after: () => void) {
  if (!confirm(`Apagar o abastecimento de ${fmt(l.amount)} (${ptDate(l.date)})? O reembolso e o desconto saem da comissão.`)) return
  try { await deleteFuel(l.id); toastSuccess('Abastecimento apagado'); after() }
  catch (e: any) { toastError(fuelErrorMessage(e, 'Não foi possível apagar.')) }
}

// Técnico: botão "Abastecimento" no Início + os lançados na semana
export function TecnicoFuelCard() {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<FuelLog[] | null>(null)
  const load = useCallback(() => { const { start, end } = weekRange(); getFuelLogs(start, end).then(setLogs) }, [])
  useEffect(() => { load() }, [load])
  const total = (logs ?? []).reduce((s, l) => s + l.amount, 0)

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-700 flex items-center gap-2"><Fuel className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Abastecimentos da semana</p>
          <p className="text-xs text-zinc-500">{logs === null ? '—' : logs.length === 0 ? 'Nenhum lançado' : `${logs.length} · ${fmt(total)}`}</p>
        </div>
        <button type="button" onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0" style={{ background: 'var(--primary)' }}>
          <Fuel className="w-4 h-4" /> Abastecer
        </button>
      </div>
      {logs && logs.length > 0 && <div className="border-t border-zinc-100"><FuelList logs={logs} onDelete={l => confirmDelete(l, load)} /></div>}
      {open && <FuelForm onClose={() => setOpen(false)} onSaved={() => { setOpen(false); toastSuccess('Abastecimento lançado!'); load() }} />}
    </div>
  )
}

// Gestor: abastecimentos de todos os técnicos no período (com a foto da nota)
export function GestorFuelCard({ start, end, onChanged }: { start: string; end: string; onChanged?: () => void }) {
  const [logs, setLogs] = useState<FuelLog[] | null>(null)
  const load = useCallback(() => { getFuelLogs(start, end).then(setLogs) }, [start, end])
  useEffect(() => { load() }, [load])
  if (!logs) return null
  const total = logs.reduce((s, l) => s + l.amount, 0)
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100">
        <p className="text-sm font-semibold text-zinc-700 flex items-center gap-2"><Fuel className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Abastecimentos dos técnicos</p>
        <p className="text-xs text-zinc-500">{logs.length === 0 ? 'Nenhum neste período' : `${logs.length} · ${fmt(total)} a reembolsar (já está na comissão de cada um)`}</p>
      </div>
      {logs.length > 0 && <FuelList logs={logs} showName onDelete={l => confirmDelete(l, () => { load(); onChanged?.() })} />}
    </div>
  )
}
