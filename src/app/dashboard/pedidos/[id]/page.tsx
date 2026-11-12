'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2, FileText, Phone, MapPin, CalendarClock, CheckCircle2, Wallet, Camera, Paperclip, Loader2, Undo2, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/lib/tenant-context'
import {
  getShopOrder, updateShopOrder, deleteShopOrder, receiveOrderPayment, undoOrderPayment, applyOrderStock,
  orderNumber, statusOf, linesTotal, ORDER_STATUSES, PAYMENT_METHODS, type ShopOrder, type OrderLine,
} from '@/lib/db/shop-orders'
import PhotoGallery, { type GalleryFile } from '@/components/PhotoGallery'
import ShopOrderDocument from '@/components/ShopOrderDocument'
import { Sheet, input } from '@/components/LojaModals'
import { toastSuccess } from '@/components/Toast'
import { ptDate } from '@/lib/period'
import { localYmd } from '@/lib/tecnico-queue'

const fmt = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const BUCKET = 'chamados-anexos'

function Info({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return <div><p className="text-xs font-medium text-zinc-400">{label}</p><p className="text-sm text-zinc-800 whitespace-pre-line">{value}</p></div>
}

export default function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { tenant } = useTenant()
  const [order, setOrder] = useState<ShopOrder | null | undefined>(undefined)
  const [files, setFiles] = useState<GalleryFile[]>([])
  const [photoData, setPhotoData] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [docOpen, setDocOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => getShopOrder(id).then(setOrder).catch(() => setOrder(null)), [id])
  useEffect(() => { load() }, [load])

  const loadFiles = useCallback(async () => {
    const storage = createClient().storage.from(BUCKET)
    const { data } = await storage.list(`pedido-${id}`, { sortBy: { column: 'created_at', order: 'asc' } })
    setFiles((data ?? []).filter(f => f.name && !f.name.startsWith('.')).map(f => ({
      name: f.name.replace(/^\d+_/, ''),
      url: storage.getPublicUrl(`pedido-${id}/${f.name}`).data.publicUrl,
      image: /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(f.name),
    })))
  }, [id])
  useEffect(() => { loadFiles().catch(() => {}) }, [loadFiles])

  async function upload(list: FileList | null) {
    if (!list?.length) return
    setUploading(true)
    try {
      const storage = createClient().storage.from(BUCKET)
      for (const file of Array.from(list)) {
        const safe = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
        const { error } = await storage.upload(`pedido-${id}/${Date.now()}_${safe}`, file)
        if (error) throw error
      }
      toastSuccess('Foto anexada!')
      await loadFiles()
    } catch (e) { console.error(e); alert('Não foi possível anexar a foto.') }
    finally { setUploading(false) }
  }

  // Fotos já baixadas (pra entrar no PDF), só quando for gerar documento
  async function openDocument() {
    const imgs = files.filter(f => f.image).slice(0, 6)
    const data = await Promise.all(imgs.map(async f => {
      try {
        const blob = await (await fetch(f.url)).blob()
        return await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(blob) })
      } catch { return f.url }
    }))
    setPhotoData(data)
    setDocOpen(true)
  }

  async function changeStatus(status: string) {
    if (!order) return
    setBusy(true)
    try {
      await updateShopOrder(order.id, { status })
      // Peças do estoque saem quando o aparelho é entregue/concluído e voltam se cancelar
      const done = ['enviado', 'concluido', 'garantia'].includes(status)
      if (done && !order.stock_applied) await applyOrderStock(order, true)
      if (status === 'cancelado' && order.stock_applied) await applyOrderStock(order, false)
      toastSuccess('Situação atualizada!')
      setStatusOpen(false)
      await load()
    } catch (e) { console.error(e); alert('Não foi possível mudar a situação.') }
    finally { setBusy(false) }
  }

  async function remove() {
    if (!order || !confirm(`Excluir o pedido ${orderNumber(order)}? Isso não pode ser desfeito.`)) return
    if (order.stock_applied) await applyOrderStock(order, false).catch(console.error)
    await deleteShopOrder(order.id)
    toastSuccess('Pedido excluído')
    router.push('/dashboard/pedidos')
  }

  if (order === undefined) return <div className="max-w-2xl mx-auto h-40 bg-zinc-100 rounded-2xl animate-pulse" />
  if (!order) return (
    <div className="text-center py-16 space-y-2">
      <p className="text-zinc-500">Pedido não encontrado.</p>
      <Link href="/dashboard/pedidos" className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>← Voltar</Link>
    </div>
  )

  const st = statusOf(order.status)
  const phoneDigits = (order.client_phone ?? '').replace(/\D/g, '')
  const lines = (title: string, list: OrderLine[]) => list.length === 0 ? null : (
    <div>
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">{title}</p>
      <div className="space-y-1.5">
        {list.map((l, i) => (
          <div key={i} className="flex justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="text-zinc-800">{l.quantity} {l.unit || 'un.'} · {l.description}</p>
              {l.details && <p className="text-xs text-zinc-500">{l.details}</p>}
            </div>
            <span className="font-semibold text-zinc-800 flex-shrink-0">{fmt(l.quantity * l.unit_price)}</span>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-3 pb-24">
      <div className="flex items-start gap-3">
        <Link href="/dashboard/pedidos" className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 mt-0.5"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-zinc-900">Pedido n. {orderNumber(order)}</h1>
          <p className="text-sm text-zinc-500">{ptDate(order.date)}</p>
        </div>
        <Link href={`/dashboard/pedidos/${order.id}/editar`} className="p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-600"><Pencil className="w-4 h-4" /></Link>
        <button type="button" onClick={remove} className="p-2.5 rounded-xl bg-white border border-red-200 text-red-500"><Trash2 className="w-4 h-4" /></button>
      </div>

      {/* Situação */}
      <button type="button" onClick={() => setStatusOpen(true)} className="w-full bg-white rounded-2xl border border-zinc-100 shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="text-left">
          <p className="text-xs font-medium text-zinc-400">Situação do pedido</p>
          <p className="text-base font-bold text-zinc-900 flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />{st.label}</p>
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>Mudar</span>
      </button>

      {/* Cliente */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 space-y-2">
        <p className="text-base font-bold text-zinc-900">{order.client_name}</p>
        {(order.client_address || order.client_city) && (
          <p className="text-sm text-zinc-600 flex items-start gap-1.5"><MapPin className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />{[order.client_address, order.client_city, order.client_cep ? `CEP ${order.client_cep}` : ''].filter(Boolean).join(' · ')}</p>
        )}
        {order.client_phone && (
          <div className="flex items-center gap-2 flex-wrap">
            <a href={`tel:${phoneDigits}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 text-sm text-zinc-700"><Phone className="w-3.5 h-3.5" /> {order.client_phone}</a>
            {phoneDigits.length >= 10 && (
              <a href={`https://wa.me/${phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-sm font-medium text-emerald-700"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</a>
            )}
          </div>
        )}
      </div>

      {/* Informações básicas */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 space-y-3">
        <p className="text-base font-bold text-zinc-900">Informações básicas</p>
        <div className="grid grid-cols-2 gap-3">
          <Info label="Aparelho" value={order.appliance} />
          <Info label="Marca" value={order.brand} />
          <Info label="Modelo" value={order.model} />
          <Info label="Número de série" value={order.serial_number} />
        </div>
        <Info label="Defeito" value={order.defect} />
        <Info label="Observações" value={order.observations} />
        {order.visit_date && (
          <p className="text-sm font-medium flex items-center gap-1.5 pt-1" style={{ color: 'var(--primary)' }}>
            <CalendarClock className="w-4 h-4" /> {ptDate(order.visit_date)}{order.visit_time ? ` às ${order.visit_time.slice(0, 5)}` : ''}{order.visit_notes ? ` · ${order.visit_notes}` : ''}
          </p>
        )}
      </div>

      {/* Pedido */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 space-y-3">
        <p className="text-base font-bold text-zinc-900">Pedido</p>
        {order.services.length === 0 && order.parts.length === 0 && <p className="text-sm text-zinc-400">Nenhum serviço ou peça lançado ainda.</p>}
        {lines('Serviços', order.services)}
        {lines('Peças', order.parts)}
        <div className="border-t border-zinc-100 pt-2 space-y-1 text-sm">
          {(order.services.length > 0 && order.parts.length > 0) && <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span>{fmt(linesTotal(order.services) + linesTotal(order.parts))}</span></div>}
          {order.discount > 0 && <div className="flex justify-between text-zinc-500"><span>Desconto</span><span>− {fmt(order.discount)}</span></div>}
          {order.delivery_fee > 0 && <div className="flex justify-between text-zinc-500"><span>Taxa de entrega</span><span>{fmt(order.delivery_fee)}</span></div>}
          {order.freight > 0 && <div className="flex justify-between text-zinc-500"><span>Frete</span><span>{fmt(order.freight)}</span></div>}
          {order.other_fees > 0 && <div className="flex justify-between text-zinc-500"><span>Outras taxas</span><span>{fmt(order.other_fees)}</span></div>}
          <div className="flex justify-between text-base font-bold text-zinc-900 pt-1"><span>Total</span><span>{fmt(order.total)}</span></div>
        </div>
      </div>

      {/* Financeiro */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
        {order.cash_entry_id ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-emerald-700 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Pagamento recebido · {fmt(order.total)}</p>
            <button type="button" onClick={async () => { if (confirm('Desfazer o recebimento? A entrada sai do Financeiro.')) { await undoOrderPayment(order); toastSuccess('Recebimento desfeito'); load() } }}
              className="text-xs font-semibold text-zinc-500 flex items-center gap-1"><Undo2 className="w-3.5 h-3.5" /> Desfazer</button>
          </div>
        ) : (
          <button type="button" onClick={() => setPayOpen(true)} disabled={order.total <= 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 disabled:opacity-40">
            <Wallet className="w-4 h-4" /> Receber pagamento · {fmt(order.total)}
          </button>
        )}
      </div>

      {/* Detalhes */}
      {(order.payment_conditions || order.payment_methods.length > 0 || order.guarantee || order.notes) && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 space-y-3">
          <p className="text-base font-bold text-zinc-900">Detalhes</p>
          <Info label="Condições de pagamento" value={order.payment_conditions} />
          <Info label="Meios de pagamento" value={order.payment_methods.join(', ')} />
          <Info label="Garantia" value={order.guarantee} />
          <Info label="Anotações (internas)" value={order.notes} />
        </div>
      )}

      {/* Fotos */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 space-y-3">
        <p className="text-base font-bold text-zinc-900">Fotos</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => cameraRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 text-orange-600 rounded-xl text-sm font-medium">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Tirar foto
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 text-zinc-600 rounded-xl text-sm font-medium">
            <Paperclip className="w-4 h-4" /> Anexar da galeria
          </button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { upload(e.target.files); e.target.value = '' }} />
          <input ref={fileRef} type="file" multiple className="hidden" onChange={e => { upload(e.target.files); e.target.value = '' }} />
        </div>
      </div>
      <PhotoGallery files={files} title="Fotos do pedido" />

      {/* Gerar documento fixo embaixo */}
      <div className="fixed left-0 right-0 z-30 px-4 lg:left-64" style={{ bottom: 'calc(var(--bottom-nav-height, 0px) + var(--safe-bottom, 0px) + 12px)' }}>
        <button type="button" onClick={openDocument}
          className="max-w-2xl mx-auto w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-base font-bold text-white shadow-lg" style={{ background: 'var(--primary)' }}>
          <FileText className="w-5 h-5" /> Gerar documento
        </button>
      </div>

      {statusOpen && (
        <Sheet title="Qual é a situação do pedido?" onClose={() => setStatusOpen(false)}>
          <div className="space-y-1.5">
            {ORDER_STATUSES.map(s => (
              <button key={s.value} type="button" disabled={busy} onClick={() => changeStatus(s.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition ${order.status === s.value ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-50'}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />{s.label}
                {order.status === s.value && <CheckCircle2 className="w-4 h-4 ml-auto text-zinc-400" />}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {payOpen && <PayModal order={order} onClose={() => setPayOpen(false)} onSaved={() => { setPayOpen(false); toastSuccess('Pagamento recebido!'); load() }} />}
      {docOpen && <ShopOrderDocument order={order} tenant={tenant} photos={photoData} onClose={() => setDocOpen(false)} />}
    </div>
  )
}

function PayModal({ order, onClose, onSaved }: { order: ShopOrder; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(localYmd())
  const [method, setMethod] = useState(order.payment_methods[0] ?? 'PIX')
  const [busy, setBusy] = useState(false)
  return (
    <Sheet title="Receber pagamento" onClose={onClose}>
      <div className="flex justify-between items-center rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
        <span className="text-sm font-medium text-emerald-800">Valor do pedido</span>
        <span className="text-lg font-bold text-emerald-700">{fmt(order.total)}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium text-zinc-500 mb-1.5">Data</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className={input} /></div>
        <div><label className="block text-xs font-medium text-zinc-500 mb-1.5">Forma</label>
          <select value={method} onChange={e => setMethod(e.target.value)} className={input}>{PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}</select></div>
      </div>
      <p className="text-xs text-zinc-500">Lança a entrada no Financeiro. Se o pedido ainda não estiver concluído, mude a situação depois.</p>
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-600">Cancelar</button>
        <button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await receiveOrderPayment(order, { date, method }); onSaved() } catch (e) { console.error(e); alert('Não foi possível lançar o pagamento.'); setBusy(false) } }}
          className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 disabled:opacity-60 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Confirmar
        </button>
      </div>
    </Sheet>
  )
}
