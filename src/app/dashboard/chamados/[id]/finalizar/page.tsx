'use client'

import { use, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, Loader2, Save, Trash2, X, Paperclip } from 'lucide-react'
import { getCall } from '@/lib/db/calls'
import { createServiceOrder, updateServiceOrder, syncOsAutoExpenses } from '@/lib/db/service-orders'
import { getStockItems, getServiceOrderParts, addServiceOrderParts, adjustStockQuantity, restorePreviousServiceOrderParts } from '@/lib/db/stock'
import { createClient } from '@/lib/supabase/client'
import { useTenant } from '@/lib/tenant-context'
import StockPartPicker from '@/components/StockPartPicker'
import PaymentLinesEditor from '@/components/PaymentLinesEditor'
import { PaymentLine, paymentSummaryFields, paymentsFromOs, hasCard, cardGross, osCardGross } from '@/lib/payments'

interface StockLine { stock_item_id: string; item_name: string; quantity: number; unit_value: number; total_value: number }
interface PendingFile { id: string; file: File; preview?: string }

const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400'

// Técnico (Rodrigues) completa a OS do chamado que ele aprovou. Só mexe
// na OS (valor, peças, pagamento, descrição, fotos) — nunca no chamado
// que o dono cadastrou.
export default function FinalizarServicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { isTecnico, loading: tenantLoading } = useTenant()
  const [call, setCall] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [value, setValue] = useState(0)
  const [stockItems, setStockItems] = useState<any[]>([])
  const [stockLines, setStockLines] = useState<StockLine[]>([])
  const [extraPartsCost, setExtraPartsCost] = useState(0)
  const [uberCost, setUberCost] = useState(0)
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([])
  const [partsPaid, setPartsPaid] = useState(false)
  const [observations, setObservations] = useState('')
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const so = call?.service_orders?.[0] ?? null
  // Retorno (garantia): não cobra o serviço, só a peça, se o cliente pagar
  const isReturn = !!call?.return_of_call_id

  // Só o login de técnico usa esta tela; o dono completa a OS em "Editar"
  useEffect(() => {
    if (!tenantLoading && !isTecnico) router.replace(`/dashboard/chamados/${id}/editar`)
  }, [tenantLoading, isTecnico, id, router])

  useEffect(() => {
    getCall(id).then(async c => {
      setCall(c)
      if (c.technician_id) setStockItems(await getStockItems(c.technician_id))
      const existing = c.service_orders?.[0]
      if (existing) {
        setValue(Number(existing.total_value ?? 0))
        setPaymentLines(paymentsFromOs(existing))
        setPartsPaid(c.return_parts_paid ?? Number(existing.total_value ?? 0) > 0)
        setObservations(existing.observations ?? '')
        setUberCost(Number(existing.uber_cost ?? 0))
        const parts = await getServiceOrderParts(existing.id)
        const lines = parts.map((p: any) => ({
          stock_item_id: p.stock_item_id, item_name: p.item_name, quantity: Number(p.quantity),
          unit_value: Number(p.unit_value), total_value: Number(p.total_value),
        }))
        setStockLines(lines)
        const stockTotal = lines.reduce((s, l) => s + l.total_value, 0)
        setExtraPartsCost(Math.max(0, Number(existing.parts_cost ?? 0) - stockTotal))
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  function addStockLine(item: any, quantity: number) {
    setStockLines(prev => [...prev, {
      stock_item_id: item.id, item_name: item.name, quantity,
      unit_value: Number(item.unit_value), total_value: quantity * Number(item.unit_value),
    }])
  }

  function addFiles(list: FileList | null) {
    if (!list) return
    setPendingFiles(prev => [...prev, ...Array.from(list).map(file => ({
      id: Date.now().toString() + Math.random(),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }))])
  }

  function removeFile(fid: string) {
    setPendingFiles(prev => {
      const f = prev.find(p => p.id === fid)
      if (f?.preview) URL.revokeObjectURL(f.preview)
      return prev.filter(p => p.id !== fid)
    })
  }

  const partsTotal = stockLines.reduce((s, l) => s + l.total_value, 0) + extraPartsCost
  // Valor cobrado: no retorno é só a peça (se o cliente pagou)
  const chargedTotal = isReturn ? (partsPaid ? partsTotal : 0) : value
  const needsPayment = chargedTotal > 0

  async function handleSave() {
    if (!isReturn && value <= 0) { setError('Informe o valor total recebido.'); return }
    if (isReturn && partsPaid && partsTotal <= 0) { setError('Lance a peça usada (ou marque que o cliente não pagou).'); return }
    const lines = needsPayment ? paymentLines.filter(l => l.method) : []
    if (needsPayment && lines.length === 0) { setError('Escolha a forma de pagamento.'); return }
    setSaving(true); setError('')
    try {
      const category = call.service_category || call.appliance_type || 'Serviço'
      // Cartão fica pendente até o Rodrigues confirmar quanto caiu. Se ele já
      // confirmou e o total no cartão não mudou, mantém a confirmação.
      const keepConfirmed = !!so && so.card_net_value != null && cardGross(lines) > 0
        && Math.abs(cardGross(lines) - osCardGross(so)) < 0.01
      const cardPending = hasCard(lines) && !keepConfirmed
      const orderData = {
        call_id: id,
        date: call.scheduled_date ?? call.date,
        client_id: call.client_id ?? null,
        auxiliary_id: call.technician_id ?? null,
        service_type: 'proprio',
        subtotal: chargedTotal,
        total_value: chargedTotal,
        parts_cost: partsTotal,
        uber_cost: uberCost || 0,
        ...paymentSummaryFields(lines),
        card_net_value: keepConfirmed ? so.card_net_value : null,
        observations: observations || null,
        payment_status: cardPending ? 'pendente' : 'pago',
        amount_paid: cardPending ? 0 : chargedTotal,
        remaining_amount: cardPending ? chargedTotal : 0,
      }
      const item = {
        quantity: 1,
        description: `${category} (valor fechado)`,
        unit_price: chargedTotal,
        category,
        sub_options: null,
        notes: null,
      }

      const supabase = createClient()
      let soId: string
      if (so) {
        await updateServiceOrder(so.id, orderData)
        await supabase.from('service_order_items').delete().eq('service_order_id', so.id)
        const { error: itemErr } = await supabase.from('service_order_items').insert({ ...item, service_order_id: so.id })
        if (itemErr) throw itemErr
        soId = so.id
      } else {
        const order = await createServiceOrder(orderData, [item])
        soId = order.id
      }

      // Devolve ao estoque as peças lançadas antes e lança a lista atual
      await restorePreviousServiceOrderParts(soId)
      if (stockLines.length > 0) {
        await addServiceOrderParts(soId, stockLines)
        await Promise.all(stockLines.map(l => adjustStockQuantity(l.stock_item_id, -l.quantity)))
      }

      await Promise.all(pendingFiles.map(({ file }) => {
        const safeName = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
        return supabase.storage.from('chamados-anexos').upload(`${id}/${Date.now()}_${safeName}`, file)
      }))

      await syncOsAutoExpenses(soId)
      router.push(`/dashboard/chamados/${id}`)
    } catch (e: any) {
      console.error(e)
      setError(e?.message ? `Erro ao salvar: ${e.message}` : 'Erro ao salvar. Tente novamente.')
      setSaving(false)
    }
  }

  if (loading || !call) {
    return <div className="max-w-2xl mx-auto h-40 bg-slate-50 rounded-xl animate-pulse" />
  }

  if (call.status !== 'aprovado' && call.status !== 'retorno') {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-2">
        <p className="text-slate-500">Este chamado ainda não foi aprovado.</p>
        <Link href={`/dashboard/chamados/${id}`} className="text-sm font-medium" style={{ color: 'var(--primary)' }}>← Voltar ao chamado</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <Link href={`/dashboard/chamados/${id}`} className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-500 flex-shrink-0 mt-0.5">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{isReturn ? 'Finalizar retorno' : 'Finalizar serviço'}</h1>
          <p className="text-sm text-slate-500">{call.client?.name ?? call.contact_name}{call.service_category ? ` · ${call.service_category}` : ''}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-5">
        {isReturn ? (
          <div className="rounded-lg bg-violet-50 border border-violet-100 px-3 py-2.5 text-sm text-violet-800">
            Retorno de garantia: o serviço não é cobrado. Lance a peça usada e diga se o cliente pagou por ela.
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Valor total recebido (R$) *</label>
            <input type="number" min="0" step="0.01" value={value || ''} onChange={e => setValue(Number(e.target.value))}
              className={inputCls} placeholder="0,00" />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Peças usadas</label>
          {call.technician_id ? (
            <StockPartPicker items={stockItems} onAdd={addStockLine} />
          ) : (
            <p className="text-xs text-slate-400">Chamado sem técnico definido — use o campo abaixo.</p>
          )}
          {stockLines.length > 0 && (
            <div className="mt-2 space-y-1">
              {stockLines.map((l, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-slate-700">{l.quantity}x {l.item_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">R$ {l.total_value.toFixed(2)}</span>
                    <button type="button" onClick={() => setStockLines(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Outro custo de peça não cadastrada (R$)</label>
            <input type="number" min="0" step="0.01" value={extraPartsCost || ''} onChange={e => setExtraPartsCost(Number(e.target.value))}
              className={inputCls} placeholder="0,00" />
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Custo de Uber pra trazer peça (R$)</label>
            <input type="number" min="0" step="0.01" value={uberCost || ''} onChange={e => setUberCost(Number(e.target.value))}
              className={inputCls} placeholder="0,00 — deixe em branco se não teve" />
            <p className="text-xs text-slate-400 mt-1">É descontado do valor antes de calcular a comissão, igual à peça.</p>
          </div>
        </div>

        {isReturn && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">O cliente pagou a peça?</label>
            <div className="flex gap-2">
              {[{ v: true, t: 'Sim' }, { v: false, t: 'Não' }].map(o => (
                <button key={o.t} type="button" onClick={() => setPartsPaid(o.v)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${partsPaid === o.v ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {o.t}
                </button>
              ))}
            </div>
            {partsPaid && <p className="text-xs text-slate-500 mt-1.5">Valor cobrado do cliente: R$ {partsTotal.toFixed(2)}</p>}
          </div>
        )}

        {needsPayment && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Forma de pagamento *</label>
            <PaymentLinesEditor lines={paymentLines} onChange={setPaymentLines} total={chargedTotal} />
            {hasCard(paymentLines) && (
              <p className="mt-2 text-xs rounded-lg bg-amber-50 border border-amber-100 text-amber-800 px-3 py-2">
                Pagamento em cartão: o Rodrigues vai confirmar o valor; sua comissão aparece depois disso.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Descrição do serviço</label>
          <textarea rows={3} value={observations} onChange={e => setObservations(e.target.value)}
            placeholder="O que foi feito..." className={`${inputCls} resize-none`} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Fotos e arquivos do serviço</label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => cameraRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 text-orange-600 rounded-xl text-sm font-medium hover:bg-orange-100 transition">
              <Camera className="w-4 h-4" /> Tirar foto
            </button>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 transition">
              <Paperclip className="w-4 h-4" /> Anexar arquivo / galeria
            </button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
            onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
          <input ref={fileRef} type="file" multiple className="hidden"
            onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
          {pendingFiles.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {pendingFiles.map(f => (
                <div key={f.id} className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  {f.preview
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={f.preview} alt={f.file.name} className="w-full h-20 object-cover" />
                    : <p className="h-20 flex items-center justify-center text-xs text-slate-400 px-1 truncate">{f.file.name}</p>}
                  <button type="button" onClick={() => removeFile(f.id)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-bold text-white disabled:opacity-60 transition"
        style={{ background: 'var(--primary)' }}>
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
        {so ? 'Salvar correção' : isReturn ? 'Concluir retorno' : 'Concluir serviço'}
      </button>
    </div>
  )
}
